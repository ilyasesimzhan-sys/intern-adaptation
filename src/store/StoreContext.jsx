import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { doc, collection, onSnapshot, setDoc, deleteDoc, query, where } from 'firebase/firestore'
import { makeDefaultData } from './defaultData'
import { getDb, hasFirebaseConfig } from '../lib/firebase'

const STORAGE_KEY = 'intern-adaptation:data'
const AUTH_KEY = 'intern-adaptation:trainerId'
const WRITE_DEBOUNCE_MS = 400
// Подряд идущие правки одного и того же человека над теми же записями (набор текста в поле и т.п.)
// склеиваются в одну запись журнала, если между ними прошло меньше этого времени.
const LOG_MERGE_MS = 2 * 60 * 1000
// Сколько групп в одном запросе стажёров (ограничение Firestore на оператор «in»).
const GROUPS_PER_QUERY = 10

// Журнал действий хранится документами app/log_<id>: правила Firestore разрешают запись только в
// app/, groups/ и interns/, а отдельная коллекция потребовала бы правки правил в консоли.
export const LOG_PREFIX = 'log_'

// Изменения документов между двумя состояниями — для журнала: что было до и что стало после.
function collectChanges(prev, next) {
  const changes = []
  if (
    JSON.stringify(prev.settings) !== JSON.stringify(next.settings) ||
    JSON.stringify(prev.trainers) !== JSON.stringify(next.trainers)
  ) {
    changes.push({
      coll: 'settings',
      id: 'settings',
      before: { settings: prev.settings, trainers: prev.trainers },
      after: { settings: next.settings, trainers: next.trainers },
    })
  }
  for (const coll of ['groups', 'interns']) {
    const prevMap = new Map((prev[coll] || []).map((item) => [item.id, item]))
    const nextMap = new Map((next[coll] || []).map((item) => [item.id, item]))
    for (const [id, item] of nextMap) {
      const before = prevMap.get(id) || null
      if (JSON.stringify(before) !== JSON.stringify(item)) changes.push({ coll, id, before, after: item })
    }
    for (const [id, item] of prevMap) {
      if (!nextMap.has(id)) changes.push({ coll, id, before: item, after: null })
    }
  }
  return changes
}

// Firestore не хранит undefined — JSON-копия убирает такие поля.
function plain(value) {
  return JSON.parse(JSON.stringify(value))
}

function loadLocalData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return makeDefaultData()
    const parsed = JSON.parse(raw)
    const defaults = makeDefaultData()
    return {
      settings: { ...defaults.settings, ...parsed.settings },
      trainers: parsed.trainers?.length ? parsed.trainers : defaults.trainers,
      groups: parsed.groups || [],
      interns: parsed.interns || [],
    }
  } catch {
    return makeDefaultData()
  }
}

