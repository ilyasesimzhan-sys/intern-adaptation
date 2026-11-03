import { useEffect, useState } from 'react'
import { useStore } from '../../store/StoreContext.jsx'
import { isTrainerAdmin } from '../../lib/roles'
import { getActiveAnswers, examPercent, getInternExamStatus } from '../../lib/exam'
import { formatDate } from '../../lib/date'
import { filterInternsBySearch } from '../../lib/internSearch'
import { REGIONS } from '../../lib/constants'
import { groupInPeriod } from '../../lib/periodReport'
import { countOutcomes, downloadArchiveReport } from '../../lib/archiveReport'

const COLUMNS = [
  { key: 'lastName', label: 'Фамилия' },
  { key: 'firstName', label: 'Имя' },
  { key: 'email', label: 'Email' },
  { key: 'region', label: 'Регион' },
  { key: 'department', label: 'Подразделение' },
  { key: 'position', label: 'Должность' },
  { key: 'phone', label: 'Телефон' },
  { key: 'managerName', label: 'Руководитель' },
  { key: 'managerContact', label: 'Контакты руководителя' },
  { key: 'city', label: 'Город/район' },
]

const NO_REGION = 'none'

function Stat({ label, value, cls = '' }) {
  return (
    <div className="rounded-lg bg-navy-50 dark:bg-navy-800 p-3">
      <div className={'text-2xl font-bold ' + cls}>{value}</div>
      <div className="text-xs text-navy-500 dark:text-navy-400">{label}</div>
    </div>
  )
}

// Отчёт по архиву: сколько стажёров прошло обучение за период и в каком регионе, с выгрузкой в Excel.
function ArchiveReport({ archived, interns, trainers }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [region, setRegion] = useState('')

  const groups = archived.filter((g) => groupInPeriod(g, from, to))
  const ids = new Set(groups.map((g) => g.id))
  const people = interns.filter(
    (i) => ids.has(i.groupId) && (!region || (region === NO_REGION ? !i.region : i.region === region)),
  )
  const counts = countOutcomes(people)

  const periodText = from || to ? `${from ? formatDate(from) : '…'} — ${to ? formatDate(to) : '…'}` : 'за всё время'
  const regionText =
    region === NO_REGION ? 'регион не указан' : REGIONS.find((r) => r.value === region)?.label || 'все регионы'

  return (
    <div className="card space-y-4">
      <h2 className="font-semibold text-lg">Отчёт: сколько стажёров прошло обучение</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="field-label">Период обучения с</label>
          <input type="date" className="field-input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="field-label">по</label>
          <input type="date" className="field-input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Регион</label>
          <select className="field-input" value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">Все регионы</option>
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
            <option value={NO_REGION}>Регион не указан</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
        <Stat label="Групп" value={groups.length} />
        <Stat label="Всего стажёров" value={counts.total} />
        <Stat label="Прошли обучение" value={counts.passed} cls="text-success-600 dark:text-success-400" />
        <Stat label="Не прошли" value={counts.failed} cls="text-danger-500" />
        <Stat label="Отказались" value={counts.withdrawn} cls="text-warning-600 dark:text-warning-500" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={people.length === 0}
          onClick={() => downloadArchiveReport({ groups, interns: people, trainers, periodText, regionText })}
          className="btn-primary"
        >
          ⬇ Скачать отчёт в Excel
        </button>
        <span className="text-xs text-navy-400 dark:text-navy-500">
          В файле: итоги, разбивка по регионам и группам, список стажёров со всеми данными.
        </span>
      </div>
    </div>
  )
}

