import { STAGES } from '../lib/constants'

export default function StagePath({ current }) {
  const currentIdx = STAGES.findIndex((s) => s.key === current)

  return (
    <div className="flex items-center w-full overflow-x-auto py-2">
      {STAGES.map((stage, idx) => {
        const done = idx < currentIdx
        const active = idx === currentIdx
        return (
          <div key={stage.key} className="flex items-center flex-1 min-w-[140px] last:flex-none">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div
                className={
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ' +
                  (active
                    ? 'bg-navy-700 text-white ring-4 ring-navy-200'
                    : done
                      ? 'bg-success-500 text-white'
                      : 'bg-navy-100 text-navy-400')
                }
              >
                {done ? '✓' : idx + 1}
              </div>
              <span
                className={
                  'text-xs font-medium text-center max-w-[100px] ' +
                  (active ? 'text-navy-900' : 'text-navy-400')
                }
              >
                {stage.label}
              </span>
            </div>
            {idx < STAGES.length - 1 && (
              <div className={'h-0.5 flex-1 mx-2 mb-5 ' + (done ? 'bg-success-500' : 'bg-navy-100')} />
            )}
          </div>
        )
      })}
    </div>
  )
}
