import { useEffect, useState } from 'react'
import { useStore } from '../../store/StoreContext.jsx'
import { isTrainerAdmin, visibleGroups } from '../../lib/roles'
import { trainingPeriod } from '../../lib/date'
import { downloadPeriodReport, groupInPeriod } from '../../lib/periodReport'

const ALL = ''

export default function ReportsTab() {
  const { data, currentTrainer, archiveLoaded, requestArchive } = useStore()
  const admin = isTrainerAdmin(currentTrainer)
  const [trainerId, setTrainerId] = useState(ALL)
  const [groupId, setGroupId] = useState(ALL)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [withArchive, setWithArchive] = useState(true)
  // Стажёры архивных групп загружаются отдельно — до этого отчёт по ним был бы пустым.
  const loading = withArchive && !archiveLoaded

  useEffect(() => {
    if (withArchive) requestArchive()
  }, [withArchive, requestArchive])

  const available = visibleGroups(data.groups, currentTrainer)
  // Тренеры, у которых есть группы, — для выбора администратором.
  const trainers = data.trainers.filter((t) => available.some((g) => g.ownerId === t.id))

  const byTrainer = available.filter((g) => !trainerId || g.ownerId === trainerId)
  const groupChoices = byTrainer
    .filter((g) => withArchive || !g.archived)
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'))

  const selected = groupChoices.filter((g) => (groupId ? g.id === groupId : groupInPeriod(g, from, to)))
  const internCount = data.interns.filter((i) => selected.some((g) => g.id === i.groupId)).length

  function changeTrainer(id) {
    setTrainerId(id)
    setGroupId(ALL)
  }

  function download() {
    const title = groupId
      ? selected[0]?.name || 'группа'
      : trainerId
        ? data.trainers.find((t) => t.id === trainerId)?.name || 'тренер'
        : admin
          ? 'все тренеры'
          : currentTrainer?.name || 'мои группы'
    downloadPeriodReport(selected, data.interns, data.trainers, { title, from: groupId ? '' : from, to: groupId ? '' : to })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Отчёты</h1>
      <p className="text-sm text-navy-500 dark:text-navy-400">
        Excel-отчёт для руководства по одной группе, по тренеру или за период. В файле четыре листа: сводка по
        группам, сводка по тренерам, стажёры с процентами посещаемости, ДЗ и результатами экзамена, и подробная
        посещаемость и ДЗ по каждому занятию.
        {!admin && ' Вам доступны отчёты по вашим группам.'}
      </p>

      <div className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {admin && (
            <div>
              <label className="field-label">Тренер</label>
              <select className="field-input" value={trainerId} onChange={(e) => changeTrainer(e.target.value)}>
                <option value={ALL}>Все тренеры</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="field-label">Группа</label>
            <select className="field-input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value={ALL}>Все группы за период</option>
              {groupChoices.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                  {g.archived ? ' (архив)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!groupId && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">Период с</label>
              <input type="date" className="field-input" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="field-label">по</label>
              <input type="date" className="field-input" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        )}
        {!groupId && (
          <p className="text-xs text-navy-400 dark:text-navy-500">
            В отчёт попадают группы, у которых хотя бы одно занятие приходится на выбранный период. Если даты не
            выбраны — все группы.
          </p>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={withArchive} onChange={(e) => setWithArchive(e.target.checked)} />
          Включая архивные группы
        </label>

        <div className="rounded-lg bg-navy-50 dark:bg-navy-800 p-3 text-sm space-y-1">
          <div className="font-semibold">
            В отчёт попадут: групп — {selected.length}, стажёров — {loading ? '…' : internCount}
          </div>
          {selected.length > 0 && (
            <ul className="text-navy-500 dark:text-navy-400 max-h-48 overflow-y-auto">
              {selected.map((g) => (
                <li key={g.id}>
                  {g.name}
                  {trainingPeriod(g.lessons) ? ` · ${trainingPeriod(g.lessons)}` : ''}
                  {g.archived ? ' · архив' : ''}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button disabled={loading || selected.length === 0} onClick={download} className="btn-primary">
          {loading ? 'Загрузка архива...' : '⬇ Скачать отчёт в Excel'}
        </button>
      </div>
    </div>
  )
}
