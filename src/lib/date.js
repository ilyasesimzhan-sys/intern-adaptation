// Даты хранятся в ISO-формате (yyyy-mm-dd или полный ISO datetime), а отображаются в привычном для пользователя виде.
export function formatDate(value) {
  if (!value) return ''
  const [year, month, day] = value.slice(0, 10).split('-')
  if (!year || !month || !day) return value
  return `${day}.${month}.${year}`
}
