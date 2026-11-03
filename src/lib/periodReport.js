import * as XLSX from 'xlsx'
import { computeGroupStats } from './groupStats'
import { internReportRow } from './examReport'
import { formatDate, trainingPeriod } from './date'
import { firstLessonId } from './lessons'
import { HOMEWORK_STATUSES } from './constants'

// Сводный отчёт для руководства: несколько групп сразу (по тренеру, за период) в одном Excel-файле.

// Даты обучения группы: по занятиям, а если у занятий нет дат — по датам открытия/закрытия набора.
export function groupDateRange(group) {
  const dates = (group.lessons || []).map((l) => l.date).filter(Boolean).sort()
  if (dates.length > 0) return { from: dates[0], to: dates[dates.length - 1] }
  const from = group.startDate || group.endDate || ''
  const to = group.endDate || group.startDate || ''
  return from ? { from: from.slice(0, 10), to: to.slice(0, 10) } : null
}

// Группа попадает в период, если её обучение хотя бы частично пересекается с ним.
// Группы без дат попадают в отчёт, только когда период не задан.
export function groupInPeriod(group, from, to) {
  if (!from && !to) return true
  const range = groupDateRange(group)
  if (!range) return false
  if (from && range.to < from) return false
  if (to && range.from > to) return false
  return true
}

function pct(value) {
  return value === null || value === undefined ? '' : `${value}%`
}

function homeworkLabel(value) {
  return HOMEWORK_STATUSES.find((h) => h.value === value)?.label || 'Не отмечено'
}

function buildSheets(groups, interns, trainers) {
  const trainerName = (id) => trainers.find((t) => t.id === id)?.name || 'без владельца'
  const internsOf = (group) => interns.filter((i) => i.groupId === group.id)
  const stats = new Map(groups.map((g) => [g.id, computeGroupStats(g, internsOf(g))]))

  const summary = groups.map((g) => {
    const s = stats.get(g.id)
    return {
      Группа: g.name,
      'Бизнес-тренер': trainerName(g.ownerId),
      'Период обучения': trainingPeriod(g.lessons),
      'В архиве': g.archived ? 'Да' : 'Нет',
      'Стажёров (без отказавшихся)': s.internCount,
      'Отказались от обучения': s.withdrawnCount,
      'Посещаемость, %': pct(s.attendancePct),
      'Выполнение ДЗ, %': pct(s.homeworkPct),
      'Сдали экзамен': s.exam.passed,
      'Идёт пересдача': s.exam.retake,
      'Не сдали': s.exam.failed,
      'Ещё не сдавали': s.exam.notStarted,
    }
  })

  // По тренерам — проценты взвешены по числу стажёров в группах.
  const byTrainer = new Map()
  groups.forEach((g) => {
    const s = stats.get(g.id)
    const row = byTrainer.get(g.ownerId) || { groups: 0, interns: 0, withdrawn: 0, passed: 0, att: [0, 0], hw: [0, 0] }
    row.groups += 1
    row.interns += s.internCount
    row.withdrawn += s.withdrawnCount
    row.passed += s.exam.passed
    if (s.attendancePct !== null) row.att = [row.att[0] + s.attendancePct * s.internCount, row.att[1] + s.internCount]
    if (s.homeworkPct !== null) row.hw = [row.hw[0] + s.homeworkPct * s.internCount, row.hw[1] + s.internCount]
    byTrainer.set(g.ownerId, row)
  })
  const avg = ([sum, n]) => (n ? `${Math.round(sum / n)}%` : '')
  const trainerRows = [...byTrainer.entries()].map(([id, r]) => ({
    'Бизнес-тренер': trainerName(id),
    Групп: r.groups,
    'Стажёров (без отказавшихся)': r.interns,
    'Отказались от обучения': r.withdrawn,
    'Сдали экзамен': r.passed,
    'Сдали, % от стажёров': r.interns ? `${Math.round((r.passed / r.interns) * 100)}%` : '',
    'Посещаемость, %': avg(r.att),
    'Выполнение ДЗ, %': avg(r.hw),
  }))

  const internRows = []
  const lessonRows = []
  groups.forEach((g) => {
    const owner = trainerName(g.ownerId)
    const lessons = g.lessons || []
    const noHomeworkId = firstLessonId(lessons)
    internsOf(g).forEach((i) => {
      internRows.push({ Группа: g.name, ...internReportRow(i, g, owner) })
      lessons.forEach((l) => {
        lessonRows.push({
          Группа: g.name,
          Стажёр: [i.lastName, i.firstName].filter(Boolean).join(' '),
          Занятие: l.name,
          Дата: formatDate(l.date),
          Присутствие: i.attendance?.[l.id] ? 'Был(а)' : 'Не был(а)',
          'Домашнее задание': l.id === noHomeworkId ? 'Не задаётся' : homeworkLabel(i.homework?.[l.id]),
          'Комментарий тренера': i.comments?.[l.id] || '',
        })
      })
    })
  })

  return [
    ['Сводка по группам', summary],
    ['Сводка по тренерам', trainerRows],
    ['Стажёры', internRows],
    ['Посещаемость и ДЗ', lessonRows],
  ]
}

export function buildPeriodReport(groups, interns, trainers) {
  const workbook = XLSX.utils.book_new()
  buildSheets(groups, interns, trainers).forEach(([name, rows]) => {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.length ? rows : [{}]), name)
  })
  return workbook
}

export function periodReportFileName({ from, to, title }) {
  const period = from || to ? ` ${formatDate(from) || '…'} — ${formatDate(to) || '…'}` : ''
  const name = `Отчёт АП — ${title}${period}`.replace(/[\\/:*?"<>|]/g, '_').slice(0, 120)
  return `${name}.xlsx`
}

export function downloadPeriodReport(groups, interns, trainers, fileInfo) {
  XLSX.writeFile(buildPeriodReport(groups, interns, trainers), periodReportFileName(fileInfo))
}
