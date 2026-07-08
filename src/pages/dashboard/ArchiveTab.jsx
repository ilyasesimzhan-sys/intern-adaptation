import { useStore } from '../../store/StoreContext.jsx'
import { isTrainerAdmin } from '../../lib/roles'

const PASS_THRESHOLD = 9

function examStatusLabel(score) {
  if (score === null || score === undefined || score === '') return 'Не оценён'
  return score >= PASS_THRESHOLD ? 'Сдан' : 'Не сдан'
}

const COLUMNS = [
  { key: 'lastName', label: 'Фамилия' },
  { key: 'firstName', label: 'Имя' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Подразделение' },
  { key: 'position', label: 'Должность' },
  { key: 'phone', label: 'Телефон' },
  { key: 'managerName', label: 'Руководитель' },
  { key: 'managerContact', label: 'Контакты руководителя' },
  { key: 'city', label: 'Город' },
]

export default function ArchiveTab() {
  const { data, update, currentTrainer } = useStore()
  const { groups, interns, trainers } = data
  const admin = isTrainerAdmin(currentTrainer)

  const archived = groups
    .filter((g) => g.archived)
    .sort((a, b) => new Date(b.archivedAt || 0) - new Date(a.archivedAt || 0))

  function unarchive(groupId) {
    if (!confirm('Вернуть эту группу из архива в активные?')) return
    update((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => (g.id === groupId ? { ...g, archived: false, archivedAt: '' } : g)),
    }))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Архив</h1>
      <p className="text-sm text-navy-500">
        Группы, прошедшие весь путь обучения и итоговый экзамен. Доступно всем тренерам на просмотр
        {admin ? '; главный логин может вернуть группу из архива.' : '.'}
      </p>

      {archived.length === 0 ? (
        <p className="text-navy-400">В архиве пока пусто.</p>
      ) : (
        <div className="space-y-6">
          {archived.map((g) => {
            const members = interns.filter((i) => i.groupId === g.id)
            const ownerName = trainers.find((t) => t.id === g.ownerId)?.name || 'без владельца'
            const graded = members.filter((i) => i.examScore !== null && i.examScore !== undefined)
            const passed = graded.filter((i) => i.examScore >= PASS_THRESHOLD)

            return (
              <div key={g.id} className="card space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-lg">{g.name}</h2>
                    <div className="text-sm text-navy-500 space-y-0.5 mt-1">
                      <div>Тренер: {ownerName}</div>
                      <div>Группа создана: {g.createdAt ? g.createdAt.slice(0, 10) : '—'}</div>
                      <div>
                        Приём анкет: {g.startDate || '—'} — {g.endDate || '—'}
                      </div>
                      <div>Отправлена в архив: {g.archivedAt || '—'}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-sm text-navy-500">
                      Стажёров: <span className="font-semibold text-navy-700">{members.length}</span> · Сдали
                      экзамен: <span className="font-semibold text-success-600">{passed.length}</span>/
                      {graded.length}
                    </div>
                    {admin && (
                      <button onClick={() => unarchive(g.id)} className="btn-secondary text-xs px-3 py-1.5">
                        Вернуть из архива
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className="text-left text-navy-500 border-b border-navy-100">
                        {COLUMNS.map((c) => (
                          <th key={c.key} className="py-1.5 pr-3 whitespace-nowrap">
                            {c.label}
                          </th>
                        ))}
                        <th className="py-1.5 pr-3 whitespace-nowrap">Балл</th>
                        <th className="py-1.5 pr-3 whitespace-nowrap">Статус экзамена</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((i) => (
                        <tr key={i.id} className="border-b border-navy-50 last:border-0">
                          {COLUMNS.map((c) => (
                            <td key={c.key} className="py-1.5 pr-3 whitespace-nowrap">
                              {i[c.key]}
                            </td>
                          ))}
                          <td className="py-1.5 pr-3">{i.examScore ?? '—'}</td>
                          <td className="py-1.5 pr-3">{examStatusLabel(i.examScore)}</td>
                        </tr>
                      ))}
                      {members.length === 0 && (
                        <tr>
                          <td colSpan={COLUMNS.length + 2} className="py-4 text-center text-navy-400">
                            В группе не было стажёров
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
