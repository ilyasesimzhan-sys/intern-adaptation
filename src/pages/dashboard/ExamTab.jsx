import { useState } from 'react'
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

  const myGroups = activeVisibleGroups(data.groups, currentTrainer).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  )

  function patchSettings(patch) {
    update((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
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
      <p className="text-sm text-navy-500">
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
        <p className="text-navy-400">Сначала создайте группу во вкладке «Настройки сбора».</p>
      ) : (
        myGroups.map((group) => {
          const interns = allInterns.filter((i) => i.groupId === group.id)
          const statuses = interns.map((i) => getInternExamStatus(i))
          const passedCount = statuses.filter((s) => s.code === 'passed').length
          const droppedCount = statuses.filter((s) => s.code === 'ended' || s.code === 'training').length
          const allResolved = interns.length > 0 && statuses.every((s) => isInternResolved(s))

          return (
            <div key={group.id} className="card space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">{group.name}</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => downloadGroupReport(group, interns, trainers)}
                    disabled={interns.length === 0}
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
                  Сдали: <span className="font-semibold text-success-600">{passedCount}</span>
                </div>
                <div>
                  Не прошли программу: <span className="font-semibold text-danger-500">{droppedCount}</span>
                </div>
                <div>
                  В процессе:{' '}
                  <span className="font-semibold text-navy-700">
                    {interns.length - passedCount - droppedCount}
                  </span>
                </div>
              </div>
              {!allResolved && interns.length > 0 && (
                <p className="text-xs text-warning-600">
                  В архив можно отправить, только когда по каждому стажёру принято итоговое решение (сдал, экзамен
                  завершён или направлен на доп. обучение).
                </p>
              )}

              {interns.length === 0 ? (
                <p className="text-navy-400 text-sm">В группе пока нет стажёров.</p>
              ) : (
                <div className="space-y-3">
                  {interns.map((i, idx) => {
                    const status = statuses[idx]
                    const questions = getExamQuestions(i)
                    const first = getExamAnswers(i)
                    const retake = getRetakeAnswers(i)
                    const canEnd = status.code === 'failed' || status.code === 'retake_failed'

                    return (
                      <div key={i.id} className="border border-navy-100 rounded-xl p-3 sm:p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium">
                            {i.lastName} {i.firstName}
                          </div>
                          <span className={'px-2 py-1 rounded-full text-xs font-semibold ' + status.cls}>
                            {status.label}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                            Первая попытка · {examCorrectCount(first)}/{EXAM_QUESTION_COUNT} ({examPercent(first)}%)
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
                            <div className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                              Пересдача · {examCorrectCount(retake)}/{EXAM_QUESTION_COUNT} ({examPercent(retake)}%)
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
                          <div className="text-sm bg-navy-50 rounded-lg p-3">
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
                          <div className="space-y-2 border border-danger-500/30 bg-danger-50 rounded-lg p-3">
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
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
