export const EXAM_QUESTION_COUNT = 10
export const PASS_THRESHOLD = 9

export function emptyExamAnswers() {
  return Array(EXAM_QUESTION_COUNT).fill(null)
}

// Старые данные (до перехода на поквестионную оценку) не имеют examAnswers — считаем, что экзамен ещё не начат.
export function getExamAnswers(intern) {
  return intern.examAnswers || emptyExamAnswers()
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

export function examStatus(answers) {
  if (!isExamGraded(answers)) return { label: 'Не оценён', cls: 'bg-navy-100 text-navy-500' }
  return examPassed(answers)
    ? { label: 'Сдан', cls: 'bg-success-50 text-success-600' }
    : { label: 'Не сдан', cls: 'bg-danger-50 text-danger-500' }
}
