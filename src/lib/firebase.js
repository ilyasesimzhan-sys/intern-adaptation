import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

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

let db = null

export function getDb() {
  if (!hasFirebaseConfig) return null
  if (!db) {
    const app = initializeApp(config)
    db = getFirestore(app)
  }
  return db
}
