import { msg } from '../i18n/msg.js'
import * as XLSX from 'xlsx'
import { getInternExamStatus, getExamDate, getRetakeDate } from './exam'
import { formatDate } from './date'
import { firstLessonId } from './lessons'
import { HOMEWORK_STATUSES } from './constants'

// Служебный лист с полной копией данных в JSON — по нему сайт восстанавливает всё один в один.
// Обычные листы — для чтения человеком (и на случай, если сайт совсем недоступен).
const DATA_SHEET = 'backup'
// В одной ячейке Excel не больше 32 767 символов — JSON режется на куски по строкам.
const CELL_CHUNK = 30000
const BACKUP_VERSION = 1

export function backupPayload(data) {
  return {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    data: {
      settings: data.settings,
      trainers: data.trainers,
      groups: data.groups,
      interns: data.interns,
    },
  }
}

// Проверка, что из файла/базы пришла именно копия этого сайта, и её нормализация.
export function parsePayload(json) {
  const payload = typeof json === 'string' ? JSON.parse(json) : json
  const d = payload?.data
  if (!d || !d.settings || !Array.isArray(d.trainers) || !Array.isArray(d.groups) || !Array.isArray(d.interns)) {
    throw new Error(msg('Это не резервная копия сайта адаптационной программы.'))
  }
  return { createdAt: payload.createdAt || '', data: d }
}

function homeworkLabel(value) {
  return HOMEWORK_STATUSES.find((h) => h.value === value)?.label || ''
}

function yesNo(value) {
  return value ? 'Да' : 'Нет'
}

function readableSheets(data) {
  const trainerName = (id) => data.trainers.find((t) => t.id === id)?.name || ''
  const groupById = new Map(data.groups.map((g) => [g.id, g]))
  const internsIn = (groupId) => data.interns.filter((i) => i.groupId === groupId)

  const groups = data.groups.map((g) => ({
    Группа: g.name,
    Тренер: trainerName(g.ownerId),
    'Приём анкет открыт': yesNo(g.isOpen),
    'Дата открытия': formatDate(g.startDate),
    'Дата закрытия': formatDate(g.endDate),
    'В архиве': yesNo(g.archived),
    'Дата архивации': formatDate(g.archivedAt),
    Занятий: (g.lessons || []).length,
    Стажёров: internsIn(g.id).length,
  }))

  const interns = data.interns.map((i) => {
    const group = groupById.get(i.groupId)
    const lessons = group?.lessons || []
    const attended = lessons.filter((l) => i.attendance?.[l.id]).length
    return {
      Фамилия: i.lastName,
      Имя: i.firstName,
      Группа: group?.name || '',
      Тренер: trainerName(group?.ownerId),
      Телефон: i.phone,
      Email: i.email,
      Регион: i.region || '',
      Подразделение: i.department,
      Должность: i.position,
      'Город/район': i.city,
      Руководитель: i.managerName,
      'Контакты руководителя': i.managerContact,
      'Посещено занятий': lessons.length ? `${attended} из ${lessons.length}` : '',
      'Итог экзамена': getInternExamStatus(i).label,
      'Дата экзамена': formatDate(getExamDate(i)),
      'Дата пересдачи': formatDate(getRetakeDate(i)),
      'Комментарий к итогу': i.examFinalComment || '',
      'Отказ от обучения': i.withdrawn ? `Да${i.withdrawnReason ? ` — ${i.withdrawnReason}` : ''}` : '',
    }
  })

  const lessonsRows = []
  data.interns.forEach((i) => {
    const group = groupById.get(i.groupId)
    const noHomeworkId = firstLessonId(group?.lessons || [])
    ;(group?.lessons || []).forEach((l) => {
      lessonsRows.push({
        Стажёр: [i.lastName, i.firstName].filter(Boolean).join(' '),
        Группа: group.name,
        Занятие: l.name,
        Дата: formatDate(l.date),
        Присутствие: i.attendance?.[l.id] ? 'Был(а)' : 'Не был(а)',
        'Домашнее задание': l.id === noHomeworkId ? 'Не задаётся' : homeworkLabel(i.homework?.[l.id]),
        'Комментарий тренера': i.comments?.[l.id] || '',
      })
    })
  })

  const trainers = data.trainers.map((t) => ({ Тренер: t.name, Логин: t.login, Телефон: t.phone || '' }))

  return [
    ['Группы', groups],
    ['Стажёры', interns],
    ['Посещаемость и ДЗ', lessonsRows],
    ['Тренеры', trainers],
  ]
}

export function buildBackupWorkbook(payload) {
  const workbook = XLSX.utils.book_new()
  readableSheets(payload.data).forEach(([name, rows]) => {
    // Слишком длинный текст обрезается только на читаемых листах — полная версия есть на служебном.
    const safe = rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k, typeof v === 'string' && v.length > CELL_CHUNK ? `${v.slice(0, CELL_CHUNK)}…` : v]),
      ),
    )
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(safe.length ? safe : [{}]), name)
  })

  const json = JSON.stringify(payload)
  const chunks = []
  for (let i = 0; i < json.length; i += CELL_CHUNK) chunks.push([json.slice(i, i + CELL_CHUNK)])
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(chunks), DATA_SHEET)
  // Служебный лист скрыт, чтобы его случайно не правили руками.
  workbook.Workbook = { Sheets: workbook.SheetNames.map((name) => ({ Hidden: name === DATA_SHEET ? 1 : 0 })) }
  return workbook
}

export function backupFileName(createdAt) {
  const d = new Date(createdAt || Date.now())
  const pad = (n) => String(n).padStart(2, '0')
  return `Резервная копия АП — ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}-${pad(d.getMinutes())}.xlsx`
}

export function downloadBackupWorkbook(payload) {
  XLSX.writeFile(buildBackupWorkbook(payload), backupFileName(payload.createdAt))
}

export function readBackupWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[DATA_SHEET]
  if (!sheet) throw new Error(msg('В файле нет служебного листа резервной копии — выберите файл, скачанный с этого сайта.'))
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false })
  return parsePayload(rows.map((r) => String(r?.[0] ?? '')).join(''))
}