export default function ArchiveTab() {
  const { data, update, currentTrainer, archiveLoaded, requestArchive } = useStore()
  const { groups, interns, trainers } = data
  const admin = isTrainerAdmin(currentTrainer)

  useEffect(() => {
    requestArchive()
  }, [requestArchive])
  const [searchByGroup, setSearchByGroup] = useState({})
  const [unarchivingId, setUnarchivingId] = useState(null)

  const archived = groups
    .filter((g) => g.archived)
    .sort((a, b) => new Date(b.archivedAt || 0) - new Date(a.archivedAt || 0))

  function unarchive(groupId) {
    setUnarchivingId(null)
    update((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => (g.id === groupId ? { ...g, archived: false, archivedAt: '' } : g)),
    }), { label: `Группа «${groups.find((g) => g.id === groupId)?.name || '—'}» возвращена из архива` })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Архив</h1>
      <p className="text-sm text-navy-500 dark:text-navy-400">
        Группы, прошедшие весь путь обучения и итоговый экзамен. Доступно всем тренерам на просмотр
        {admin ? '; главный логин может вернуть группу из архива.' : '.'}
      </p>

      {!archiveLoaded ? (
        <p className="text-navy-400 dark:text-navy-500">Загрузка архива...</p>
      ) : archived.length === 0 ? (
        <p className="text-navy-400 dark:text-navy-500">В архиве пока пусто.</p>
      ) : (
        <div className="space-y-6">
          <ArchiveReport archived={archived} interns={interns} trainers={trainers} />
          {archived.map((g) => {
            const members = interns.filter((i) => i.groupId === g.id)
            const ownerName = trainers.find((t) => t.id === g.ownerId)?.name || 'без владельца'
            const statuses = members.map((i) => getInternExamStatus(i))
            const passed = statuses.filter((s) => s.code === 'passed')
            const groupSearch = searchByGroup[g.id] || ''
            const visibleMembers = filterInternsBySearch(members, groupSearch)

            return (
              <div key={g.id} className="card space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-lg">{g.name}</h2>
                    <div className="text-sm text-navy-500 dark:text-navy-400 space-y-0.5 mt-1">
                      <div>Тренер: {ownerName}</div>
                      <div>Группа создана: {g.createdAt ? formatDate(g.createdAt) : '—'}</div>
                      <div>
                        Приём анкет: {g.startDate ? formatDate(g.startDate) : '—'} —{' '}
                        {g.endDate ? formatDate(g.endDate) : '—'}
                      </div>
                      <div>Отправлена в архив: {g.archivedAt ? formatDate(g.archivedAt) : '—'}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-sm text-navy-500 dark:text-navy-400">
                      Стажёров: <span className="font-semibold text-navy-700 dark:text-navy-200">{members.length}</span> ·
                      Сдали экзамен:{' '}
                      <span className="font-semibold text-success-600 dark:text-success-400">{passed.length}</span>/
                      {members.length}
                    </div>
                    {admin &&
                      (unarchivingId === g.id ? (
                        <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
                          <span className="font-semibold">Вернуть группу в активные?</span>
                          <button onClick={() => unarchive(g.id)} className="btn-primary text-xs px-3 py-1.5">
                            Да, вернуть
                          </button>
                          <button
                            onClick={() => setUnarchivingId(null)}
                            className="btn-secondary text-xs px-3 py-1.5"
                          >
                            Отмена
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setUnarchivingId(g.id)} className="btn-secondary text-xs px-3 py-1.5">
                          Вернуть из архива
                        </button>
                      ))}
                  </div>
                </div>

                {members.length > 0 && (
                  <input
                    className="field-input max-w-xs"
                    placeholder="Поиск по ФИО, email, телефону..."
                    value={groupSearch}
                    onChange={(e) => setSearchByGroup((prev) => ({ ...prev, [g.id]: e.target.value }))}
                  />
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className="text-left text-navy-500 dark:text-navy-400 border-b border-navy-100 dark:border-navy-700">
                        {COLUMNS.map((c) => (
                          <th key={c.key} className="py-1.5 pr-3 whitespace-nowrap">
                            {c.label}
                          </th>
                        ))}
                        <th className="py-1.5 pr-3 whitespace-nowrap">Правильных ответов</th>
                        <th className="py-1.5 pr-3 whitespace-nowrap">Статус экзамена</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleMembers.map((i) => {
                        const answers = getActiveAnswers(i)
                        const status = getInternExamStatus(i)
                        return (
                          <tr key={i.id} className="border-b border-navy-50 dark:border-navy-800 last:border-0">
                            {COLUMNS.map((c) => (
                              <td key={c.key} className="py-1.5 pr-3 whitespace-nowrap">
                                {i[c.key]}
                              </td>
                            ))}
                            <td className="py-1.5 pr-3">{examPercent(answers)}%</td>
                            <td className="py-1.5 pr-3">
                              <span className={'px-2 py-1 rounded-full text-xs font-semibold ' + status.cls}>
                                {status.label}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                      {members.length === 0 && (
                        <tr>
                          <td
                            colSpan={COLUMNS.length + 2}
                            className="py-4 text-center text-navy-400 dark:text-navy-500"
                          >
                            В группе не было стажёров
                          </td>
                        </tr>
                      )}
                      {members.length > 0 && visibleMembers.length === 0 && (
                        <tr>
                          <td
                            colSpan={COLUMNS.length + 2}
                            className="py-4 text-center text-navy-400 dark:text-navy-500"
                          >
                            Совпадений не найдено
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
