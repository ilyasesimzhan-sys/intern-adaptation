const LABEL = { null: '—', true: 'Верно', false: 'Неверно' }

const BUTTON_CLASSES = {
  null: 'bg-white border-navy-200 text-navy-400 hover:border-navy-400',
  true: 'bg-success-500 border-success-500 text-white',
  false: 'bg-danger-500 border-danger-500 text-white',
}

const READONLY_CLASSES = {
  null: 'bg-navy-100 text-navy-400',
  true: 'bg-success-50 text-success-600',
  false: 'bg-danger-50 text-danger-500',
}

function stateKey(value) {
  return value === true ? 'true' : value === false ? 'false' : 'null'
}

// Список вопросов экзамена с ответом по каждому. С onToggle — ответы редактируемые (кабинет тренера),
// без onToggle — только для чтения (публичная страница прогресса стажёра). onQuestionChange даёт
// редактировать сам текст вопроса (тренер задаёт вопросы индивидуально для каждого стажёра).
export default function ExamAnswerList({ questions, answers, onToggle, onQuestionChange }) {
  return (
    <div className="divide-y divide-navy-50 border border-navy-100 rounded-lg overflow-hidden">
      {answers.map((a, idx) => {
        const key = stateKey(a)
        const questionText = questions?.[idx]?.trim()
        return (
          <div key={idx} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span className="text-navy-400 shrink-0">{idx + 1}.</span>
            {onQuestionChange ? (
              <input
                className="flex-1 min-w-0 border-none bg-transparent px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-navy-300 rounded"
                value={questions?.[idx] || ''}
                onChange={(e) => onQuestionChange(idx, e.target.value)}
                placeholder={`Текст вопроса ${idx + 1}`}
              />
            ) : (
              <div className="flex-1">
                {questionText ? questionText : <span className="text-navy-300 italic">Вопрос не задан</span>}
              </div>
            )}
            {onToggle ? (
              <button
                type="button"
                onClick={() => onToggle(idx)}
                className={'shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ' + BUTTON_CLASSES[key]}
              >
                {LABEL[key]}
              </button>
            ) : (
              <span className={'shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold ' + READONLY_CLASSES[key]}>
                {LABEL[key]}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
