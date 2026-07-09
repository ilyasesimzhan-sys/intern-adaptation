import { Link, useParams } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'
import { HOMEWORK_STATUSES } from '../lib/constants'
import { getExamAnswers, examCorrectCount, examPercent, examStatus, EXAM_QUESTION_COUNT } from '../lib/exam'

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

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to="/" className="text-sm text-navy-500 hover:text-navy-700">
          ← На главную
        </Link>

        <div className="card">
          <h1 className="text-xl font-bold mb-1">
            {intern.lastName} {intern.firstName}
          </h1>
          <p className="text-navy-500 text-sm mb-4">
            {intern.department} · {intern.position} · {intern.city}
          </p>
          <div className="text-sm">
            Группа: <span className="font-medium">{group?.name || '—'}</span>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-3">Посещаемость и домашние задания</h2>
          {lessons.length === 0 ? (
            <p className="text-navy-400 text-sm">Занятия ещё не добавлены.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="text-left text-navy-500 border-b border-navy-100">
                    <th className="py-2 pr-3">Занятие</th>
                    <th className="py-2 pr-3">Присутствие</th>
                    <th className="py-2 pr-3">Домашнее задание</th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((l) => (
                    <tr key={l.id} className="border-b border-navy-50 last:border-0">
                      <td className="py-2 pr-3">
                        {l.name}
                        {l.date ? ` · ${l.date}` : ''}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={
                            'px-2 py-1 rounded-full text-xs font-semibold ' +
                            (intern.attendance[l.id]
                              ? 'bg-success-50 text-success-600'
                              : 'bg-danger-50 text-danger-500')
                          }
                        >
                          {intern.attendance[l.id] ? 'Присутствовал' : 'Отсутствовал'}
                        </span>
                      </td>
                      <td className="py-2 pr-3">{homeworkLabel(intern.homework[l.id])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {intern.comment && (
            <div className="mt-4 text-sm">
              <span className="font-medium">Комментарий тренера: </span>
              {intern.comment}
            </div>
          )}
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold">Итоговый экзамен</h2>
          {(() => {
            const answers = getExamAnswers(intern)
            const status = examStatus(answers)
            return (
              <>
                <p className="text-sm">
                  Статус: <span className="font-medium">{status.label}</span>{' '}
                  ({examCorrectCount(answers)}/{EXAM_QUESTION_COUNT} правильных, {examPercent(answers)}%)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {answers.map((a, idx) => (
                    <span
                      key={idx}
                      title={`Вопрос ${idx + 1}`}
                      className={
                        'w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-semibold ' +
                        (a === true
                          ? 'bg-success-500 border-success-500 text-white'
                          : a === false
                            ? 'bg-danger-500 border-danger-500 text-white'
                            : 'bg-white border-navy-200 text-navy-400')
                      }
                    >
                      {idx + 1}
                    </span>
                  ))}
                </div>
              </>
            )
          })()}
        </div>

        <div className="card">
          <h2 className="font-semibold mb-1">Правила экзамена</h2>
          <p className="text-sm whitespace-pre-wrap text-navy-600">{data.settings.examRules}</p>
        </div>
      </div>
    </div>
  )
}
