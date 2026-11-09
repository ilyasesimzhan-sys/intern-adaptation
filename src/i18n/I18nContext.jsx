import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import kk from './kk.js'
import { fill } from './msg.js'
import { makeDateFormatters } from './dates.js'

// Лёгкий самописный i18n. Исходный язык интерфейса — русский: русская строка сама служит ключом
// (словарь ru — «тождественный»), а kk.js переводит её на казахский. Подстановки — {name}.
// Проверка, что у каждой строки есть перевод: `node scripts/check-i18n.mjs`.

export const LANGS = [
  { code: 'ru', label: 'RU', name: 'Русский', locale: 'ru-RU' },
  { code: 'kk', label: 'KZ', name: 'Қазақша', locale: 'kk-KZ' },
]

const DICTIONARIES = { ru: null, kk }
const STORAGE_KEY = 'ap-lang'

export { msg, ru } from './msg.js'

function readSavedLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return LANGS.some((l) => l.code === saved) ? saved : 'ru'
  } catch {
    return 'ru'
  }
}

export function translate(lang, text, params) {
  if (text == null || text === '') return text
  const dict = DICTIONARIES[lang]
  let result = text
  if (dict) {
    if (Object.prototype.hasOwnProperty.call(dict, text)) result = dict[text]
    else if (import.meta.env.DEV) console.warn('[i18n] нет перевода:', text)
  }
  return fill(result, params)
}

function russianPlural(n, one, few, many) {
  const m10 = Math.abs(n) % 10
  const m100 = Math.abs(n) % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(readSavedLang)

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // Хранилище недоступно (приватный режим) — язык просто не запомнится.
    }
  }, [lang])

  const setLang = useCallback((code) => {
    if (LANGS.some((l) => l.code === code)) setLangState(code)
  }, [])

  const value = useMemo(() => {
    const locale = LANGS.find((l) => l.code === lang).locale
    const t = (text, params) => translate(lang, text, params)
    // Существительное после числа: в русском — три формы, в казахском — одна (форма «one» из словаря).
    const tp = (n, one, few, many) => (lang === 'ru' ? russianPlural(n, one, few, many) : translate(lang, one))
    return { lang, setLang, locale, t, tp, ...makeDateFormatters(lang) }
  }, [lang, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
