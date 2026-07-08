export function getCurrentStage(settings) {
  if (settings.examOpen) return 'exam'
  if (settings.groupsFormed) return 'learning'
  if (!settings.collectionOpen) return 'grouping'
  return 'form'
}

export function daysUntil(dateStr) {
  if (!dateStr) return null
  const end = new Date(dateStr + 'T23:59:59')
  const now = new Date()
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  return diff
}
