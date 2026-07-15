// Даты хранятся в ISO-формате (yyyy-mm-dd или полный ISO datetime), а отображаются в привычном для пользователя виде.
export function formatDate(value) {
  if (!value) return ''
  const [year, month, day] = value.slice(0, 10).split('-')
  if (!year || !month || !day) return value
  return `${day}.${month}.${year}`
}

// Период обучения группы — от даты первого занятия до даты последнего.
export function trainingPeriod(lessons) {
  const dates = (lessons || []).map((l) => l.date).filter(Boolean).sort()
  if (dates.length === 0) return ''
  const first = dates[0]
  const last = dates[dates.length - 1]
  return first === last ? formatDate(first) : `${formatDate(first)} — ${formatDate(last)}`
}
