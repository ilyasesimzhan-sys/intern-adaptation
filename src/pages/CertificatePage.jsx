import { Link, useParams } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'
import {
  getActiveAnswers,
  examCorrectCount,
  examPercent,
  getInternExamStatus,
  getActiveExamDate,
  EXAM_QUESTION_COUNT,
} from '../lib/exam'
import { formatDate, trainingPeriod } from '../lib/date'
import logo from '../assets/logo.jpeg'
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
  const isPassed = status.code === 'passed'
  const isTraining = status.code === 'training'

  if (!isPassed && !isTraining) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">Документ недоступен</h1>
          <p className="text-navy-500 dark:text-navy-400 mb-4">
            Сертификат или уведомление о результате появляются здесь только после того, как по итоговому экзамену
            принято окончательное решение.
          </p>
          <Link to={`/progress/${intern.id}`} className="btn-secondary">
            К прогрессу стажёра
          </Link>
        </div>
      </div>
    )
  }

  const activeAnswers = getActiveAnswers(intern)
  const correct = examCorrectCount(activeAnswers)
  const percent = examPercent(activeAnswers)
  const examDate = getActiveExamDate(intern)
  const period = trainingPeriod(group?.lessons)
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

      <div className="max-w-4xl mx-auto mt-6 print:mt-0 print:max-w-none">
        <div className="relative bg-white text-navy-900 rounded-2xl shadow-sm border border-navy-100 overflow-hidden flex flex-col sm:flex-row print:rounded-none print:shadow-none print:border-0">
          <div className="sm:w-48 shrink-0 bg-navy-900 flex flex-row sm:flex-col items-center justify-center gap-4 sm:gap-3 py-6 sm:py-10 px-6 print:bg-navy-900">
            <div className="bg-white rounded-xl p-3 shrink-0">
              <img src={logo} alt="Kazakhtelecom Corporate University" className="h-10 sm:h-12 w-auto" />
            </div>
            <div className="text-navy-100 text-xs sm:text-[11px] text-left sm:text-center tracking-[0.15em] uppercase leading-relaxed">
              Kazakhtelecom
              <br />
              Corporate University
            </div>
          </div>

          <div className="flex-1 p-8 sm:p-12">
            <div
              className={
                'text-xs font-semibold uppercase tracking-[0.25em] ' + (isPassed ? 'text-sky-600' : 'text-warning-600')
              }
            >
              {isPassed ? 'Сертификат' : 'Уведомление о результате'}
            </div>
            <div className="font-display text-2xl sm:text-3xl font-bold text-navy-900 mt-2">
              {intern.lastName} {intern.firstName}
            </div>
            <p className="text-sm text-navy-400 mt-1">
              {intern.department} · {intern.position} · {intern.city}
            </p>

            <p className="text-navy-600 text-sm max-w-xl mt-5 leading-relaxed">
              {isPassed ? (
                <>
                  успешно прошёл(-ла) адаптационную программу{group ? ` в группе «${group.name}»` : ''}
                  {period ? ` (${period})` : ''} и сдал(-а) итоговый экзамен с результатом{' '}
                  <span className="font-semibold text-success-600">
                    {correct}/{EXAM_QUESTION_COUNT} ({percent}%)
                  </span>
                  .
                </>
              ) : (
                <>
                  прошёл(-ла) адаптационную программу{group ? ` в группе «${group.name}»` : ''}
                  {period ? ` (${period})` : ''}, но, к сожалению, по итогам итогового экзамена не набрал(а)
                  проходной балл — результат{' '}
                  <span className="font-semibold text-danger-500">
                    {correct}/{EXAM_QUESTION_COUNT} ({percent}%)
                  </span>{' '}
                  — и направлен(а) на дополнительное обучение.
                </>
              )}
            </p>

            {isTraining && intern.examFinalComment && (
              <p className="text-sm text-navy-500 max-w-xl mt-3 italic">«{intern.examFinalComment}»</p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mt-8 pt-6 border-t border-navy-100">
              <div>
                <div className="text-xs text-navy-400">Обучение</div>
                <div className="text-sm font-medium mt-0.5">{period || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-navy-400">Дата экзамена</div>
                <div className="text-sm font-medium mt-0.5">{examDate ? formatDate(examDate) : '—'}</div>
              </div>
              <div>
                <div className="text-xs text-navy-400">Бизнес-тренер</div>
                <div className="text-sm font-medium mt-0.5">{trainer?.name || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-navy-400">Дата выдачи</div>
                <div className="text-sm font-medium mt-0.5">{issueDate}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
