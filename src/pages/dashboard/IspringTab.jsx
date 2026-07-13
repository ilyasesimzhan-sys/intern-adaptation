import { useStore } from '../../store/StoreContext.jsx'
import { activeVisibleGroups, isTrainerAdmin } from '../../lib/roles'
import { downloadIspringReport } from '../../lib/ispringReport'

const COLUMNS = [
  { key: 'lastName', label: 'Фамилия' },
  { key: 'firstName', label: 'Имя' },
  { key: 'email', label: 'Электронная почта' },
  { key: 'department', label: 'Подразделение' },
  { key: 'position', label: 'Должность' },
  { key: 'city', label: 'Город/район' },
]

export default function IspringTab() {
  const { data, update, currentTrainer } = useStore()
  const { groups, interns: allInterns } = data
  const admin = isTrainerAdmin(currentTrainer)

  const myGroups = activeVisibleGroups(groups, currentTrainer).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  )
  // Логины создаются после начала обучения — сбор анкет закрыт и группа стартовала.
  const startedGroups = myGroups.filter((g) => !g.isOpen && g.endDate)

  function patchIntern(id, patch) {
    update((prev) => ({
      ...prev,
      interns: prev.interns.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Логины iSpring</h1>
      <p className="text-sm text-navy-500 dark:text-navy-400">
        Анкетные данные подтягиваются автоматически из списка стажёров группы после начала обучения. Логин и пароль
        iSpring {admin ? 'заполняет только главный логин.' : 'заполняет главный логин — здесь они доступны для просмотра.'}
      </p>

      {startedGroups.length === 0 ? (
        <p className="text-navy-400 dark:text-navy-500">
          Пока нет групп, начавших обучение — раздел заполнится, когда закроется сбор анкет хотя бы одной группы.
        </p>
      ) : (
        <div className="space-y-6">
          {startedGroups.map((group) => {
            const interns = allInterns.filter((i) => i.groupId === group.id)
            return (
              <div key={group.id} className="card space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-semibold">{group.name}</h2>
                  <button
                    onClick={() => downloadIspringReport(group, interns)}
                    disabled={interns.length === 0}
                    className="btn-secondary text-sm"
                  >
                    Скачать Excel
                  </button>
                </div>

                {interns.length === 0 ? (
                  <p className="text-navy-400 dark:text-navy-500 text-sm">В группе пока нет стажёров.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[900px]">
                      <thead>
                        <tr className="text-left text-navy-500 dark:text-navy-400 border-b border-navy-100 dark:border-navy-700">
                          {COLUMNS.map((c) => (
                            <th key={c.key} className="py-2 pr-3 whitespace-nowrap">
                              {c.label}
                            </th>
                          ))}
                          <th className="py-2 pr-3 whitespace-nowrap">Логин iSpring</th>
                          <th className="py-2 pr-3 whitespace-nowrap">Пароль iSpring</th>
                        </tr>
                      </thead>
                      <tbody>
                        {interns.map((i) => (
                          <tr key={i.id} className="border-b border-navy-50 dark:border-navy-800 last:border-0">
                            {COLUMNS.map((c) => (
                              <td key={c.key} className="py-1.5 pr-3 whitespace-nowrap">
                                {i[c.key]}
                              </td>
                            ))}
                            <td className="py-1.5 pr-3">
                              {admin ? (
                                <input
                                  className="field-input min-w-[140px]"
                                  value={i.ispringLogin || ''}
                                  onChange={(e) => patchIntern(i.id, { ispringLogin: e.target.value })}
                                />
                              ) : (
                                i.ispringLogin || <span className="text-navy-400 dark:text-navy-500">—</span>
                              )}
                            </td>
                            <td className="py-1.5 pr-3">
                              {admin ? (
                                <input
                                  className="field-input min-w-[140px]"
                                  value={i.ispringPassword || ''}
                                  onChange={(e) => patchIntern(i.id, { ispringPassword: e.target.value })}
                                />
                              ) : (
                                i.ispringPassword || <span className="text-navy-400 dark:text-navy-500">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
