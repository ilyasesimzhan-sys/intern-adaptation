import * as XLSX from 'xlsx'
import { HOMEWORK_STATUSES } from './constants'
import { getExamQuestions, getExamAnswers, getRetakeAnswers, examCorrectCount, examPercent, getInternExamStatus } from './exam'

function homeworkLabel(value) {
  return HOMEWORK_STATUSES.find((h) => h.value === value)?.label || 'Не указано'
}

function answerLabel(a) {
  return a === true ? 'Верно' : a === false ? 'Неверно' : '—'
}

function questionCell(questions, answers, idx) {
  const text = questions[idx]?.trim()
  return `${text || `Вопрос ${idx + 1}`}: ${answerLabel(answers[idx])}`
}

// Полная выгрузка по группе для служебных целей: анкета, путь по группе, посещаемость и ДЗ по каждому
// занятию, оба захода на экзамен по вопросам, итоговый статус. Доступна только из кабинета тренера.
export function downloadGroupReport(group, interns, trainers) {
  const ownerName = trainers.find((t) => t.id === group.ownerId)?.name || 'без владельца'

  const rows = interns.map((i) => {
    const questions = getExamQuestions(i)
    const first = getExamAnswers(i)
    const retake = getRetakeAnswers(i)
    const status = getInternExamStatus(i)

    const row = {
      Фамилия: i.lastName,
      Имя: i.firstName,
      Email: i.email,
      Подразделение: i.department,
      Должность: i.position,
      Телефон: i.phone,
      Руководитель: i.managerName,
      'Контакты руководителя': i.managerContact,
      Город: i.city,
      'Дата подачи анкеты': i.createdAt ? i.createdAt.slice(0, 10) : '',
      Группа: group.name,
      'Владелец группы': ownerName,
      'Группа создана': group.createdAt ? group.createdAt.slice(0, 10) : '',
      'Приём анкет — начало': group.startDate || '',
      'Приём анкет — окончание': group.endDate || '',
    }

    group.lessons.forEach((l, idx) => {
      const label = `Занятие ${idx + 1}: ${l.name}${l.date ? ` (${l.date})` : ''}`
      row[`${label} — посещение`] = i.attendance?.[l.id] ? 'Присутствовал' : 'Отсутствовал'
      row[`${label} — ДЗ`] = homeworkLabel(i.homework?.[l.id])
    })

    row['Комментарий тренера (обучение)'] = i.comment || ''

    questions.forEach((_, q) => {
      row[`Экзамен, 1-я попытка — вопрос ${q + 1}`] = questionCell(questions, first, q)
    })
    row['Экзамен, 1-я попытка — итог'] = `${examCorrectCount(first)}/${first.length} (${examPercent(first)}%)`

    if (retake) {
      questions.forEach((_, q) => {
        row[`Пересдача — вопрос ${q + 1}`] = questionCell(questions, retake, q)
      })
      row['Пересдача — итог'] = `${examCorrectCount(retake)}/${retake.length} (${examPercent(retake)}%)`
    }

    row['Итоговый статус'] = status.label
    row['Комментарий завершения экзамена'] = i.examFinalComment || ''

    return row
  })

  const sheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Стажёры')

  const safeName = group.name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80)
  XLSX.writeFile(workbook, `Отчёт — ${safeName}.xlsx`)
}
