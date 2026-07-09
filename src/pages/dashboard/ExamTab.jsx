import { useStore } from '../../store/StoreContext.jsx'
import { activeVisibleGroups } from '../../lib/roles'
import {
  EXAM_QUESTION_COUNT,
  emptyExamAnswers,
  getExamAnswers,
  getRetakeAnswers,
  examCorrectCount,
  examPercent,
  getInternExamStatus,
  isInternResolved,
} from '../../lib/exam'
import ExamAnswerList from '../../components/ExamAnswerList.jsx'

function nextAnswerState(value) {
  if (value === null || value === undefined) return true
  if (value === true) return false
  return null
}

export default function ExamTab() {
  const { data, update, currentTrainer } = useStore()
  const { settings, interns: allInterns } = data
  const questions = settings.examQuestions || emptyExamAnswers().map(() => '')

  const myGroups = activeVisibleGroups(data.groups, currentTrainer).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  )

  function patchSettings(patch) {
    update((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  }

  function patchQuestion(idx, text) {
    const next = questions.slice()
    next[idx] = text
    patchSettings({ examQuestions: next })
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

  function setFinalOutcome(internId, outcome) {
    update((prev) => ({
      ...prev,
      interns: prev.interns.map((i) => (i.id === internId ? { ...i, examFinalOutcome: outcome } : i)),
    }))
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

      <div className="card space-y-2">
        <h2 className="font-semibold">Правила экзамена</h2>
        <textarea
          className="field-input min-h-[160px] font-mono text-sm"
          value={settings.examRules}
          onChange={(e) => patchSettings({ examRules: e.target.value })}
        />
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Вопросы экзамена</h2>
        <p className="text-sm text-navy-500">
          Текст всех 10 вопросов виден стажёру на публичной странице прогресса вместе с результатом по каждому
          вопросу.
        </p>
        <div className="space-y-2">
          {questions.map((q, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-sm text-navy-400 w-5 shrink-0 text-right">{idx + 1}.</span>
              <input
                className="field-input"
                value={q}
                onChange={(e) => patchQuestion(idx, e.target.value)}
                placeholder={`Текст вопроса ${idx + 1}`}
              />
            </div>
          ))}
        </div>
      </div>

      {myGroups.length === 0 ? (
        <p className="text-navy-400">Сначала создайте группу во вкладке «Настройки сбора».</p>
      ) : (
        myGroups.map((group) => {
          const interns = allInterns.filter((i) => i.groupId === group.id)
          const statuses = interns.map((i) => getInternExamStatus(i))
          const passedCount = statuses.filter((s) => s.code === 'passed').length
          const droppedCount = statuses.filter((s) => s.code === 'rejected' || s.code === 'training').length
          const allResolved = interns.length > 0 && statuses.every((s) => isInternResolved(s))

          return (
            <div key={group.id} className="card space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">{group.name}</h2>
                <button
                  onClick={() => archiveGroup(group.id)}
                  disabled={!allResolved}
                  title={allResolved ? '' : 'Доступно, когда по каждому стажёру принято итоговое решение'}
                  className="btn-secondary text-sm"
                >
                  Отправить в архив
                </button>
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
                  В архив можно отправить, только когда по каждому стажёру принято итоговое решение (сдал, отказан
                  или направлен на доп. обучение).
                </p>
              )}

              {interns.length === 0 ? (
                <p className="text-navy-400 text-sm">В группе пока нет стажёров.</p>
              ) : (
                <div className="space-y-3">
                  {interns.map((i, idx) => {
                    const status = statuses[idx]
                    const first = getExamAnswers(i)
                    const retake = getRetakeAnswers(i)

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
                            />
                          </div>
                        )}

                        {status.code === 'failed' && (
                          <button onClick={() => sendToRetake(i.id)} className="btn-secondary text-sm">
                            Отправить на пересдачу
                          </button>
                        )}

                        {status.code === 'retake_failed' && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setFinalOutcome(i.id, 'training')}
                              className="btn-secondary text-sm"
                            >
                              Направить на доп. обучение
                            </button>
                            <button onClick={() => setFinalOutcome(i.id, 'rejected')} className="btn-danger text-sm">
                              Отказать
                            </button>
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
