import { useStore } from '../../store/StoreContext.jsx'

const PASS_THRESHOLD = 9

function examStatus(score) {
  if (score === null || score === undefined || score === '') return { label: 'Не оценён', cls: 'bg-navy-100 text-navy-500' }
  return score >= PASS_THRESHOLD
    ? { label: 'Сдан', cls: 'bg-success-50 text-success-600' }
    : { label: 'Не сдан', cls: 'bg-danger-50 text-danger-500' }
}

export default function ExamTab() {
  const { data, update } = useStore()
  const { settings, interns } = data

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

  const graded = interns.filter((i) => i.examScore !== null && i.examScore !== undefined)
  const passed = graded.filter((i) => i.examScore >= PASS_THRESHOLD)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Итоговый экзамен</h1>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Этап экзамена активен на главной странице</div>
            <div className="text-sm text-navy-500">
              «Путь стажёра» на главной перейдёт на 4-й этап. Доступно только после формирования группы.
            </div>
          </div>
          <button
            onClick={() => patchSettings({ examOpen: !settings.examOpen })}
            disabled={!settings.groupsFormed}
            className={
              'relative w-12 h-7 rounded-full transition-colors shrink-0 ' +
              (settings.examOpen ? 'bg-success-500' : 'bg-navy-200')
            }
          >
            <span
              className={
                'absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ' +
                (settings.examOpen ? 'translate-x-6' : 'translate-x-1')
              }
            />
          </button>
        </div>
        {!settings.groupsFormed && (
          <p className="text-xs text-warning-600">Сначала сформируйте группу во вкладке «Настройки сбора».</p>
        )}
      </div>

      <div className="card space-y-2">
        <h2 className="font-semibold">Правила экзамена</h2>
        <textarea
          className="field-input min-h-[160px] font-mono text-sm"
          value={settings.examRules}
          onChange={(e) => patchSettings({ examRules: e.target.value })}
        />
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-6 mb-4 text-sm">
          <div>
            Всего стажёров: <span className="font-semibold">{interns.length}</span>
          </div>
          <div>
            Оценено: <span className="font-semibold">{graded.length}</span>
          </div>
          <div>
            Прошли порог ({PASS_THRESHOLD}/10): <span className="font-semibold text-success-600">{passed.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="text-left text-navy-500 border-b border-navy-100">
                <th className="py-2 pr-3">ФИО</th>
                <th className="py-2 pr-3">Группа</th>
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
                    <td className="py-2 pr-3">{i.groupNumber ?? '—'}</td>
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
      </div>
    </div>
  )
}
