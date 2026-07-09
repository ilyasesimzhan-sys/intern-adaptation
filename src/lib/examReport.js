import * as XLSX from 'xlsx'
import { getExamAnswers, getRetakeAnswers, examPercent, getInternExamStatus } from './exam'

const HOMEWORK_SCORE = { done: 100, partial: 50, not_done: 0 }

const OUTCOME_LABEL = {
  passed: 'Прошёл',
  training: 'Направлен на переобучение',
  ended: 'Отказался',
}

function attendancePercent(intern, lessons) {
  if (lessons.length === 0) return ''
  const present = lessons.filter((l) => intern.attendance?.[l.id]).length
  return `${Math.round((present / lessons.length) * 100)}%`
}

function homeworkPercent(intern, lessons) {
  if (lessons.length === 0) return ''
  const total = lessons.reduce((sum, l) => sum + (HOMEWORK_SCORE[intern.homework?.[l.id]] ?? 0), 0)
  return `${Math.round(total / lessons.length)}%`
}

function trainingPeriod(lessons) {
  const dates = lessons.map((l) => l.date).filter(Boolean).sort()
  if (dates.length === 0) return ''
  const first = dates[0]
  const last = dates[dates.length - 1]
  return first === last ? first : `${first} — ${last}`
}

// Сводная выгрузка по группе для служебных целей: одна строка на стажёра с итоговыми процентами,
// а не детализация по дням и вопросам. Доступна только из кабинета тренера.
export function downloadGroupReport(group, interns, trainers) {
  const ownerName = trainers.find((t) => t.id === group.ownerId)?.name || 'без владельца'
  const lessons = group.lessons || []

  const rows = interns.map((i) => {
    const first = getExamAnswers(i)
    const retake = getRetakeAnswers(i)
    const status = getInternExamStatus(i)

    return {
      Фамилия: i.lastName,
      Имя: i.firstName,
      Подразделение: i.department,
      Должность: i.position,
      'Город/район': i.city,
      'Период обучения': trainingPeriod(lessons),
      'Посещаемость, %': attendancePercent(i, lessons),
      'Выполнение домашних заданий, %': homeworkPercent(i, lessons),
      'Результат экзамена, %': `${examPercent(first)}%`,
      Пересдача: retake ? `${examPercent(retake)}%` : '',
      'Бизнес-тренер': ownerName,
      Итог: OUTCOME_LABEL[status.code] || status.label,
      Комментарий: i.examFinalComment || '',
      Руководитель: i.managerName,
      'Контакты руководителя': i.managerContact,
    }
  })

  const sheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Стажёры')

  const safeName = group.name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80)
  XLSX.writeFile(workbook, `Отчёт — ${safeName}.xlsx`)
}
