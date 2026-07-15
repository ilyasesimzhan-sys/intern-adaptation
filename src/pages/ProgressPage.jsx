import { Link, useParams } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'
import { HOMEWORK_STATUSES } from '../lib/constants'
import {
  getExamAnswers,
  getRetakeAnswers,
  getExamQuestions,
  examCorrectCount,
  examPercent,
  getInternExamStatus,
  EXAM_QUESTION_COUNT,
} from '../lib/exam'
import ExamAnswerList from '../components/ExamAnswerList.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import { formatDate } from '../lib/date'

function homeworkLabel(value) {
  return HOMEWORK_STATUSES.find((h) => h.value === value)?.label || 'Не указано'
}

export default function ProgressPage() {
  const { internId } = useParams()
  const { data } = useStore()
  const intern = data.interns.find((i) => i.id === internId)
  const group = intern ? data.groups.find((g) => g.id === intern.groupId) : null

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

  const lessons = group?.lessons || []
  const status = getInternExamStatus(intern)

  const attended = lessons.filter((l) => intern.attendance[l.id]).length
  const attendancePct = lessons.length ? Math.round((attended / lessons.length) * 100) : null
  const homeworkDone = lessons.filter((l) => intern.homework[l.id] === 'done').length
  const homeworkPct = lessons.length ? Math.round((homeworkDone / lessons.length) * 100) : null

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm text-navy-500 hover:text-navy-700 dark:text-navy-400 dark:hover:text-navy-200">
            ← На главную
          </Link>
          <ThemeToggle />
        </div>

        {intern.withdrawn && (
          <div className="card border-danger-500/40 bg-danger-50/60 dark:bg-danger-500/5">
            <div className="flex items-center gap-2 text-danger-600 dark:text-danger-400 font-semibold">
              <span aria-hidden="true">⛔</span>
              <span>
                Стажёр отказался от обучения{intern.withdrawnAt ? ` · ${formatDate(intern.withdrawnAt)}` : ''}
              </span>
            </div>
            {intern.withdrawnReason && (
              <p className="text-sm text-navy-600 dark:text-navy-300 mt-1">Причина: {intern.withdrawnReason}</p>
            )}
          </div>
        )}

        <div className="card">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
            <h1 className="text-xl font-bold">
              {intern.lastName} {intern.firstName}
            </h1>
            <span className={'px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ' + status.cls}>
              {status.label}
            </span>
          </div>
          {(status.code === 'passed' || status.code === 'training') && (
            <Link to={`/certificate/${intern.id}`} className="btn-secondary text-sm mb-4 inline-flex">
              {status.code === 'passed' ? '🎓 Скачать сертификат' : '📄 Уведомление о результате'}
            </Link>
          )}
          <p className="text-navy-500 dark:text-navy-400 text-sm mb-4">
            {intern.department} · {intern.position} · {intern.city}
          </p>
          <div className="text-sm mb-4">
            Группа: <span className="font-medium">{group?.name || '—'}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-navy-100 dark:border-navy-800">
            <div>
              <div className="text-xl font-bold">
                {attendancePct === null ? '—' : `${attendancePct}%`}
                {lessons.length > 0 && (
                  <span className="text-sm font-normal text-navy-400 dark:text-navy-500">
                    {' '}
                    ({attended}/{lessons.length})
                  </span>
                )}
              </div>
              <div className="text-xs text-navy-500 dark:text-navy-400">Посещаемость</div>
            </div>
            <div>
              <div className="text-xl font-bold">
                {homeworkPct === null ? '—' : `${homeworkPct}%`}
                {lessons.length > 0 && (
                  <span className="text-sm font-normal text-navy-400 dark:text-navy-500">
                    {' '}
                    ({homeworkDone}/{lessons.length})
                  </span>
                )}
              </div>
              <div className="text-xs text-navy-500 dark:text-navy-400">ДЗ выполнено</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-3">Посещаемость и домашние задания</h2>
          {lessons.length === 0 ? (
            <p className="text-navy-400 dark:text-navy-500 text-sm">Занятия ещё не добавлены.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="text-left text-navy-500 dark:text-navy-400 border-b border-navy-100 dark:border-navy-700">
                    <th className="py-2 pr-3">Занятие</th>
                    <th className="py-2 pr-3">Присутствие</th>
                    <th className="py-2 pr-3">Домашнее задание</th>
                    <th className="py-2 pr-3">Комментарий тренера</th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((l) => (
                    <tr key={l.id} className="border-b border-navy-50 dark:border-navy-800 last:border-0">
                      <td className="py-2 pr-3">
                        {l.name}
                        {l.date ? ` · ${formatDate(l.date)}` : ''}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={
                            'px-2 py-1 rounded-full text-xs font-semibold ' +
                            (intern.attendance[l.id]
                              ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400'
                              : 'bg-danger-50 text-danger-500 dark:bg-danger-500/10 dark:text-danger-400')
                          }
                        >
                          {intern.attendance[l.id] ? 'Присутствовал' : 'Отсутствовал'}
                        </span>
                      </td>
                      <td className="py-2 pr-3">{homeworkLabel(intern.homework[l.id])}</td>
                      <td className="py-2 pr-3">{intern.comments?.[l.id] || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">Итоговый экзамен</h2>
          {(() => {
            const first = getExamAnswers(intern)
            const retake = getRetakeAnswers(intern)
            const status = getInternExamStatus(intern)
            const questions = getExamQuestions(intern)
            return (
              <>
                <p className="text-sm">
                  Итог: <span className="font-medium">{status.label}</span>
                </p>

                <div className="space-y-1.5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-navy-400 dark:text-navy-500">
                    Первая попытка · {examCorrectCount(first)}/{EXAM_QUESTION_COUNT} ({examPercent(first)}%)
                  </div>
                  <ExamAnswerList questions={questions} answers={first} />
                </div>

                {retake && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold uppercase tracking-wide text-navy-400 dark:text-navy-500">
                      Пересдача · {examCorrectCount(retake)}/{EXAM_QUESTION_COUNT} ({examPercent(retake)}%)
                    </div>
                    <ExamAnswerList questions={questions} answers={retake} />
                  </div>
                )}

                {intern.examFinalComment && (
                  <div className="text-sm bg-navy-50 dark:bg-navy-800 rounded-lg p-3">
                    <span className="font-medium">
                      {status.code === 'training' ? 'Рекомендации к доп. обучению: ' : 'Комментарий по завершению экзамена: '}
                    </span>
                    {intern.examFinalComment}
                  </div>
                )}
              </>
            )
          })()}
        </div>

        <div className="card">
          <h2 className="font-semibold mb-1">Правила экзамена</h2>
          <p className="text-sm whitespace-pre-wrap text-navy-600 dark:text-navy-300">{data.settings.examRules}</p>
        </div>
      </div>
    </div>
  )
}
