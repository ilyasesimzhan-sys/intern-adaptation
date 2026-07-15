import { getInternExamStatus } from './exam'

// Общая сводная статистика по группе — используется и в кабинете тренера, и на главной странице.
// Стажёры, отказавшиеся от обучения, не учитываются в процентах и статусе экзамена.
export function computeGroupStats(group, interns) {
  const active = interns.filter((i) => !i.withdrawn)
  const withdrawnCount = interns.length - active.length
  const lessons = group.lessons || []
  let present = 0
  let possible = 0
  let done = 0
  active.forEach((i) => {
    // Стажёры, добавленные тренером вручную посреди обучения, не штрафуются за занятия до даты добавления.
    const internLessons = i.joinedAt ? lessons.filter((l) => !l.date || l.date >= i.joinedAt) : lessons
    internLessons.forEach((l) => {
      possible += 1
      if (i.attendance?.[l.id]) present += 1
      if (i.homework?.[l.id] === 'done') done += 1
    })
  })
  const attendancePct = possible ? Math.round((present / possible) * 100) : null
  const homeworkPct = possible ? Math.round((done / possible) * 100) : null

  const exam = { passed: 0, retake: 0, failed: 0, notStarted: 0 }
  active.forEach((i) => {
    const status = getInternExamStatus(i)
    if (status.code === 'passed') exam.passed += 1
    else if (status.code === 'ungraded') exam.notStarted += 1
    else if (status.code === 'retake_pending') exam.retake += 1
    else exam.failed += 1
  })

  return { attendancePct, homeworkPct, exam, internCount: active.length, withdrawnCount }
}
