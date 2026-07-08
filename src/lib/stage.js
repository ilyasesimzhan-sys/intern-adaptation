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