// Точечная синхронизация коллекции: пишет/удаляет только реально изменившиеся документы,
// а не весь массив разом — так один документ в Firestore никогда не может перезаписать чужие записи.
function diffCollection(db, name, prevList, nextList) {
  const prevMap = new Map((prevList || []).map((item) => [item.id, item]))
  const nextMap = new Map((nextList || []).map((item) => [item.id, item]))
  const ops = []
  for (const [id, item] of nextMap) {
    if (JSON.stringify(prevMap.get(id)) !== JSON.stringify(item)) {
      ops.push(setDoc(doc(db, name, id), item))
    }
  }
  for (const id of prevMap.keys()) {
    if (!nextMap.has(id)) ops.push(deleteDoc(doc(db, name, id)))
  }
  return ops
}

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [data, setData] = useState(hasFirebaseConfig ? makeDefaultData : loadLocalData)
  const [ready, setReady] = useState(!hasFirebaseConfig)
  const [trainerId, setTrainerId] = useState(() => localStorage.getItem(AUTH_KEY) || null)
  const writeTimer = useRef(null)
  const trainerRef = useRef(null)
  // Подпись действия для журнала (например, «Деление группы»), переданная в update до ближайшей записи.
  const pendingMetaRef = useRef(null)
  const lastLogRef = useRef(null)
  // Последнее известное состояние сервера — база для сравнения при записи (какие документы реально менялись).
  const remoteRef = useRef(null)
  // Последние снимки из базы по частям; publish собирает из них общее состояние.
  const currentRef = useRef({ settings: null, groups: null, interns: null })
  // Стажёры загружаются только из текущих (не архивных) групп — каждое открытие сайта стоит столько чтений
  // Firestore, сколько стажёров загружено, а архив растёт постоянно. Весь архив подгружается по запросу
  // (requestArchive) — во вкладках «Архив», «Отчёты», «Резервные копии», «Журнал» и на старых ссылках прогресса.
  // activeKey — id текущих групп через запятую (null, пока группы не загружены).
  const [activeKey, setActiveKey] = useState(null)
  const [archiveWanted, setArchiveWanted] = useState(false)
  const [archiveLoaded, setArchiveLoaded] = useState(!hasFirebaseConfig)

  const publish = useCallback(() => {
    const current = currentRef.current
    if (!current.settings || !current.groups || !current.interns) return
    const merged = {
      settings: current.settings.settings,
      trainers: current.settings.trainers,
      groups: current.groups,
      interns: current.interns,
    }
    remoteRef.current = merged
    setData(merged)
    setReady(true)
  }, [])

  // Общий режим: стажёры и группы — отдельные документы в своих коллекциях (без ограничения в 1 МБ на всех
  // разом), настройки и тренеры — один маленький общий документ. Если какого-то документа/коллекции ещё нет,
  // просто показываем дефолты локально и НЕ пишем их в базу — так пустой снимок никогда не затирает реальные
  // данные (именно это стало причиной потери данных при старой схеме с одним документом на всё).
  useEffect(() => {
    if (!hasFirebaseConfig) return
    const db = getDb()
    const defaults = makeDefaultData()
    const current = currentRef.current

    const unsubSettings = onSnapshot(
      doc(db, 'app', 'settings'),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data()
          current.settings = {
            settings: { ...defaults.settings, ...d.settings },
            trainers: d.trainers?.length ? d.trainers : defaults.trainers,
          }
        } else {
          current.settings = { settings: defaults.settings, trainers: defaults.trainers }
        }
        publish()
      },
      (err) => {
        console.error('Firestore settings sync error', err)
        current.settings = current.settings || { settings: defaults.settings, trainers: defaults.trainers }
        publish()
      },
    )

    const unsubGroups = onSnapshot(
      collection(db, 'groups'),
      (snap) => {
        current.groups = snap.docs.map((d) => d.data())
        const activeIds = current.groups.filter((g) => !g.archived).map((g) => g.id)
        setActiveKey(activeIds.sort().join(','))
        publish()
      },
      (err) => {
        console.error('Firestore groups sync error', err)
        current.groups = current.groups || []
        setActiveKey((key) => key ?? '')
        publish()
      },
    )

    return () => {
      unsubSettings()
      unsubGroups()
    }
  }, [publish])

  // Стажёры: либо все (когда нужен архив), либо только текущих групп — пачками по GROUPS_PER_QUERY групп.
  // Пока новая подписка не пришла, на экране остаются прежние данные.
  useEffect(() => {
    if (!hasFirebaseConfig || activeKey === null) return
    const db = getDb()
    const current = currentRef.current
    const onError = (err) => {
      console.error('Firestore interns sync error', err)
      current.interns = current.interns || []
      publish()
    }

    if (archiveWanted) {
      return onSnapshot(
        collection(db, 'interns'),
        (snap) => {
          current.interns = snap.docs.map((d) => d.data())
          setArchiveLoaded(true)
          publish()
        },
        onError,
      )
    }

    const ids = activeKey ? activeKey.split(',') : []
    if (ids.length === 0) {
      current.interns = []
      publish()
      return
    }
    const chunks = []
    for (let i = 0; i < ids.length; i += GROUPS_PER_QUERY) chunks.push(ids.slice(i, i + GROUPS_PER_QUERY))
    const parts = chunks.map(() => null)
    const unsubs = chunks.map((chunk, n) =>
      onSnapshot(
        query(collection(db, 'interns'), where('groupId', 'in', chunk)),
        (snap) => {
          parts[n] = snap.docs.map((d) => d.data())
          if (parts.every(Boolean)) {
            current.interns = parts.flat()
            publish()
          }
        },
        onError,
      ),
    )
    return () => unsubs.forEach((u) => u())
  }, [activeKey, archiveWanted, publish])

  const requestArchive = useCallback(() => setArchiveWanted(true), [])

  // Демо-режим: хранение в localStorage одного браузера.
  useEffect(() => {
    if (hasFirebaseConfig) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  useEffect(() => {
    if (hasFirebaseConfig) return
    function onStorage(e) {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setData(JSON.parse(e.newValue))
        } catch {
          /* ignore */
        }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  function writeLog(db, baseline, next) {
    const meta = pendingMetaRef.current || {}
    pendingMetaRef.current = null
    const changes = collectChanges(baseline, next)
    if (changes.length === 0) return
    const trainer = trainerRef.current
    const keys = changes.map((c) => `${c.coll}/${c.id}`).sort().join('|')
    const now = new Date()
    const last = lastLogRef.current
    const canMerge =
      last &&
      !meta.label &&
      !last.label &&
      last.trainerId === (trainer?.id || null) &&
      last.keys === keys &&
      now - last.time < LOG_MERGE_MS

    let entry
    if (canMerge) {
      // Склейка: «до» остаётся от первой правки серии, «после» — от последней.
      entry = {
        ...last.entry,
        at: now.toISOString(),
        changes: last.entry.changes.map((c) => ({ ...c, after: changes.find((n) => n.coll === c.coll && n.id === c.id).after })),
      }
    } else {
      entry = {
        id: LOG_PREFIX + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        at: now.toISOString(),
        trainerId: trainer?.id || null,
        trainerName: trainer?.name || '',
        trainerLogin: trainer?.login || '',
        label: meta.label || '',
        undoOf: meta.undoOf || null,
        changes,
      }
    }
    entry = plain(entry)
    lastLogRef.current = { entry, keys, trainerId: entry.trainerId, label: entry.label, time: now }
    setDoc(doc(db, 'app', entry.id), entry).catch((err) => console.error('Firestore log write failed', err))
  }

  // meta.label — человеческое название действия для журнала; meta.undoOf — id отменяемой записи журнала.
  const update = useCallback((updater, meta) => {
    if (meta) pendingMetaRef.current = meta
    setData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (hasFirebaseConfig) {
        clearTimeout(writeTimer.current)
        writeTimer.current = setTimeout(() => {
          const db = getDb()
          const baseline = remoteRef.current || { settings: null, trainers: null, groups: [], interns: [] }
          const ops = []

          if (
            JSON.stringify(baseline.settings) !== JSON.stringify(next.settings) ||
            JSON.stringify(baseline.trainers) !== JSON.stringify(next.trainers)
          ) {
            ops.push(setDoc(doc(db, 'app', 'settings'), { settings: next.settings, trainers: next.trainers }))
          }
          ops.push(...diffCollection(db, 'groups', baseline.groups, next.groups))
          ops.push(...diffCollection(db, 'interns', baseline.interns, next.interns))
          if (ops.length > 0) writeLog(db, baseline, next)

          // Считаем это состояние актуальным сразу, не дожидаясь эха от onSnapshot — иначе повторная
          // правка в течение того же цикла синхронизации переписала бы уже отправленные документы заново.
          remoteRef.current = next
          Promise.all(ops).catch((err) => console.error('Firestore write failed', err))
        }, WRITE_DEBOUNCE_MS)
      }
      return next
    })
  }, [])

  const login = useCallback(
    (loginValue, password) => {
      const trainer = data.trainers.find((t) => t.login === loginValue && t.password === password && loginValue)
      if (trainer) {
        localStorage.setItem(AUTH_KEY, trainer.id)
        setTrainerId(trainer.id)
        return true
      }
      return false
    },
    [data.trainers],
  )

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY)
    setTrainerId(null)
  }, [])

  const currentTrainer = data.trainers.find((t) => t.id === trainerId) || null
  trainerRef.current = currentTrainer

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 dark:bg-navy-950">
        <div className="w-10 h-10 rounded-full border-4 border-navy-200 dark:border-navy-700 border-t-sky-500 animate-spin-slow" />
        <div className="text-sm text-navy-400 dark:text-navy-500">Загрузка...</div>
      </div>
    )
  }

  return (
    <StoreContext.Provider value={{ data, update, login, logout, currentTrainer, archiveLoaded, requestArchive }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
