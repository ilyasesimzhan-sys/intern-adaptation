import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nContext.jsx'

const normalize = (s) => s.toLowerCase().replace(/ё/g, 'е')
const asIs = (o) => o

// Выпадающий список с поиском: можно пролистать весь список или начать печатать — варианты отфильтруются.
// Выбрать можно только значение из списка (кликом, Enter или точным совпадением при уходе из поля).
// optionLabel — как показывать вариант (например, перевод «Другой»); в значении остаётся исходная строка.
export default function SearchSelect({ value, onChange, options, placeholder, optionLabel = asIs }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const listRef = useRef(null)

  // Сначала варианты, которые начинаются с введённого текста, затем — содержащие его.
  const q = normalize(query.trim())
  const text = (o) => normalize(optionLabel(o))
  const filtered = q
    ? [
        ...options.filter((o) => text(o).startsWith(q)),
        ...options.filter((o) => !text(o).startsWith(q) && text(o).includes(q)),
      ]
    : options

  useEffect(() => {
    if (!open || !listRef.current) return
    listRef.current.children[highlight]?.scrollIntoView({ block: 'nearest' })
  }, [highlight, open])

  function openList() {
    setOpen(true)
    setQuery('')
    setHighlight(Math.max(0, options.indexOf(value)))
  }

  function choose(option) {
    onChange(option)
    setOpen(false)
    setQuery('')
  }

  function handleBlur() {
    const exact = query && options.find((o) => text(o) === normalize(query.trim()))
    if (exact) onChange(exact)
    setOpen(false)
    setQuery('')
  }

  function handleKeyDown(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault()
      openList()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[highlight]) choose(filtered[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div className="relative">
      <input
        className="field-input pr-9"
        value={open ? query : value ? optionLabel(value) : ''}
        placeholder={open && value ? optionLabel(value) : placeholder}
        onFocus={openList}
        onClick={() => !open && openList()}
        onBlur={handleBlur}
        onChange={(e) => {
          setQuery(e.target.value)
          setHighlight(0)
          setOpen(true)
        }}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={open}
        autoComplete="off"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 text-xs" aria-hidden="true">
        {open ? '🔍' : '▾'}
      </span>
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-navy-200 bg-white shadow-lg dark:bg-navy-800 dark:border-navy-600"
        >
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-navy-400 dark:text-navy-500">{t('Ничего не найдено')}</li>
          )}
          {filtered.map((o, i) => (
            <li
              key={o}
              role="option"
              aria-selected={o === value}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(o)
              }}
              onMouseEnter={() => setHighlight(i)}
              className={
                'px-3 py-2 text-sm cursor-pointer ' +
                (i === highlight
                  ? 'bg-navy-100 dark:bg-navy-700'
                  : o === value
                    ? 'font-semibold'
                    : '') +
                ' text-navy-800 dark:text-navy-100'
              }
            >
              {optionLabel(o)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
