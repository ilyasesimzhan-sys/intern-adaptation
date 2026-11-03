import { useEffect, useState } from 'react'
import { useStore } from '../../store/StoreContext.jsx'
import { hasFirebaseConfig } from '../../lib/firebase'
import { isTrainerAdmin } from '../../lib/roles'
import { BACKUP_KIND_LABELS, listBackups, loadBackup, saveBackup } from '../../lib/backup'
import { backupPayload, downloadBackupWorkbook, readBackupWorkbook } from '../../lib/backupFile'

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function BackupsTab() {
  const { data, update, currentTrainer, archiveLoaded, requestArchive } = useStore()
  const admin = isTrainerAdmin(currentTrainer)
  const [backups, setBackups] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  // Подтверждение восстановления: { source: 'Копия от …', createdAt, data, key }
  const [restoring, setRestoring] = useState(null)

  async function refresh() {
    if (!hasFirebaseConfig) return setBackups([])
    try {
      setBackups(await listBackups())
    } catch (err) {
      console.error('Backups load failed', err)
      setError('Не удалось загрузить список копий.')
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
    return <p className="text-navy-400 dark:text-navy-500">Раздел доступен только администратору.</p>
  }

  if (!archiveLoaded) {
    return <p className="text-navy-400 dark:text-navy-500">Загрузка всех данных...</p>
  }

  async function run(action) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await action()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Что-то пошло не так.')
    } finally {
      setBusy(false)
    }
  }

  function saveNow() {
    run(async () => {
      await saveBackup(data, 'manual', currentTrainer)
      await refresh()
      setMessage('Копия сохранена.')
    })
  }

  function downloadStored(meta) {
    run(async () => downloadBackupWorkbook({ createdAt: meta.createdAt, ...(await loadBackup(meta)) }))
  }

  function askRestoreStored(meta) {
    run(async () => {
      const copy = await loadBackup(meta)
      setRestoring({ key: meta.id, source: `копии от ${formatDateTime(copy.createdAt)}`, ...copy })
    })
  }

  function askRestoreFile(ev) {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file) return
    run(async () => {
      const copy = readBackupWorkbook(await file.arrayBuffer())
      setRestoring({ key: 'file', source: `файла «${file.name}» (копия от ${formatDateTime(copy.createdAt)})`, ...copy })
    })
  }

  function restore() {
    const target = restoring
    setRestoring(null)
    run(async () => {
      // Текущее состояние сохраняется до восстановления — если выбрали не ту копию, можно вернуться обратно.
      if (hasFirebaseConfig) await saveBackup(data, 'pre-restore', currentTrainer)
      update((prev) => ({ ...prev, ...target.data }), { label: `Восстановление данных из ${target.source}` })
      await refresh()
      setMessage(`Данные восстановлены из ${target.source}.`)
    })
  }

  const restoreConfirm = (key) =>
    restoring?.key === key && (
      <div className="rounded-lg border border-warning-500/30 bg-warning-50 dark:bg-warning-500/10 p-3 space-y-2 text-sm">
        <p className="font-semibold">Восстановить все данные сайта из {restoring.source}?</p>
        <ul className="list-disc pl-5">
          <li>
            Сейчас на сайте: групп — {data.groups.length}, стажёров — {data.interns.length}
          </li>
          <li>
            В копии: групп — {restoring.data.groups.length}, стажёров — {restoring.data.interns.length}
          </li>
        </ul>
        <p className="text-warning-600 dark:text-warning-500">
          Всё, что внесли после этой копии, будет заменено. Текущее состояние перед этим автоматически сохранится в
          отдельную копию «Перед восстановлением».
        </p>
        <div className="flex gap-2">
          <button onClick={restore} className="btn-primary text-sm">
            Да, восстановить
          </button>
          <button onClick={() => setRestoring(null)} className="btn-secondary text-sm">
            Нет
          </button>
        </div>
      </div>
    )

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Резервные копии</h1>
      <p className="text-sm text-navy-500 dark:text-navy-400">
        Каждый день, когда кто-то из тренеров заходит в кабинет, сайт сам сохраняет копию всех данных: группы,
        стажёры, посещаемость, экзамены, настройки и тренеры. Хранятся последние 30 ежедневных копий. Из любой копии
        можно скачать Excel или вернуть сайт в то состояние.
      </p>

      {error && <p className="text-sm text-danger-500">{error}</p>}
      {message && <p className="text-sm text-success-600 dark:text-success-400">{message}</p>}

      <div className="card space-y-3">
        <h2 className="font-semibold">Сейчас</h2>
        <p className="text-sm text-navy-500 dark:text-navy-400">
          Excel-файл содержит листы «Группы», «Стажёры», «Посещаемость и ДЗ», «Тренеры» и скрытый служебный лист, по
          которому сайт может восстановить всё один в один. Храните его у себя — это копия на случай, если что-то
          случится с самой базой.
        </p>
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => downloadBackupWorkbook(backupPayload(data))} className="btn-primary">
            ⬇ Скачать всё в Excel
          </button>
          {hasFirebaseConfig && (
            <button disabled={busy} onClick={saveNow} className="btn-secondary">
              💾 Сохранить копию сейчас
            </button>
          )}
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Восстановить из файла</h2>
        <p className="text-sm text-navy-500 dark:text-navy-400">
          Выберите Excel-файл, скачанный кнопкой «Скачать всё в Excel» или из списка копий ниже.
        </p>
        <input type="file" accept=".xlsx" disabled={busy} onChange={askRestoreFile} className="text-sm" />
        {restoreConfirm('file')}
      </div>

      {hasFirebaseConfig && (
        <div className="card !p-0 overflow-hidden">
          <h2 className="font-semibold p-3 sm:p-4 pb-0 sm:pb-0">Сохранённые копии</h2>
          {!backups && !error && <p className="p-3 sm:p-4 text-navy-400 dark:text-navy-500">Загрузка...</p>}
          {backups?.length === 0 && (
            <p className="p-3 sm:p-4 text-navy-400 dark:text-navy-500">
              Копий пока нет — первая появится сегодня автоматически.
            </p>
          )}
          <div className="divide-y divide-navy-50 dark:divide-navy-800">
            {backups?.map((b) => (
              <div key={b.id} className="p-3 sm:p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{formatDateTime(b.createdAt)}</div>
                    <div className="text-xs text-navy-400 dark:text-navy-500">
                      {BACKUP_KIND_LABELS[b.kind] || b.kind} · групп: {b.groups} · стажёров: {b.interns}
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
                        ↺ Восстановить
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
