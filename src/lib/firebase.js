import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Без ключей приложение работает в демо-режиме на localStorage одного браузера.
export const hasFirebaseConfig = Boolean(config.apiKey && config.projectId)

let app = null
let db = null
let storage = null

function getApp() {
  if (!app) app = initializeApp(config)
  return app
}

export function getDb() {
  if (!hasFirebaseConfig) return null
  if (!db) db = getFirestore(getApp())
  return db
}

export function getStorageInstance() {
  if (!hasFirebaseConfig) return null
  if (!storage) storage = getStorage(getApp())
  return storage
}
