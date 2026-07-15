import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../store/StoreContext.jsx'
import { activeVisibleGroups } from '../../lib/roles'
import {
  EXAM_QUESTION_COUNT,
  emptyExamAnswers,
  getExamAnswers,
  getRetakeAnswers,
  getExamQuestions,
  examCorrectCount,
  examPercent,
  getInternExamStatus,
  isInternResolved,
} from '../../lib/exam'
import { downloadGroupReport } from '../../lib/examReport'
import { filterInternsBySearch } from '../../lib/internSearch'
import ExamAnswerList from '../../components/ExamAnswerList.jsx'

function nextAnswerState(value) {
  if (value === null || value === undefined) return true
  if (value === true) return false
  return null
}

export default function ExamTab() {
  const { data, update, currentTrainer } = useStore()
  const { settings, interns: allInterns, trainers } = data
  const [endingId, setEndingId] = useState(null)
  const [endComment, setEndComment] = useState('')
  const [searchByGroup, setSearchByGroup] = useState({})

  const myGroups = activeVisibleGroups(data.groups, currentTrainer).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  )

  function patchSettings(patch) {
    update((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  }

  function patchInternField(internId, field, value) {
    update((prev) => ({
      ...prev,
      interns: prev.interns.map((i) => (i.id === internId ? { ...i, [field]: value } : i)),
    }))
  }

  function patchInternQuestion(internId, questionIdx, text) {
    update((prev) => ({
      ...prev,
      interns: prev.interns.map((i) => {
        if (i.id !== internId) return i
        const nextQuestions = getExamQuestions(i).slice()
        nextQuestions[questionIdx] = text
        return { ...i, examQuestions: nextQuestions }
      }),
    }))
  }

  function toggleAnswer(internId, field, questionIdx) {
    update((prev) => ({
      ...prev,
      interns: prev.interns.map((i) => {
        if (i.id !== internId) return i
        const current = field === 'examAnswers' ? getExamAnswers(i) : i.examRetakeAnswers || emptyExamAnswers()
        const nextAnswers = current.slice()
        nextAnswers[questionIdx] = nextAnswerState(current[questionIdx])
        return { ...i, [field]: nextAnswers }
      }),
    }))
  }

  function sendToRetake(internId) {
    update((prev) => ({
      ...prev,
      interns: prev.interns.map((i) =>
        i.id === internId ? { ...i, examRetakeAnswers: emptyExamAnswers(), examFinalOutcome: null } : i,
      ),
    }))
  }

  function setFinalOutcome(internId, outcome, comment) {
    update((prev) => ({
      ...prev,
      interns: prev.interns.map((i) =>
        i.id === internId ? { ...i, examFinalOutcome: outcome, examFinalComment: comment ?? i.examFinalComment ?? '' } : i,
      ),
    }))
  }

  function startEnding(internId) {
    setEndingId(internId)
    setEndComment('')
  }

  function cancelEnding() {
    setEndingId(null)
    setEndComment('')
  }

  function confirmEnding(internId) {
    if (!endComment.trim()) return
    setFinalOutcome(internId, 'ended', endComment.trim())
    setEndingId(null)
    setEndComment('')
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
      <p className="text-sm text-navy-500 dark:text-navy-400">
        Вопросы задаются отдельно для каждого стажёра — впишите их прямо в списке под именем стажёра. Текст виден
        стажёру на публичной странице прогресса вместе с результатом по каждому вопросу.
      </p>

      <div className="card space-y-2">
        <h2 className="font-semibold">Правила экзамена</h2>
        <textarea
          className="field-input min-h-[160px] font-mono text-sm"
          value={settings.examRules}
          onChange={(e) => patchSettings({ examRules: e.target.value })}
        />
      </div>

      {myGroups.length === 0 ? (
        <p className="text-navy-400 dark:text-navy-500">Сначала создайте группу во вкладке «Настройки сбора».</p>
      ) : (
        myGroups.map((group) => {
          const groupInterns = allInterns.filter((i) => i.groupId === group.id)
          const interns = groupInterns.filter((i) => !i.withdrawn)
          const statuses = interns.map((i) => getInternExamStatus(i))
          const passedCount = statuses.filter((s) => s.code === 'passed').length
          const droppedCount = statuses.filter((s) => s.code === 'ended' || s.code === 'training').length
          const allResolved = interns.length > 0 && statuses.every((s) => isInternResolved(s))
          const groupSearch = searchByGroup[group.id] || ''
          const visibleInterns = filterInternsBySearch(interns, groupSearch)

          return (
            <div key={group.id} className="card space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">{group.name}</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => downloadGroupReport(group, groupInterns, trainers)}
                    disabled={groupInterns.length === 0}
                    className="btn-secondary text-sm"
                  >
                    Выгрузить отчёт
                  </button>
                  <button
                    onClick={() => archiveGroup(group.id)}
                    disabled={!allResolved}
                    title={allResolved ? '' : 'Доступно, когда по каждому стажёру принято итоговое решение'}
                    className="btn-secondary text-sm"
                  >
                    Отправить в архив
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  Всего стажёров: <span className="font-semibold">{interns.length}</span>
                </div>
                <div>
                  Сдали: <span className="font-semibold text-success-600 dark:text-success-400">{passedCount}</span>
                </div>
                <div>
                  Не прошли программу:{' '}
                  <span className="font-semibold text-danger-500 dark:text-danger-400">{droppedCount}</span>
                </div>
                <div>
                  В процессе:{' '}
                  <span className="font-semibold text-navy-700 dark:text-navy-200">
                    {interns.length - passedCount - droppedCount}
                  </span>
                </div>
                {groupInterns.length - interns.length > 0 && (
                  <div>
                    Отказались:{' '}
                    <span className="font-semibold text-navy-400 dark:text-navy-500">
                      {groupInterns.length - interns.length}
                    </span>
                  </div>
                )}
              </div>
              {!allResolved && interns.length > 0 && (
                <p className="text-xs text-warning-600 dark:text-warning-500">
                  В архив можно отправить, только когда по каждому стажёру принято итоговое решение (сдал, экзамен
                  завершён или направлен на доп. обучение).
                </p>
              )}

              {interns.length === 0 ? (
                <p className="text-navy-400 dark:text-navy-500 text-sm">В группе пока нет стажёров.</p>
              ) : (
                <>
                  <input
                    className="field-input max-w-xs"
                    placeholder="Поиск по ФИО, email, телефону..."
                    value={groupSearch}
                    onChange={(e) => setSearchByGroup((prev) => ({ ...prev, [group.id]: e.target.value }))}
                  />
                  {visibleInterns.length === 0 && (
                    <p className="text-navy-400 dark:text-navy-500 text-sm">Совпадений не найдено.</p>
                  )}
                <div className="space-y-3">
                  {visibleInterns.map((i) => {
                    const status = getInternExamStatus(i)
                    const questions = getExamQuestions(i)
                    const first = getExamAnswers(i)
                    const retake = getRetakeAnswers(i)
                    const canEnd = status.code === 'failed' || status.code === 'retake_failed'

                    return (
                      <div
                        key={i.id}
                        className="border border-navy-100 dark:border-navy-700 rounded-xl p-3 sm:p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium">
                            {i.lastName} {i.firstName}
                          </div>
                          <span className={'px-2 py-1 rounded-full text-xs font-semibold ' + status.cls}>
                            {status.label}
                          </span>
                        </div>

                        {(status.code === 'passed' || status.code === 'training') && (
                          <Link to={`/certificate/${i.id}`} target="_blank" rel="noreferrer" className="btn-secondary text-xs px-3 py-1.5 inline-flex">
                            {status.code === 'passed' ? '🎓 Сертификат' : '📄 Уведомление'}
                          </Link>
                        )}

                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-navy-400 dark:text-navy-500">
                            <span>
                              Первая попытка · {examCorrectCount(first)}/{EXAM_QUESTION_COUNT} ({examPercent(first)}%)
                            </span>
                            <input
                              type="date"
                              className="field-input text-xs py-0.5 px-1.5 normal-case font-normal tracking-normal w-auto"
                              value={i.examDate || ''}
                              onChange={(e) => patchInternField(i.id, 'examDate', e.target.value)}
                            />
                          </div>
                          <ExamAnswerList
                            questions={questions}
                            answers={first}
                            onToggle={(qIdx) => toggleAnswer(i.id, 'examAnswers', qIdx)}
                            onQuestionChange={(qIdx, text) => patchInternQuestion(i.id, qIdx, text)}
                          />
                        </div>

                        {retake && (
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-navy-400 dark:text-navy-500">
                              <span>
                                Пересдача · {examCorrectCount(retake)}/{EXAM_QUESTION_COUNT} ({examPercent(retake)}%)
                              </span>
                              <input
                                type="date"
                                className="field-input text-xs py-0.5 px-1.5 normal-case font-normal tracking-normal w-auto"
                                value={i.examRetakeDate || ''}
                                onChange={(e) => patchInternField(i.id, 'examRetakeDate', e.target.value)}
                              />
                            </div>
                            <ExamAnswerList
                              questions={questions}
                              answers={retake}
                              onToggle={(qIdx) => toggleAnswer(i.id, 'examRetakeAnswers', qIdx)}
                              onQuestionChange={(qIdx, text) => patchInternQuestion(i.id, qIdx, text)}
                            />
                          </div>
                        )}

                        {i.examFinalComment && status.code === 'ended' && (
                          <div className="text-sm bg-navy-50 dark:bg-navy-800 rounded-lg p-3">
                            <span className="font-medium">Комментарий завершения: </span>
                            {i.examFinalComment}
                          </div>
                        )}

                        {status.code === 'failed' && (
                          <button onClick={() => sendToRetake(i.id)} className="btn-secondary text-sm">
                            Отправить на пересдачу
                          </button>
                        )}

                        {status.code === 'retake_failed' && (
                          <button
                            onClick={() => setFinalOutcome(i.id, 'training')}
                            className="btn-secondary text-sm"
                          >
                            Направить на доп. обучение
                          </button>
                        )}

                        {canEnd && endingId !== i.id && (
                          <button onClick={() => startEnding(i.id)} className="btn-danger text-sm">
                            Завершение экзамена
                          </button>
                        )}

                        {endingId === i.id && (
                          <div className="space-y-2 border border-danger-500/30 bg-danger-50 dark:bg-danger-500/10 rounded-lg p-3">
                            <label className="field-label">
                              Комментарий к завершению экзамена (обязательно, будет виден стажёру и всем в
                              прогрессе)
                            </label>
                            <textarea
                              className="field-input min-h-[80px]"
                              value={endComment}
                              onChange={(e) => setEndComment(e.target.value)}
                              placeholder="Укажите причину завершения экзамена"
                              autoFocus
                            />
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => confirmEnding(i.id)}
                                disabled={!endComment.trim()}
                                className="btn-danger text-sm"
                              >
                                Подтвердить завершение
                              </button>
                              <button onClick={cancelEnding} className="btn-secondary text-sm">
                                Отмена
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                </>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
