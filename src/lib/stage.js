// Единый "путь стажёра" для всей программы — приблизительная сводка по всем группам сразу,
// так как теперь групп может быть несколько и каждая на своём этапе.
export function getCurrentStage(groups, interns) {
  if (groups.length === 0) return 'form'

  const anyOpen = groups.some((g) => g.isOpen)
  if (anyOpen) return 'form'

  const anyGraded = interns.some((i) => i.examScore !== null && i.examScore !== undefined)
  if (anyGraded) return 'exam'

  const anyWithLessons = groups.some((g) => (g.lessons || []).length > 0)
  if (anyWithLessons) return 'learning'

  return 'grouping'
}

export function daysUntil(dateStr) {
  if (!dateStr) return null
  const end = new Date(dateStr + 'T23:59:59')
  const now = new Date()
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24))
}
