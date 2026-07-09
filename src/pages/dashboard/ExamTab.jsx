import { useStore } from '../../store/StoreContext.jsx'
import { activeVisibleGroups } from '../../lib/roles'

const PASS_THRESHOLD = 9

function examStatus(score) {
  if (score === null || score === undefined || score === '') return { label: 'Не оценён', cls: 'bg-navy-100 text-navy-500' }
  return score >= PASS_THRESHOLD
    ? { label: 'Сдан', cls: 'bg-success-50 text-success-600' }
    : { label: 'Не сдан', cls: 'bg-danger-50 text-danger-500' }
}

export default function ExamTab() {
  const { data, update, currentTrainer } = useStore()
  const { settings, interns: allInterns } = data

  const myGroups = activeVisibleGroups(data.groups, currentTrainer).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  )

  function patchSettings(patch) {
    update((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  }

  function setScore(internId, value) {
    const score = value === '' ? null : Math.max(0, Math.min(10, Number(value)))
    update((prev) => ({
      ...prev,
      interns: prev.interns.map((i) => (i.id === internId ? { ...i, examScore: score } : i)),
    }))
  }

  function archiveGroup(groupId) {
    if (!confirm('Отправить группу в архив? Она пропадёт из активных, но данные сохранятся в разделе «Архив».')) return
    update((prev) => ({
      ...prev,
      groups: prev.groups.map((g) =>
        g.id === groupId ? { ...g, archived: true, archivedAt: new Date().toISOString().slice(0, 10) } : g,
      ),
    }))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Итоговый экзамен</h1>

      <div className="card space-y-2">
        <h2 className="font-semibold">Правила экзамена</h2>
        <textarea
          className="field-input min-h-[160px] font-mono text-sm"
          value={settings.examRules}
          onChange={(e) => patchSettings({ examRules: e.target.value })}
        />
      </div>

      {myGroups.length === 0 ? (
        <p className="text-navy-400">Сначала создайте группу во вкладке «Настройки сбора».</p>
      ) : (
        myGroups.map((group) => {
          const interns = allInterns.filter((i) => i.groupId === group.id)
          const graded = interns.filter((i) => i.examScore !== null && i.examScore !== undefined)
          const passed = graded.filter((i) => i.examScore >= PASS_THRESHOLD)
          const allGraded = interns.length > 0 && graded.length === interns.length

          return (
            <div key={group.id} className="card space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">{group.name}</h2>
                <button
                  onClick={() => archiveGroup(group.id)}
                  disabled={!allGraded}
                  title={allGraded ? '' : 'Доступно, когда всем стажёрам группы выставлен балл за экзамен'}
                  className="btn-secondary text-sm"
                >
                  Отправить в архив
                </button>
              </div>

              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  Всего стажёров: <span className="font-semibold">{interns.length}</span>
                </div>
                <div>
                  Оценено: <span className="font-semibold">{graded.length}</span>
                </div>
                <div>
                  Прошли порог ({PASS_THRESHOLD}/10):{' '}
                  <span className="font-semibold text-success-600">{passed.length}</span>
                </div>
              </div>
              {!allGraded && interns.length > 0 && (
                <p className="text-xs text-warning-600">
                  В архив можно отправить, только когда балл выставлен всем стажёрам группы.
                </p>
              )}

              {interns.length === 0 ? (
                <p className="text-navy-400 text-sm">В группе пока нет стажёров.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[400px]">
                    <thead>
                      <tr className="text-left text-navy-500 border-b border-navy-100">
                        <th className="py-2 pr-3">ФИО</th>
                        <th className="py-2 pr-3">Балл (0–10)</th>
                        <th className="py-2 pr-3">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {interns.map((i) => {
                        const status = examStatus(i.examScore)
                        return (
                          <tr key={i.id} className="border-b border-navy-50 last:border-0">
                            <td className="py-2 pr-3 whitespace-nowrap">
                              {i.lastName} {i.firstName}
                            </td>
                            <td className="py-2 pr-3">
                              <input
                                type="number"
                                min={0}
                                max={10}
                                className="field-input max-w-[90px]"
                                value={i.examScore ?? ''}
                                onChange={(e) => setScore(i.id, e.target.value)}
                              />
                            </td>
                            <td className="py-2 pr-3">
                              <span className={'px-2 py-1 rounded-full text-xs font-semibold ' + status.cls}>
                                {status.label}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
