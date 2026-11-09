import { useEffect, useState } from 'react'
import { useStore } from '../../store/StoreContext.jsx'
import { hasFirebaseConfig } from '../../lib/firebase'
import { isTrainerAdmin } from '../../lib/roles'
import { BACKUP_KIND_LABELS, listBackups, loadBackup, saveBackup } from '../../lib/backup'
import { backupPayload, downloadBackupWorkbook, readBackupWorkbook } from '../../lib/backupFile'
import { msg, ru, useI18n } from '../../i18n/I18nContext.jsx'
import { makeDateFormatters } from '../../i18n/dates.js'

// Формат «дд.мм.гггг, чч:мм» одинаков в обоих языках; он же попадает в подпись журнала.
const { formatDateTime } = makeDateFormatters('ru')


export default function BackupsTab() {
  const { t } = useI18n()
  const { data, update, currentTrainer, archiveLoaded, requestArchive } = useStore()
  const admin = isTrainerAdmin(currentTrainer)
  const [backups, setBackups] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)
  // Подтверждение восстановления: { source: { text, params }, createdAt, data, key }.
  // source переводится в интерфейсе, а в подпись журнала идёт на русском.
  // message — { text, params } для перевода при отрисовке.
  const [restoring, setRestoring] = useState(null)

  async function refresh() {
    if (!hasFirebaseConfig) return setBackups([])
    try {
      setBackups(await listBackups())
    } catch (err) {
      console.error('Backups load failed', err)
      setError(msg('Не удалось загрузить список копий.'))
    }
  }

  useEffect(() => {
    if (admin) refresh()
  }, [admin])

  // Копия и восстановление работают только со всеми данными, включая стажёров архивных групп.
  useEffect(() => {
    if (admin) requestArchive()
  }, [admin, requestArchive])

  if (!admin) {
    return <p className="text-navy-400 dark:text-navy-500">{t('Раздел доступен только администратору.')}</p>
  }

  if (!archiveLoaded) {
    return <p className="text-navy-400 dark:text-navy-500">{t('Загрузка всех данных...')}</p>
  }

  async function run(action) {
    setBusy(true)
    setError('')
    setMessage(null)
    try {
      await action()
    } catch (err) {
      console.error(err)
      setError(err.message || msg('Что-то пошло не так.'))
    } finally {
      setBusy(false)
    }
  }

  function saveNow() {
    run(async () => {
      await saveBackup(data, 'manual', currentTrainer)
      await refresh()
      setMessage({ text: msg('Копия сохранена.') })
    })
  }

  function downloadStored(meta) {
    run(async () => downloadBackupWorkbook({ createdAt: meta.createdAt, ...(await loadBackup(meta)) }))
  }

  function askRestoreStored(meta) {
    run(async () => {
      const copy = await loadBackup(meta)
      setRestoring({
        key: meta.id,
        source: { text: msg('копии от {date}'), params: { date: formatDateTime(copy.createdAt) } },
        ...copy,
      })
    })
  }

  function askRestoreFile(ev) {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file) return
    run(async () => {
      const copy = readBackupWorkbook(await file.arrayBuffer())
      setRestoring({
        key: 'file',
        source: {
          text: msg('файла «{file}» (копия от {date})'),
          params: { file: file.name, date: formatDateTime(copy.createdAt) },
        },
        ...copy,
      })
    })
  }

  function restore() {
    const target = restoring
    setRestoring(null)
    run(async () => {
      // Текущее состояние сохраняется до восстановления — если выбрали не ту копию, можно вернуться обратно.
      if (hasFirebaseConfig) await saveBackup(data, 'pre-restore', currentTrainer)
      update((prev) => ({ ...prev, ...target.data }), {
        label: `Восстановление данных из ${ru(target.source.text, target.source.params)}`,
      })
      await refresh()
      setMessage({ text: msg('Данные восстановлены из {source}.'), params: { source: target.source } })
    })
  }

  const restoreConfirm = (key) =>
    restoring?.key === key && (
      <div className="rounded-lg border border-warning-500/30 bg-warning-50 dark:bg-warning-500/10 p-3 space-y-2 text-sm">
        <p className="font-semibold">
          {t('Восстановить все данные сайта из {source}?', { source: t(restoring.source.text, restoring.source.params) })}
        </p>
        <ul className="list-disc pl-5">
          <li>
            {t('Сейчас на сайте: групп — {groups}, стажёров — {interns}', { groups: data.groups.length, interns: data.interns.length })}
          </li>
          <li>
            {t('В копии: групп — {groups}, стажёров — {interns}', {
              groups: restoring.data.groups.length,
              interns: restoring.data.interns.length,
            })}
          </li>
        </ul>
        <p className="text-warning-600 dark:text-warning-500">
          {t('Всё, что внесли после этой копии, будет заменено. Текущее состояние перед этим автоматически сохранится в отдельную копию «Перед восстановлением».')}
        </p>
        <div className="flex gap-2">
          <button onClick={restore} className="btn-primary text-sm">
            {t('Да, восстановить')}
          </button>
          <button onClick={() => setRestoring(null)} className="btn-secondary text-sm">
            {t('Нет')}
          </button>
        </div>
      </div>
    )

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t('Резервные копии')}</h1>
      <p className="text-sm text-navy-500 dark:text-navy-400">
        {t('Каждый день, когда кто-то из тренеров заходит в кабинет, сайт сам сохраняет копию всех данных: группы, стажёры, посещаемость, экзамены, настройки и тренеры. Хранятся последние 30 ежедневных копий. Из любой копии можно скачать Excel или вернуть сайт в то состояние.')}
      </p>

      {error && <p className="text-sm text-danger-500">{t(error)}</p>}
      {message && (
        <p className="text-sm text-success-600 dark:text-success-400">
          {t(message.text, message.params && { source: t(message.params.source.text, message.params.source.params) })}
        </p>
      )}

      <div className="card space-y-3">
        <h2 className="font-semibold">{t('Сейчас')}</h2>
        <p className="text-sm text-navy-500 dark:text-navy-400">
          {t('Excel-файл содержит листы «Группы», «Стажёры», «Посещаемость и ДЗ», «Тренеры» и скрытый служебный лист, по которому сайт может восстановить всё один в один. Храните его у себя — это копия на случай, если что-то случится с самой базой.')}
        </p>
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => downloadBackupWorkbook(backupPayload(data))} className="btn-primary">
            {t('⬇ Скачать всё в Excel')}
          </button>
          {hasFirebaseConfig && (
            <button disabled={busy} onClick={saveNow} className="btn-secondary">
              {t('💾 Сохранить копию сейчас')}
            </button>
          )}
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">{t('Восстановить из файла')}</h2>
        <p className="text-sm text-navy-500 dark:text-navy-400">
          {t('Выберите Excel-файл, скачанный кнопкой «Скачать всё в Excel» или из списка копий ниже.')}
        </p>
        <input type="file" accept=".xlsx" disabled={busy} onChange={askRestoreFile} className="text-sm" />
        {restoreConfirm('file')}
      </div>

      {hasFirebaseConfig && (
        <div className="card !p-0 overflow-hidden">
          <h2 className="font-semibold p-3 sm:p-4 pb-0 sm:pb-0">{t('Сохранённые копии')}</h2>
          {!backups && !error && <p className="p-3 sm:p-4 text-navy-400 dark:text-navy-500">{t('Загрузка...')}</p>}
          {backups?.length === 0 && (
            <p className="p-3 sm:p-4 text-navy-400 dark:text-navy-500">
              {t('Копий пока нет — первая появится сегодня автоматически.')}
            </p>
          )}
          <div className="divide-y divide-navy-50 dark:divide-navy-800">
            {backups?.map((b) => (
              <div key={b.id} className="p-3 sm:p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{formatDateTime(b.createdAt)}</div>
                    <div className="text-xs text-navy-400 dark:text-navy-500">
                      {BACKUP_KIND_LABELS[b.kind] ? t(BACKUP_KIND_LABELS[b.kind]) : b.kind} ·{' '}
                      {t('групп: {groups} · стажёров: {interns}', { groups: b.groups, interns: b.interns })}
                      {b.by ? ` · ${b.by}` : ''}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button disabled={busy} onClick={() => downloadStored(b)} className="btn-secondary text-xs px-3 py-1.5">
                      ⬇ Excel
                    </button>
                    {restoring?.key !== b.id && (
                      <button
                        disabled={busy}
                        onClick={() => askRestoreStored(b)}
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        {t('↺ Восстановить')}
                      </button>
                    )}
                  </div>
                </div>
                {restoreConfirm(b.id)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
