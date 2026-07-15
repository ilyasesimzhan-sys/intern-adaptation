import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import html2pdf from 'html2pdf.js'
import { useStore } from '../store/StoreContext.jsx'
import {
  getActiveAnswers,
  examCorrectCount,
  examPercent,
  getInternExamStatus,
  getActiveExamDate,
  getWeakTopics,
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
  const certRef = useRef(null)
  const [downloading, setDownloading] = useState(false)

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
  const weakTopics = isTraining ? getWeakTopics(intern) : []

  async function downloadPdf() {
    if (!certRef.current || downloading) return
    setDownloading(true)
    try {
      await html2pdf()
        .set({
          margin: 0,
          filename: `${isPassed ? 'Сертификат' : 'Уведомление'} — ${intern.lastName} ${intern.firstName}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 1200 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        })
        .from(certRef.current)
        .save()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link
            to={`/progress/${intern.id}`}
            className="text-sm text-navy-500 hover:text-navy-700 dark:text-navy-400 dark:hover:text-navy-200"
          >
            ← К прогрессу стажёра
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={downloadPdf} disabled={downloading} className="btn-primary">
              {downloading ? 'Формируем PDF…' : 'Скачать PDF'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-6">
        <div
          ref={certRef}
          className="relative bg-white text-navy-900 rounded-2xl shadow-sm border border-navy-100 overflow-hidden flex flex-col sm:flex-row sm:aspect-[297/210]"
        >
          <div className="sm:w-56 shrink-0 bg-navy-900 flex flex-row sm:flex-col items-center justify-center gap-5 sm:gap-4 py-8 sm:py-10 px-6">
            <div className="bg-white rounded-xl p-4 shrink-0">
              <img src={logo} alt="Kazakhtelecom Corporate University" className="h-12 sm:h-14 w-auto" />
            </div>
            <div className="text-navy-100 text-sm sm:text-xs text-left sm:text-center tracking-[0.15em] uppercase leading-relaxed">
              Kazakhtelecom
              <br />
              Corporate University
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center p-8 sm:p-16">
            <div
              className={
                'text-sm font-semibold uppercase tracking-[0.3em] ' + (isPassed ? 'text-sky-600' : 'text-warning-600')
              }
            >
              {isPassed ? 'Сертификат' : 'Уведомление о результате'}
            </div>
            <div className="font-display text-3xl sm:text-4xl font-bold text-navy-900 mt-3">
              {intern.lastName} {intern.firstName}
            </div>
            <p className="text-base text-navy-400 mt-2">
              {intern.department} · {intern.position} · {intern.city}
            </p>

            <p className="text-navy-600 text-base max-w-2xl mt-6 leading-relaxed">
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

            {isTraining && (intern.examFinalComment || weakTopics.length > 0) && (
              <div className="mt-4 max-w-2xl rounded-xl bg-warning-50 dark:bg-warning-500/10 p-4">
                <div className="text-xs font-semibold text-warning-600 uppercase tracking-wide">
                  Рекомендации к дополнительному обучению
                </div>
                {intern.examFinalComment && (
                  <p className="text-sm text-navy-700 mt-2 leading-relaxed">{intern.examFinalComment}</p>
                )}
                {weakTopics.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-navy-500 mb-1">Вопросы, на которые не был дан верный ответ:</div>
                    <ul className="text-sm text-navy-700 list-disc list-inside space-y-0.5">
                      {weakTopics.map((topic, idx) => (
                        <li key={idx}>{topic}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-10 pt-8 border-t border-navy-100">
              <div>
                <div className="text-sm text-navy-400">Обучение</div>
                <div className="text-base font-medium mt-1">{period || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-navy-400">Дата экзамена</div>
                <div className="text-base font-medium mt-1">{examDate ? formatDate(examDate) : '—'}</div>
              </div>
              <div>
                <div className="text-sm text-navy-400">Бизнес-тренер</div>
                <div className="text-base font-medium mt-1">{trainer?.name || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-navy-400">Дата выдачи</div>
                <div className="text-base font-medium mt-1">{issueDate}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
