import { useStore } from '../../store/StoreContext.jsx'
import { activeVisibleGroups } from '../../lib/roles'
import {
  EXAM_QUESTION_COUNT,
  getExamAnswers,
  isExamGraded,
  examCorrectCount,
  examPercent,
  examPassed,
  examStatus,
} from '../../lib/exam'

const QUESTION_STATE_CLASSES = {
  null: 'bg-white border-navy-200 text-navy-400 hover:border-navy-400',
  true: 'bg-success-500 border-success-500 text-white',
  false: 'bg-danger-500 border-danger-500 text-white',
}

function nextAnswerState(value) {
  if (value === null || value === undefined) return true
  if (value === true) return false
  return null
}

export default function ExamTab() {
  const { data, update, currentTrainer } = useStore()
  const { settings, interns: allInterns } = data

  const myGroups = activeVisibleGroups(data.groups, currentTrainer).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  )

  function patchSettings(patch) {
    update((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  }

  function toggleAnswer(internId, questionIdx) {
    update((prev) => ({
      ...prev,
      interns: prev.interns.map((i) => {
        if (i.id !== internId) return i
        const answers = getExamAnswers(i)
        const nextAnswers = answers.slice()
        nextAnswers[questionIdx] = nextAnswerState(answers[questionIdx])
        return { ...i, examAnswers: nextAnswers }
      }),
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

      {myGroups.length === 0 ? (
        <p className="text-navy-400">Сначала создайте группу во вкладке «Настройки сбора».</p>
      ) : (
        myGroups.map((group) => {
          const interns = allInterns.filter((i) => i.groupId === group.id)
          const answersByIntern = interns.map((i) => getExamAnswers(i))
          const graded = interns.filter((_, idx) => isExamGraded(answersByIntern[idx]))
          const passed = graded.filter((i) => examPassed(getExamAnswers(i)))
          const allGraded = interns.length > 0 && graded.length === interns.length

          return (
            <div key={group.id} className="card space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">{group.name}</h2>
                <button
                  onClick={() => archiveGroup(group.id)}
                  disabled={!allGraded}
                  title={allGraded ? '' : 'Доступно, когда всем стажёрам группы отмечены все 10 вопросов'}
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
                  Оценено: <span className="font-semibold">{graded.length}</span>
                </div>
                <div>
                  Прошли порог (9/10): <span className="font-semibold text-success-600">{passed.length}</span>
                </div>
              </div>
              {!allGraded && interns.length > 0 && (
                <p className="text-xs text-warning-600">
                  В архив можно отправить, только когда всем стажёрам группы отмечены ответы на все 10 вопросов.
                </p>
              )}

              {interns.length === 0 ? (
                <p className="text-navy-400 text-sm">В группе пока нет стажёров.</p>
              ) : (
                <div className="space-y-3">
                  {interns.map((i) => {
                    const answers = getExamAnswers(i)
                    const status = examStatus(answers)
                    const correct = examCorrectCount(answers)
                    const percent = examPercent(answers)
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

                        <div className="flex flex-wrap gap-1.5">
                          {answers.map((a, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => toggleAnswer(i.id, idx)}
                              title={`Вопрос ${idx + 1}: ${a === true ? 'правильно' : a === false ? 'неправильно' : 'не отмечено'}`}
                              className={
                                'w-8 h-8 rounded-lg border text-xs font-semibold transition-colors ' +
                                QUESTION_STATE_CLASSES[a === true ? 'true' : a === false ? 'false' : 'null']
                              }
                            >
                              {idx + 1}
                            </button>
                          ))}
                        </div>

                        <div className="text-sm text-navy-500">
                          Правильных ответов:{' '}
                          <span className="font-semibold text-navy-700">
                            {correct}/{EXAM_QUESTION_COUNT}
                          </span>{' '}
                          ({percent}%)
                        </div>
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
