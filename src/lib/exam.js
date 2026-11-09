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

// У пересдачи свой список вопросов: неверно отвеченные повторяются, верно отвеченные заменяются новыми.
// Старые пересдачи (до появления банка вопросов) своего списка не имеют — у них вопросы те же, что в первой попытке.
export function getRetakeQuestions(intern) {
  return intern.examRetakeQuestions || getExamQuestions(intern)
}

export function getActiveQuestions(intern) {
  return getRetakeAnswers(intern) ? getRetakeQuestions(intern) : getExamQuestions(intern)
}

// Общий банк вопросов (загружается из Excel во вкладке «Итоговый экзамен»).
export function getQuestionBank(settings) {
  return settings?.examQuestionBank || []
}

function shuffle(list) {
  const arr = list.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Случайные EXAM_QUESTION_COUNT разных вопросов из банка для первой попытки.
export function drawExamQuestions(bank) {
  return shuffle(bank).slice(0, EXAM_QUESTION_COUNT)
}

// Вопросы пересдачи: на неверно отвеченные — те же вопросы, на верно отвеченные — новые из банка,
// которых у стажёра ещё не было. Если новых не хватает, вопрос остаётся прежним.
export function drawRetakeQuestions(intern, bank) {
  const questions = getExamQuestions(intern)
  const answers = getExamAnswers(intern)
  const used = new Set(questions.map((q) => q.trim()).filter(Boolean))
  const fresh = shuffle(bank.filter((q) => !used.has(q.trim())))
  return questions.map((q, idx) => (answers[idx] === true && fresh.length > 0 ? fresh.pop() : q))
}

export function getRetakeAnswers(intern) {
  return intern.examRetakeAnswers || null
}

export function getExamDate(intern) {
  return intern.examDate || ''
}

export function getRetakeDate(intern) {
  return intern.examRetakeDate || ''
}

// Дата попытки, которая сейчас определяет итог — та же логика выбора, что и у getActiveAnswers.
export function getActiveExamDate(intern) {
  return getRetakeAnswers(intern) ? getRetakeDate(intern) : getExamDate(intern)
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

// Темы вопросов, на которые стажёр ответил неверно в текущей (активной) попытке — основа рекомендаций к доп. обучению.
export function getWeakTopics(intern) {
  const questions = getActiveQuestions(intern)
  const answers = getActiveAnswers(intern)
  return questions.filter((q, idx) => answers[idx] === false && q.trim())
}

const STATUS = {
  ungraded: {
    code: 'ungraded',
    label: 'Не оценён',
    cls: 'bg-navy-100 text-navy-500 dark:bg-navy-800 dark:text-navy-400',
  },
  passed: {
    code: 'passed',
    label: 'Сдан',
    cls: 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400',
  },
  passedRetake: {
    code: 'passed',
    label: 'Сдан (пересдача)',
    cls: 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400',
  },
  failed: {
    code: 'failed',
    label: 'Не сдан',
    cls: 'bg-danger-50 text-danger-500 dark:bg-danger-500/10 dark:text-danger-400',
  },
  retakePending: {
    code: 'retake_pending',
    label: 'Идёт пересдача',
    cls: 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-500',
  },
  retakeFailed: {
    code: 'retake_failed',
    label: 'Пересдача не сдана',
    cls: 'bg-danger-50 text-danger-500 dark:bg-danger-500/10 dark:text-danger-400',
  },
  ended: {
    code: 'ended',
    label: 'Экзамен завершён',
    cls: 'bg-danger-50 text-danger-500 dark:bg-danger-500/10 dark:text-danger-400',
  },
  training: {
    code: 'training',
    label: 'Направлен на доп. обучение',
    cls: 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-500',
  },
}

// Полный статус стажёра по экзамену с учётом первой попытки, пересдачи и финального решения тренера.
// examFinalOutcome === 'ended' может быть выставлен и сразу после провала первой попытки (без пересдачи),
// и после провала пересдачи — в обоих случаях это финальное решение тренера с обязательным комментарием.
export function getInternExamStatus(intern) {
  const first = getExamAnswers(intern)
  const retake = getRetakeAnswers(intern)

  if (!retake) {
    if (!isExamGraded(first)) return STATUS.ungraded
    if (examPassed(first)) return STATUS.passed
    if (intern.examFinalOutcome === 'ended') return STATUS.ended
    return STATUS.failed
  }

  if (!isExamGraded(retake)) return STATUS.retakePending
  if (examPassed(retake)) return STATUS.passedRetake

  if (intern.examFinalOutcome === 'ended') return STATUS.ended
  if (intern.examFinalOutcome === 'training') return STATUS.training
  return STATUS.retakeFailed
}

// Уведомление (PDF) выдаётся, когда экзамен оценён: о завершении — если сдал, о результате с темами
// неверных ответов — если не сдал (в том числе до решения о пересдаче).
export function hasExamNotice(status) {
  return ['passed', 'training', 'ended', 'failed', 'retake_failed'].includes(status.code)
}

// true, если по стажёру больше не нужно никаких действий (сдал, завершён или направлен на доп. обучение).
export function isInternResolved(status) {
  return status.code === 'passed' || status.code === 'ended' || status.code === 'training'
}
