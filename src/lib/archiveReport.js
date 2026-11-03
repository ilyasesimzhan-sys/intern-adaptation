import * as XLSX from 'xlsx'
import { getActiveAnswers, examPercent, getInternExamStatus } from './exam'
import { trainingPeriod } from './date'
import { REGIONS } from './constants'

// Отчёт по архиву: сколько стажёров прошло обучение — всего, по регионам и по группам — и их данные.

const NO_REGION = 'Не указан'

// Итог обучения одного стажёра: прошёл (сдал экзамен), отказался или не прошёл.
export function trainingOutcome(intern) {
  if (intern.withdrawn) return 'withdrawn'
  return getInternExamStatus(intern).code === 'passed' ? 'passed' : 'failed'
}

const OUTCOME_LABELS = { passed: 'Прошёл обучение', failed: 'Не прошёл', withdrawn: 'Отказался от обучения' }

export function countOutcomes(interns) {
  const counts = { total: interns.length, passed: 0, failed: 0, withdrawn: 0 }
  interns.forEach((i) => {
    counts[trainingOutcome(i)] += 1
  })
  return counts
}

function regionLabel(code) {
  return REGIONS.find((r) => r.value === code)?.label || code || NO_REGION
}

function countRow(counts) {
  return {
    'Всего стажёров': counts.total,
    'Прошли обучение': counts.passed,
    'Не прошли': counts.failed,
    'Отказались от обучения': counts.withdrawn,
    'Прошли, %': counts.total ? `${Math.round((counts.passed / counts.total) * 100)}%` : '',
  }
}

export function regionRows(interns) {
  const codes = [...REGIONS.map((r) => r.value), '']
  return codes
    .map((code) => ({ code, list: interns.filter((i) => (i.region || '') === code) }))
    .filter(({ code, list }) => code || list.length > 0)
    .map(({ code, list }) => ({ Регион: regionLabel(code), ...countRow(countOutcomes(list)) }))
}

export function downloadArchiveReport({ groups, interns, trainers, periodText, regionText }) {
  const trainerName = (id) => trainers.find((t) => t.id === id)?.name || 'без владельца'
  const groupById = new Map(groups.map((g) => [g.id, g]))
  const counts = countOutcomes(interns)
  const today = new Date().toLocaleDateString('ru-RU')

  const summary = [
    ['Отчёт по архиву адаптационной программы'],
    ['Период обучения', periodText],
    ['Регион', regionText],
    ['Дата отчёта', today],
    [],
    ['Групп', groups.length],
    ['Всего стажёров', counts.total],
    ['Прошли обучение', counts.passed],
    ['Не прошли', counts.failed],
    ['Отказались от обучения', counts.withdrawn],
  ]

  const byGroup = groups.map((g) => ({
    Группа: g.name,
    'Бизнес-тренер': trainerName(g.ownerId),
    'Период обучения': trainingPeriod(g.lessons),
    ...countRow(countOutcomes(interns.filter((i) => i.groupId === g.id))),
  }))

  const people = interns.map((i) => {
    const g = groupById.get(i.groupId)
    return {
      Фамилия: i.lastName,
      Имя: i.firstName,
      Итог: OUTCOME_LABELS[trainingOutcome(i)],
      'Результат экзамена, %': `${examPercent(getActiveAnswers(i))}%`,
      Группа: g?.name || '',
      'Бизнес-тренер': trainerName(g?.ownerId),
      'Период обучения': trainingPeriod(g?.lessons),
      Регион: i.region ? regionLabel(i.region) : '',
      Подразделение: i.department || '',
      Должность: i.position || '',
      'Город/район': i.city || '',
      Телефон: i.phone || '',
      Email: i.email || '',
      Руководитель: i.managerName || '',
      'Контакты руководителя': i.managerContact || '',
      'Причина отказа / комментарий': i.withdrawn ? i.withdrawnReason || '' : i.examFinalComment || '',
    }
  })

  const workbook = XLSX.utils.book_new()
  const summarySheet = XLSX.utils.aoa_to_sheet(summary)
  summarySheet['!cols'] = [{ wch: 28 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Итоги')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(regionRows(interns)), 'По регионам')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(byGroup.length ? byGroup : [{}]), 'По группам')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(people.length ? people : [{}]), 'Стажёры')
  XLSX.writeFile(workbook, `Отчёт по архиву АП — ${today}.xlsx`)
}
