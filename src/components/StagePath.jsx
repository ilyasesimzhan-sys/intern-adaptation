const STAGES = [
  { key: 'form', label: 'Анкета' },
  { key: 'grouping', label: 'Формирование группы' },
  { key: 'learning', label: 'Обучение и адаптация' },
  { key: 'exam', label: 'Итоговый экзамен' },
]

// Волна идёт по кругам и соединяющим линиям слева направо и зацикливается —
// не зависит от статуса группы, только подсвечивает порядок этапов.
const STEP_DELAY = 0.7
const CYCLE = STAGES.length * STEP_DELAY

export default function StagePath({ current }) {
  const currentIdx = STAGES.findIndex((s) => s.key === current)

  return (
    <div className="flex items-center w-full overflow-x-auto py-2">
      {STAGES.map((stage, idx) => {
        const active = idx === currentIdx
        return (
          <div key={stage.key} className="flex items-center flex-1 min-w-[140px] last:flex-none">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="relative w-9 h-9 shrink-0">
                <span
                  className="absolute inset-0 rounded-full bg-success-500 animate-chase-pulse"
                  style={{ animationDelay: `${idx * STEP_DELAY}s`, animationDuration: `${CYCLE}s` }}
                />
                <div
                  className="relative w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold bg-success-500 text-white animate-chase-blink"
                  style={{ animationDelay: `${idx * STEP_DELAY}s`, animationDuration: `${CYCLE}s` }}
                >
                  ✓
                </div>
              </div>
              <span
                className={
                  'text-xs font-medium text-center max-w-[100px] transition-colors duration-300 ' +
                  (active ? 'text-navy-900 dark:text-navy-50' : 'text-navy-400 dark:text-navy-500')
                }
              >
                {stage.label}
              </span>
            </div>
            {idx < STAGES.length - 1 && (
              <div className="relative h-0.5 flex-1 mx-2 mb-5 rounded-full overflow-hidden bg-success-500">
                <div
                  className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-white/80 to-transparent animate-chase-sweep"
                  style={{
                    animationDelay: `${idx * STEP_DELAY + STEP_DELAY / 2}s`,
                    animationDuration: `${CYCLE}s`,
                  }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
