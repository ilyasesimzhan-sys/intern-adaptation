import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'
import { HOMEWORK_STATUSES } from '../lib/constants'
import {
  getExamAnswers,
  getRetakeAnswers,
  getExamQuestions,
  getRetakeQuestions,
  examCorrectCount,
  examPercent,
  getInternExamStatus,
  hasExamNotice,
  EXAM_QUESTION_COUNT,
} from '../lib/exam'
import ExamAnswerList from '../components/ExamAnswerList.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import logo from '../assets/logo.jpeg'
import { formatDate } from '../lib/date'
import { firstLessonId, homeworkLessons } from '../lib/lessons'
import { canManageGroup } from '../lib/roles'
import { msg, useI18n } from '../i18n/I18nContext.jsx'

function homeworkLabel(value) {
  return HOMEWORK_STATUSES.find((h) => h.value === value)?.label || msg('Не указано')
}

export default function ProgressPage() {
  const { t } = useI18n()
  const { internId } = useParams()
  const { data, currentTrainer, archiveLoaded, requestArchive } = useStore()
  const intern = data.interns.find((i) => i.id === internId)
  const group = intern ? data.groups.find((g) => g.id === intern.groupId) : null

  // Стажёр мог уже уйти в архив — тогда его данные подгружаются отдельно.
  useEffect(() => {
    if (!intern) requestArchive()
  }, [intern, requestArchive])

  if (!intern && !archiveLoaded) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-navy-400">{t('Загрузка...')}</div>
  }

  if (!intern) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">{t('Стажёр не найден')}</h1>
          <div className="flex justify-center items-center gap-3">
            <Link to="/" className="btn-secondary">
              {t('На главную')}
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </div>
    )
  }

  const lessons = group?.lessons || []
  const status = getInternExamStatus(intern)

  const attended = lessons.filter((l) => intern.attendance[l.id]).length
  const attendancePct = lessons.length ? Math.round((attended / lessons.length) * 100) : null
  const hwLessons = homeworkLessons(lessons)
  const noHomeworkId = firstLessonId(lessons)
  const homeworkDone = hwLessons.filter((l) => intern.homework[l.id] === 'done').length
  const homeworkPct = hwLessons.length ? Math.round((homeworkDone / hwLessons.length) * 100) : null

  return (
    <div className="relative min-h-screen py-8 px-4 bg-gradient-to-br from-navy-50 via-sky-50 to-violet-50 dark:from-navy-950 dark:via-navy-900 dark:to-navy-950">
      <img
        src={logo}
        alt=""
        aria-hidden="true"
        className="pointer-events-none select-none fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] max-w-none sm:w-[900px] opacity-90 dark:opacity-10 mix-blend-multiply saturate-[2] contrast-125"
      />
      <div className="relative max-w-5xl mx-auto space-y-6 [&_.card]:!bg-white/45 dark:[&_.card]:!bg-navy-900/70 [&_.card]:backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm text-navy-500 hover:text-navy-700 dark:text-navy-400 dark:hover:text-navy-200">
            {t('← На главную')}
          </Link>
          <ThemeToggle />
        </div>

        {intern.withdrawn && (
          <div className="card border-danger-500/40 bg-danger-50/60 dark:bg-danger-500/5">
            <div className="flex items-center gap-2 text-danger-600 dark:text-danger-400 font-semibold">
              <span aria-hidden="true">⛔</span>
              <span>
                {t('Стажёр отказался от обучения')}
                {intern.withdrawnAt ? ` · ${formatDate(intern.withdrawnAt)}` : ''}
              </span>
            </div>
            {intern.withdrawnReason && (
              <p className="text-sm text-navy-600 dark:text-navy-300 mt-1">
                {t('Причина:')} {intern.withdrawnReason}
              </p>
            )}
          </div>
        )}

        <div className="card">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
            <h1 className="text-xl font-bold">
              {intern.lastName} {intern.firstName}
            </h1>
            <span className={'px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap ' + status.cls}>
              {t(status.label)}
            </span>
          </div>
          {hasExamNotice(status) && canManageGroup(group, currentTrainer) && (
            <Link to={`/certificate/${intern.id}`} className="btn-secondary text-base mb-4 inline-flex">
              {status.code === 'passed' ? t('🎓 Уведомление о завершении АП') : t('📄 Уведомление о результате')}
            </Link>
          )}
          <p className="text-navy-500 dark:text-navy-400 text-base mb-4">
            {intern.department} · {intern.position} · {intern.city}
          </p>
          <div className="text-base mb-4">
            {t('Группа:')} <span className="font-medium">{group?.name || '—'}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-navy-100 dark:border-navy-800">
            <div>
              <div className="text-2xl font-bold">
                {attendancePct === null ? '—' : `${attendancePct}%`}
                {lessons.length > 0 && (
                  <span className="text-base font-normal text-navy-400 dark:text-navy-500">
                    {' '}
                    ({attended}/{lessons.length})
                  </span>
                )}
              </div>
              <div className="text-sm text-navy-500 dark:text-navy-400">{t('Посещаемость')}</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {homeworkPct === null ? '—' : `${homeworkPct}%`}
                {hwLessons.length > 0 && (
                  <span className="text-base font-normal text-navy-400 dark:text-navy-500">
                    {' '}
                    ({homeworkDone}/{hwLessons.length})
                  </span>
                )}
              </div>
              <div className="text-sm text-navy-500 dark:text-navy-400">{t('ДЗ выполнено')}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-3">{t('Посещаемость и домашние задания')}</h2>
          {lessons.length === 0 ? (
            <p className="text-navy-400 dark:text-navy-500 text-base">{t('Занятия ещё не добавлены.')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-base min-w-[560px]">
                <thead>
                  <tr className="text-left text-navy-500 dark:text-navy-400 border-b border-navy-100 dark:border-navy-700">
                    <th className="py-2.5 pr-4">{t('Занятие')}</th>
                    <th className="py-2.5 pr-4">{t('Присутствие')}</th>
                    <th className="py-2.5 pr-4">{t('Домашнее задание')}</th>
                    <th className="py-2.5 pr-4">{t('Комментарий тренера')}</th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((l) => (
                    <tr key={l.id} className="border-b border-navy-50 dark:border-navy-800 last:border-0">
                      <td className="py-2.5 pr-4">
                        {l.name}
                        {l.date ? ` · ${formatDate(l.date)}` : ''}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={
                            'px-2 py-1 rounded-full text-sm font-semibold ' +
                            (intern.attendance[l.id]
                              ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400'
                              : 'bg-danger-50 text-danger-500 dark:bg-danger-500/10 dark:text-danger-400')
                          }
                        >
                          {intern.attendance[l.id] ? t('Присутствовал') : t('Отсутствовал')}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        {l.id === noHomeworkId ? t('Не задаётся (первый день)') : t(homeworkLabel(intern.homework[l.id]))}
                      </td>
                      <td className="py-2.5 pr-4">{intern.comments?.[l.id] || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">{t('Итоговый экзамен')}</h2>
          {(() => {
            const first = getExamAnswers(intern)
            const retake = getRetakeAnswers(intern)
            const status = getInternExamStatus(intern)
            const questions = getExamQuestions(intern)
            return (
              <>
                <p className="text-base">
                  {t('Итог:')} <span className="font-medium">{t(status.label)}</span>
                </p>

                <div className="space-y-1.5">
                  <div className="text-sm font-semibold uppercase tracking-wide text-navy-400 dark:text-navy-500">
                    {t('Первая попытка')} · {examCorrectCount(first)}/{EXAM_QUESTION_COUNT} ({examPercent(first)}%)
                  </div>
                  <ExamAnswerList questions={questions} answers={first} />
                </div>

                {retake && (
                  <div className="space-y-1.5">
                    <div className="text-sm font-semibold uppercase tracking-wide text-navy-400 dark:text-navy-500">
                      {t('Пересдача')} · {examCorrectCount(retake)}/{EXAM_QUESTION_COUNT} ({examPercent(retake)}%)
                    </div>
                    <ExamAnswerList questions={getRetakeQuestions(intern)} answers={retake} />
                  </div>
                )}

                {intern.examFinalComment && (
                  <div className="text-base bg-navy-50 dark:bg-navy-800 rounded-lg p-3">
                    <span className="font-medium">
                      {status.code === 'training'
                        ? t('Рекомендации к доп. обучению:')
                        : t('Комментарий по завершению экзамена:')}{' '}
                    </span>
                    {intern.examFinalComment}
                  </div>
                )}
              </>
            )
          })()}
        </div>

        <div className="card">
          <h2 className="font-semibold mb-1">{t('Правила экзамена')}</h2>
          <p className="text-base whitespace-pre-wrap text-navy-600 dark:text-navy-300">{data.settings.examRules}</p>
        </div>
      </div>
    </div>
  )
}
