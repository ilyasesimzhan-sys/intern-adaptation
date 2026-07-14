import { Link, useParams } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'
import { getActiveAnswers, examPercent, getInternExamStatus } from '../lib/exam'
import { formatDate } from '../lib/date'
import ThemeToggle from '../components/ThemeToggle.jsx'

export default function CertificatePage() {
  const { internId } = useParams()
  const { data } = useStore()
  const intern = data.interns.find((i) => i.id === internId)
  const group = intern ? data.groups.find((g) => g.id === intern.groupId) : null
  const trainer = group ? data.trainers.find((t) => t.id === group.ownerId) : null

  if (!intern) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">Стажёр не найден</h1>
          <Link to="/" className="btn-secondary">
            На главную
          </Link>
        </div>
      </div>
    )
  }

  const status = getInternExamStatus(intern)
  const percent = examPercent(getActiveAnswers(intern))

  if (status.code !== 'passed') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">Сертификат недоступен</h1>
          <p className="text-navy-500 dark:text-navy-400 mb-4">
            Сертификат выдаётся только после успешной сдачи итогового экзамена.
          </p>
          <Link to={`/progress/${intern.id}`} className="btn-secondary">
            К прогрессу стажёра
          </Link>
        </div>
      </div>
    )
  }

  const issueDate = group?.endDate ? formatDate(group.endDate) : formatDate(new Date().toISOString())

  return (
    <div className="min-h-screen py-8 px-4 print:p-0 print:min-h-0">
      <style>{`
        @media print {
          @page { size: landscape; margin: 0; }
          body { background: white !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto space-y-4 no-print">
        <div className="flex items-center justify-between">
          <Link
            to={`/progress/${intern.id}`}
            className="text-sm text-navy-500 hover:text-navy-700 dark:text-navy-400 dark:hover:text-navy-200"
          >
            ← К прогрессу стажёра
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={() => window.print()} className="btn-primary">
              Печать / Сохранить как PDF
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto mt-6 print:mt-0 print:max-w-none">
        <div className="relative bg-white text-navy-900 rounded-2xl shadow-sm border-4 border-double border-navy-700 p-10 sm:p-14 print:border-navy-700 print:rounded-none print:shadow-none">
          <div className="absolute inset-3 border border-navy-200 rounded-xl pointer-events-none" />

          <div className="relative text-center space-y-6">
            <div className="text-xs font-semibold tracking-[0.3em] uppercase text-sky-600">
              {data.settings.programName}
            </div>
            <div className="font-display text-3xl sm:text-4xl font-extrabold text-navy-800">Сертификат</div>
            <p className="text-navy-500 text-sm">подтверждает, что</p>
            <div className="font-display text-2xl sm:text-3xl font-bold text-navy-900 py-2 border-b-2 border-navy-200 inline-block px-8">
              {intern.lastName} {intern.firstName}
            </div>
            <p className="text-navy-600 text-sm max-w-lg mx-auto">
              успешно прошёл(-ла) адаптационную программу{group ? ` в группе «${group.name}»` : ''} и сдал(-а)
              итоговый экзамен с результатом <span className="font-semibold text-success-600">{percent}%</span>.
            </p>

            <div className="flex flex-wrap items-end justify-center gap-10 pt-8 text-sm">
              <div className="text-center">
                <div className="w-40 border-t border-navy-300 pt-1 text-navy-500">Дата</div>
                <div className="font-medium">{issueDate}</div>
              </div>
              <div className="text-center">
                <div className="w-40 border-t border-navy-300 pt-1 text-navy-500">Бизнес-тренер</div>
                <div className="font-medium">{trainer?.name || '—'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
