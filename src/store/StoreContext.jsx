import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { doc, collection, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore'
import { makeDefaultData } from './defaultData'
import { getDb, hasFirebaseConfig } from '../lib/firebase'

const STORAGE_KEY = 'intern-adaptation:data'
const AUTH_KEY = 'intern-adaptation:trainerId'
const WRITE_DEBOUNCE_MS = 400

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
  // Последнее известное состояние сервера — база для сравнения при записи (какие документы реально менялись).
  const remoteRef = useRef(null)

  // Общий режим: стажёры и группы — отдельные документы в своих коллекциях (без ограничения в 1 МБ на всех
  // разом), настройки и тренеры — один маленький общий документ. Если какого-то документа/коллекции ещё нет,
  // просто показываем дефолты локально и НЕ пишем их в базу — так пустой снимок никогда не затирает реальные
  // данные (именно это стало причиной потери данных при старой схеме с одним документом на всё).
  useEffect(() => {
    if (!hasFirebaseConfig) return
    const db = getDb()
    const defaults = makeDefaultData()
    const current = { settings: null, groups: null, interns: null }

    function publish() {
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
    }

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
        publish()
      },
      (err) => {
        console.error('Firestore groups sync error', err)
        current.groups = current.groups || []
        publish()
      },
    )

    const unsubInterns = onSnapshot(
      collection(db, 'interns'),
      (snap) => {
        current.interns = snap.docs.map((d) => d.data())
        publish()
      },
      (err) => {
        console.error('Firestore interns sync error', err)
        current.interns = current.interns || []
        publish()
      },
    )

    return () => {
      unsubSettings()
      unsubGroups()
      unsubInterns()
    }
  }, [])

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

  const update = useCallback((updater) => {
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

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 dark:bg-navy-950">
        <div className="w-10 h-10 rounded-full border-4 border-navy-200 dark:border-navy-700 border-t-sky-500 animate-spin-slow" />
        <div className="text-sm text-navy-400 dark:text-navy-500">Загрузка...</div>
      </div>
    )
  }

  return (
    <StoreContext.Provider value={{ data, update, login, logout, currentTrainer }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
