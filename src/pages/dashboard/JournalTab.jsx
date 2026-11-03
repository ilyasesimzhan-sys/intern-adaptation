import { useEffect, useMemo, useState } from 'react'
import { collection, doc, limit, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore'
import { useStore, LOG_PREFIX } from '../../store/StoreContext.jsx'
import { getDb, hasFirebaseConfig } from '../../lib/firebase'
import { isTrainerAdmin } from '../../lib/roles'
import { formatDate } from '../../lib/date'
import {
  applyCorrections,
  changedSince,
  correctableFields,
  describeChange,
  describeEntry,
  entityName,
  revertEntry,
} from '../../lib/journal'

const PAGE = 100

function formatDateTime(iso) {
  const d = new Date(iso)
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function JournalTab() {
  const { data, update, currentTrainer } = useStore()
  const admin = isTrainerAdmin(currentTrainer)
  const [entries, setEntries] = useState(null)
  const [error, setError] = useState('')
  const [shown, setShown] = useState(PAGE)
  const [trainerFilter, setTrainerFilter] = useState('')
  const [openId, setOpenId] = useState(null)
  // Подтверждение отмены: { id, conflicts: [...] }
  const [confirming, setConfirming] = useState(null)
  // Корректировка: { id, fields: [...], values: { [key]: value } }
  const [correcting, setCorrecting] = useState(null)
  const [savedId, setSavedId] = useState(null)

  useEffect(() => {
    if (!hasFirebaseConfig || !admin) return
    const q = query(collection(getDb(), 'app'), orderBy('at', 'desc'), limit(1000))
    return onSnapshot(
      q,
      (snap) => setEntries(snap.docs.map((d) => d.data()).filter((e) => e.id?.startsWith(LOG_PREFIX))),
      (err) => {
        console.error('Journal load failed', err)
        setError('Не удалось загрузить журнал.')
      },
    )
  }, [admin])

  const filtered = useMemo(
    () => (entries || []).filter((e) => !trainerFilter || (e.trainerId || 'guest') === trainerFilter),
    [entries, trainerFilter],
  )

  if (!admin) {
    return <p className="text-navy-400 dark:text-navy-500">Журнал действий доступен только администратору.</p>
  }

  function askUndo(entry) {
    setConfirming({ id: entry.id, conflicts: changedSince(entry, data) })
  }

  function undo(entry) {
    setConfirming(null)
    update((prev) => revertEntry(prev, entry), {
      label: `Отмена действия: ${describeEntry(entry, data.groups)}`,
      undoOf: entry.id,
    })
    setDoc(
      doc(getDb(), 'app', entry.id),
      { undoneAt: new Date().toISOString(), undoneBy: currentTrainer.name },
      { merge: true },
    ).catch((err) => console.error('Journal undo mark failed', err))
  }

  function startCorrection(entry) {
    const fields = correctableFields(entry, data)
    setConfirming(null)
    setSavedId(null)
    setCorrecting({ id: entry.id, fields, values: Object.fromEntries(fields.map((f) => [f.key, f.currentValue])) })
  }

  function saveCorrection() {
    const edits = correcting.fields
      .map((f) => {
        const raw = correcting.values[f.key] ?? ''
        const value = f.type === 'text' ? raw.trim() : raw
        return value === f.currentValue ? null : { ...f, value }
      })
      .filter(Boolean)
    if (edits.length > 0) {
      const byEntity = {}
      edits.forEach((e) => (byEntity[e.entity] = [...(byEntity[e.entity] || []), e.label]))
      const what = Object.entries(byEntity)
        .map(([entity, labels]) => `${entity} — ${labels.join(', ')}`)
        .join('; ')
      update((prev) => applyCorrections(prev, edits), { label: `Корректировка: ${what}` })
    }
    setSavedId(correcting.id)
    setCorrecting(null)
  }

  function showValue(f, value) {
    if (value === null) return null
    if (!value) return '—'
    return f.type === 'date' ? formatDate(value) : value
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Журнал действий</h1>
      <p className="text-sm text-navy-500 dark:text-navy-400">
        Все изменения, сделанные любыми логинами: кто, что и когда. Кнопка «Отменить» возвращает затронутые записи в
        состояние до этого действия — например, снова объединяет поделённую группу или возвращает удалённого стажёра.
        Кнопка «Исправить» позволяет поправить то, что внёс тренер (ФИО, названия, даты, комментарии), не отменяя
        действие целиком. Подряд идущие правки одного поля (набор текста) собраны в одну запись.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <select className="field-input max-w-xs" value={trainerFilter} onChange={(e) => setTrainerFilter(e.target.value)}>
          <option value="">Все логины</option>
          {data.trainers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.login})
            </option>
          ))}
          <option value="guest">Без входа (анкеты)</option>
        </select>
        {entries && <span className="text-sm text-navy-400 dark:text-navy-500">Записей: {filtered.length}</span>}
      </div>

      {error && <p className="text-sm text-danger-500">{error}</p>}
      {!entries && !error && <p className="text-navy-400 dark:text-navy-500">Загрузка журнала...</p>}
      {entries && filtered.length === 0 && (
        <p className="text-navy-400 dark:text-navy-500">Записей пока нет — журнал ведётся с момента его появления.</p>
      )}

      {filtered.length > 0 && (
        <div className="card divide-y divide-navy-50 dark:divide-navy-800 !p-0 overflow-hidden">
          {filtered.slice(0, shown).map((e) => {
            const who = e.trainerId ? `${e.trainerName || '—'}${e.trainerLogin ? ` (${e.trainerLogin})` : ''}` : 'Без входа'
            const isOpen = openId === e.id
            const canCorrect = correcting?.id !== e.id && correctableFields(e, data).length > 0
            return (
              <div key={e.id} className="p-3 sm:p-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-navy-400 dark:text-navy-500">
                      {formatDateTime(e.at)} · <span className="font-semibold text-navy-600 dark:text-navy-300">{who}</span>
                    </div>
                    <div className="font-medium break-words">{describeEntry(e, data.groups)}</div>
                    {e.undoneAt && (
                      <div className="text-xs text-warning-600 dark:text-warning-500 mt-0.5">
                        Отменено {formatDateTime(e.undoneAt)}
                        {e.undoneBy ? ` · ${e.undoneBy}` : ''}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setOpenId(isOpen ? null : e.id)} className="btn-secondary text-xs px-3 py-1.5">
                      {isOpen ? 'Скрыть' : 'Подробнее'}
                    </button>
                    {canCorrect && (
                      <button onClick={() => startCorrection(e)} className="btn-secondary text-xs px-3 py-1.5">
                        ✏️ Исправить
                      </button>
                    )}
                    {!e.undoneAt && confirming?.id !== e.id && (
                      <button onClick={() => askUndo(e)} className="btn-secondary text-xs px-3 py-1.5">
                        ↩ Отменить
                      </button>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <ul className="text-sm list-disc pl-5 text-navy-600 dark:text-navy-300 space-y-0.5">
                    {e.changes.map((c) => (
                      <li key={`${c.coll}/${c.id}`}>{describeChange(c, data.groups)}</li>
                    ))}
                  </ul>
                )}

                {savedId === e.id && (
                  <p className="text-sm text-success-600 dark:text-success-400">Исправления сохранены и записаны в журнал.</p>
                )}

                {correcting?.id === e.id && (
                  <div className="rounded-lg border border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 p-3 space-y-3 text-sm">
                    <p className="font-semibold">Исправьте нужные поля. Сейчас в полях — текущие значения на сайте.</p>
                    {correcting.fields.map((f) => {
                      const set = (value) =>
                        setCorrecting((c) => ({ ...c, values: { ...c.values, [f.key]: value } }))
                      const value = correcting.values[f.key] ?? ''
                      return (
                        <label key={f.key} className="block space-y-1">
                          <span className="font-medium">
                            {f.entity[0].toUpperCase() + f.entity.slice(1)}: {f.label}
                          </span>
                          {f.type === 'textarea' ? (
                            <textarea className="field-input" rows={2} value={value} onChange={(ev) => set(ev.target.value)} />
                          ) : (
                            <input
                              type={f.type}
                              className="field-input"
                              value={value}
                              onChange={(ev) => set(ev.target.value)}
                            />
                          )}
                          <span className="block text-xs text-navy-400 dark:text-navy-500">
                            {f.beforeValue !== null && <>Было до действия: {showValue(f, f.beforeValue)} · </>}
                            Внесено в этом действии: {showValue(f, f.trainerValue)}
                          </span>
                        </label>
                      )
                    })}
                    <div className="flex gap-2">
                      <button onClick={saveCorrection} className="btn-primary text-sm">
                        Сохранить
                      </button>
                      <button onClick={() => setCorrecting(null)} className="btn-secondary text-sm">
                        Отмена
                      </button>
                    </div>
                  </div>
                )}

                {confirming?.id === e.id && (
                  <div className="rounded-lg border border-warning-500/30 bg-warning-50 dark:bg-warning-500/10 p-3 space-y-2 text-sm">
                    <p className="font-semibold">Отменить это действие? Затронутые записи вернутся в состояние до него.</p>
                    {confirming.conflicts.length > 0 && (
                      <div className="text-warning-600 dark:text-warning-500">
                        После этого действия эти записи уже меняли ещё раз — более поздние правки по ним тоже
                        пропадут:
                        <ul className="list-disc pl-5 mt-1">
                          {confirming.conflicts.map((c) => (
                            <li key={`${c.coll}/${c.id}`}>{entityName(c)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => undo(e)} className="btn-primary text-sm">
                        Да, отменить
                      </button>
                      <button onClick={() => setConfirming(null)} className="btn-secondary text-sm">
                        Нет
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {filtered.length > shown && (
        <button onClick={() => setShown((n) => n + PAGE)} className="btn-secondary">
          Показать ещё
        </button>
      )}
    </div>
  )
}
