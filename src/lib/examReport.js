import * as XLSX from 'xlsx'
import { getExamAnswers, getRetakeAnswers, examPercent, getInternExamStatus, getWeakTopics } from './exam'
import { formatDate, trainingPeriod } from './date'

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

// Автоматическая рекомендация «над чем работать» — дисциплина (пропуски), домашние задания и темы,
// по которым стажёр ответил неверно на экзамене (актуальная попытка: пересдача, если есть, иначе первая).
function buildRecommendation(intern, lessons) {
  const notes = []

  const missed = lessons.filter((l) => !intern.attendance?.[l.id])
  if (missed.length > 0) {
    notes.push(`Дисциплина — пропущено занятий: ${missed.length} из ${lessons.length} (${missed.map((l) => l.name).join(', ')})`)
  }

  const notDone = lessons.filter((l) => intern.homework?.[l.id] === 'not_done').map((l) => l.name)
  const partial = lessons.filter((l) => intern.homework?.[l.id] === 'partial').map((l) => l.name)
  if (notDone.length > 0 || partial.length > 0) {
    const parts = []
    if (notDone.length > 0) parts.push(`не выполнено — ${notDone.join(', ')}`)
    if (partial.length > 0) parts.push(`выполнено частично — ${partial.join(', ')}`)
    notes.push(`Домашние задания: ${parts.join('; ')}`)
  }

  const weakTopics = getWeakTopics(intern)
  if (weakTopics.length > 0) {
    notes.push(`Повторить темы (неверные ответы на экзамене): ${weakTopics.join('; ')}`)
  }

  return notes.length > 0 ? notes.join('. ') : 'Замечаний и предложений нет'
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
      Итог: i.withdrawn ? 'Отказался от обучения' : OUTCOME_LABEL[status.code] || status.label,
      Рекомендации: buildRecommendation(i, lessons),
      Комментарий: i.withdrawn ? i.withdrawnReason || 'Причина не указана' : i.examFinalComment || '',
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
