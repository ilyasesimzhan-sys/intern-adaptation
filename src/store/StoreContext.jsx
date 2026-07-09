import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
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

function mergeWithDefaults(remote) {
  const defaults = makeDefaultData()
  return {
    settings: { ...defaults.settings, ...remote.settings },
    trainers: remote.trainers?.length ? remote.trainers : defaults.trainers,
    groups: remote.groups || [],
    interns: remote.interns || [],
  }
}

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [data, setData] = useState(hasFirebaseConfig ? makeDefaultData : loadLocalData)
  const [ready, setReady] = useState(!hasFirebaseConfig)
  const [trainerId, setTrainerId] = useState(() => localStorage.getItem(AUTH_KEY) || null)
  const writeTimer = useRef(null)

  // Общий режим: подписка на единый документ в Firestore, синхронный между всеми участниками.
  useEffect(() => {
    if (!hasFirebaseConfig) return
    const db = getDb()
    const ref = doc(db, 'app', 'state')
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setData(mergeWithDefaults(snap.data()))
        } else {
          const initial = makeDefaultData()
          setDoc(ref, initial).catch((err) => console.error('Firestore init failed', err))
          setData(initial)
        }
        setReady(true)
      },
      (err) => {
        console.error('Firestore sync error', err)
        setReady(true)
      },
    )
    return unsubscribe
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
          setDoc(doc(db, 'app', 'state'), next).catch((err) => console.error('Firestore write failed', err))
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
      <div className="min-h-screen flex items-center justify-center text-navy-400">
        Загрузка...
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
