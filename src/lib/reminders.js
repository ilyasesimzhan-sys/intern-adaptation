function daysSince(dateStr) {
  if (!dateStr) return null
  const then = new Date(dateStr.slice(0, 10))
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  then.setHours(0, 0, 0, 0)
  return Math.round((now - then) / 86400000)
}

const STALE_LESSONS_DAYS = 7
const NO_LESSONS_GRACE_DAYS = 3

// Напоминания тренеру на основе уже имеющихся данных — без новых полей в схеме.
export function computeReminders(groups) {
  const reminders = []

  groups.forEach((g) => {
    if (g.isOpen && g.endDate) {
      const overdue = daysSince(g.endDate)
      if (overdue !== null && overdue > 0) {
        reminders.push({
          id: `${g.id}-overdue-open`,
          groupId: g.id,
          text: `«${g.name}» — дата закрытия приёма уже прошла (${overdue} дн. назад), но группа всё ещё открыта для анкет.`,
        })
      }
      return
    }

    if (g.isOpen) return

    const lessons = g.lessons || []
    if (lessons.length === 0) {
      const sinceClose = daysSince(g.endDate)
      if (sinceClose !== null && sinceClose > NO_LESSONS_GRACE_DAYS) {
        reminders.push({
          id: `${g.id}-no-lessons`,
          groupId: g.id,
          text: `«${g.name}» — приём закрыт ${sinceClose} дн. назад, но ни одного занятия ещё не добавлено.`,
        })
      }
      return
    }

    const dates = lessons.map((l) => l.date).filter(Boolean).sort()
    const lastDate = dates[dates.length - 1]
    const gap = daysSince(lastDate)
    if (lastDate && gap !== null && gap > STALE_LESSONS_DAYS) {
      reminders.push({
        id: `${g.id}-stale`,
        groupId: g.id,
        text: `«${g.name}» — последнее занятие отмечено ${gap} дн. назад. Стоит обновить посещаемость.`,
      })
    }
  })

  return reminders
}
