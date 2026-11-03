// В первый день обучения домашнего задания нет — первое занятие группы не учитывается в ДЗ.
// Первым считается самое раннее по дате занятие; если даты указаны не у всех — первое в списке.
export function firstLessonId(lessons) {
  if (!lessons || lessons.length === 0) return null
  if (lessons.every((l) => l.date)) {
    return lessons.reduce((first, l) => (l.date < first.date ? l : first)).id
  }
  return lessons[0].id
}

export function homeworkLessons(lessons) {
  const firstId = firstLessonId(lessons)
  return (lessons || []).filter((l) => l.id !== firstId)
}
