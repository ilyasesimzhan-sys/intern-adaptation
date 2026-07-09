export const EXAM_QUESTION_COUNT = 10
export const PASS_THRESHOLD = 9

export function emptyExamAnswers() {
  return Array(EXAM_QUESTION_COUNT).fill(null)
}

export function emptyExamQuestions() {
  return Array(EXAM_QUESTION_COUNT).fill('')
}

// Старые данные (до перехода на поквестионную оценку) не имеют examAnswers — считаем, что экзамен ещё не начат.
export function getExamAnswers(intern) {
  return intern.examAnswers || emptyExamAnswers()
}

// Вопросы задаются тренером отдельно для каждого стажёра.
export function getExamQuestions(intern) {
  return intern.examQuestions || emptyExamQuestions()
}

export function getRetakeAnswers(intern) {
  return intern.examRetakeAnswers || null
}

// Ответы, которые сейчас определяют итог: пересдача, если она уже назначена, иначе первая попытка.
export function getActiveAnswers(intern) {
  return getRetakeAnswers(intern) || getExamAnswers(intern)
}

export function examStarted(answers) {
  return answers.some((a) => a === true || a === false)
}

export function isExamGraded(answers) {
  return answers.length === EXAM_QUESTION_COUNT && answers.every((a) => a === true || a === false)
}

export function examCorrectCount(answers) {
  return answers.filter((a) => a === true).length
}

export function examPercent(answers) {
  return Math.round((examCorrectCount(answers) / EXAM_QUESTION_COUNT) * 100)
}

export function examPassed(answers) {
  return examCorrectCount(answers) >= PASS_THRESHOLD
}

const STATUS = {
  ungraded: { code: 'ungraded', label: 'Не оценён', cls: 'bg-navy-100 text-navy-500' },
  passed: { code: 'passed', label: 'Сдан', cls: 'bg-success-50 text-success-600' },
  passedRetake: { code: 'passed', label: 'Сдан (пересдача)', cls: 'bg-success-50 text-success-600' },
  failed: { code: 'failed', label: 'Не сдан', cls: 'bg-danger-50 text-danger-500' },
  retakePending: { code: 'retake_pending', label: 'Идёт пересдача', cls: 'bg-warning-50 text-warning-600' },
  retakeFailed: { code: 'retake_failed', label: 'Пересдача не сдана', cls: 'bg-danger-50 text-danger-500' },
  rejected: { code: 'rejected', label: 'Отказано', cls: 'bg-danger-50 text-danger-500' },
  training: { code: 'training', label: 'Направлен на доп. обучение', cls: 'bg-warning-50 text-warning-600' },
}

// Полный статус стажёра по экзамену с учётом первой попытки, пересдачи и финального решения тренера.
export function getInternExamStatus(intern) {
  const first = getExamAnswers(intern)
  const retake = getRetakeAnswers(intern)

  if (!retake) {
    if (!isExamGraded(first)) return STATUS.ungraded
    return examPassed(first) ? STATUS.passed : STATUS.failed
  }

  if (!isExamGraded(retake)) return STATUS.retakePending
  if (examPassed(retake)) return STATUS.passedRetake

  if (intern.examFinalOutcome === 'rejected') return STATUS.rejected
  if (intern.examFinalOutcome === 'training') return STATUS.training
  return STATUS.retakeFailed
}

// true, если по стажёру больше не нужно никаких действий (сдал, отказан или направлен на доп. обучение).
export function isInternResolved(status) {
  return status.code === 'passed' || status.code === 'rejected' || status.code === 'training'
}
