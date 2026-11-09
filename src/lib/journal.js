// Человекочитаемое описание записей журнала действий и проверка, можно ли их безопасно отменить.
// Функции описания принимают t (перевод интерфейса); без него текст — на русском (так он сохраняется в журнал).
import { msg, ru } from '../i18n/msg.js'

const FIELD_LABELS = {
  groups: {
    name: msg('название'),
    ownerId: msg('владелец'),
    isOpen: msg('приём анкет'),
    startDate: msg('дата открытия'),
    endDate: msg('дата закрытия'),
    lessons: msg('занятия'),
    archived: msg('архив'),
    archivedAt: msg('дата архивации'),
  },
  interns: {
    lastName: msg('фамилия'),
    firstName: msg('имя'),
    email: msg('email'),
    region: msg('регион'),
    department: msg('подразделение'),
    position: msg('должность'),
    phone: msg('телефон'),
    managerName: msg('руководитель'),
    managerContact: msg('контакты руководителя'),
    city: msg('город/район'),
    groupId: msg('группа'),
    attendance: msg('посещаемость'),
    homework: msg('ДЗ'),
    comments: msg('комментарии'),
    examQuestions: msg('вопросы экзамена'),
    examAnswers: msg('ответы экзамена'),
    examDate: msg('дата экзамена'),
    examRetakeQuestions: msg('вопросы пересдачи'),
    examRetakeAnswers: msg('пересдача'),
    examRetakeDate: msg('дата пересдачи'),
    examFinalOutcome: msg('итог экзамена'),
    examFinalComment: msg('комментарий к итогу'),
    withdrawn: msg('отказ от обучения'),
    withdrawnReason: msg('причина отказа'),
    whatsappSentAt: msg('сообщение стажёру'),
    whatsappManagerSentAt: msg('сообщение руководителю'),
  },
  settings: {
    programName: msg('название программы'),
    examRules: msg('правила экзамена'),
    programRules: msg('правила программы'),
    whatsappTemplate: msg('шаблон WhatsApp стажёрам'),
    whatsappManagerTemplate: msg('шаблон WhatsApp руководителям'),
    examQuestionBank: msg('банк вопросов'),
    trainers: msg('тренеры'),
  },
}

// Служебные поля, изменение которых само по себе не интересно.
const HIDDEN_FIELDS = new Set(['withdrawnAt', 'createdAt', 'joinedAt'])

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(value ?? null)
}

function same(a, b) {
  return stableStringify(a) === stableStringify(b)
}

export function entityName(change, t = ru) {
  const item = change.after || change.before || {}
  if (change.coll === 'groups') return t('группа «{name}»', { name: item.name || '—' })
  if (change.coll === 'interns') return t('стажёр {name}', { name: [item.lastName, item.firstName].filter(Boolean).join(' ') || '—' })
  return t('настройки')
}

function changedFields(change) {
  if (change.coll === 'settings') {
    const before = change.before || {}
    const after = change.after || {}
    const keys = new Set([...Object.keys(before.settings || {}), ...Object.keys(after.settings || {})])
    const fields = [...keys].filter((k) => !same(before.settings?.[k], after.settings?.[k]))
    if (!same(before.trainers, after.trainers)) fields.push('trainers')
    return fields
  }
  const before = change.before || {}
  const after = change.after || {}
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  return [...keys].filter((k) => !HIDDEN_FIELDS.has(k) && !same(before[k], after[k]))
}

export function describeChange(change, groups, t = ru) {
  const name = entityName(change, t)
  const title = name[0].toUpperCase() + name.slice(1)
  if (!change.before) return t('Добавлен(а) {name}', { name })
  if (!change.after) return t('Удалён(а) {name}', { name })
  const labels = FIELD_LABELS[change.coll] || {}
  const fields = changedFields(change)
  if (change.coll === 'interns' && fields.includes('groupId')) {
    const to = groups.find((g) => g.id === change.after.groupId)?.name
    if (to) return t('{title}: переведён(а) в группу «{group}»', { title, group: to })
  }
  if (fields.length === 0) return t('Изменён(а) {name}', { name })
  return t('{title}: изменено — {fields}', { title, fields: fields.map((f) => (labels[f] ? t(labels[f]) : f)).join(', ') })
}

// entry.label — готовая подпись, сохранённая в журнале при действии (на русском), выводится как есть.
export function describeEntry(entry, groups, t = ru) {
  if (entry.label) return entry.label
  if (entry.changes.length === 1) return describeChange(entry.changes[0], groups, t)
  return t('Изменено записей: {n}', { n: entry.changes.length })
}

function currentDoc(change, data) {
  if (change.coll === 'settings') return { settings: data.settings, trainers: data.trainers }
  return data[change.coll].find((item) => item.id === change.id) || null
}

// Записи, которые после этого действия кто-то уже изменил ещё раз — отмена перезапишет эти поздние правки.
export function changedSince(entry, data) {
  return entry.changes.filter((c) => !same(currentDoc(c, data), c.after))
}

// Поля, которые админ может исправить через журнал: то, что тренер вписывает руками.
const EDITABLE_FIELDS = {
  groups: { name: 'text', startDate: 'date', endDate: 'date' },
  interns: {
    lastName: 'text',
    firstName: 'text',
    email: 'text',
    phone: 'text',
    region: 'text',
    department: 'text',
    position: 'text',
    city: 'text',
    managerName: 'text',
    managerContact: 'text',
    examDate: 'date',
    examRetakeDate: 'date',
    examFinalComment: 'textarea',
    withdrawnReason: 'textarea',
  },
}

function lessonTitle(lesson, t) {
  return `«${lesson.name || t('занятие')}»`
}

// Список полей записи журнала, которые можно откорректировать, с текущими значениями.
// key — уникальный ключ поля, path — путь внутри записи: [field] | ['lessons', lessonId, 'name'|'date'] | ['comments', lessonId].
export function correctableFields(entry, data, t = ru) {
  const result = []
  entry.changes.forEach((c) => {
    const editable = EDITABLE_FIELDS[c.coll]
    if (!editable || !c.after) return
    const current = currentDoc(c, data)
    if (!current) return
    const before = c.before || {}
    const after = c.after
    const entity = entityName({ ...c, after: current }, t)
    const push = (path, label, type, trainerValue, beforeValue, currentValue) =>
      result.push({
        key: `${c.coll}/${c.id}/${path.join('/')}`,
        coll: c.coll,
        id: c.id,
        entity,
        path,
        label,
        type,
        trainerValue: trainerValue ?? '',
        beforeValue: c.before ? beforeValue ?? '' : null,
        currentValue: currentValue ?? '',
      })

    Object.entries(editable).forEach(([field, type]) => {
      const touched = !c.before ? after[field] !== undefined : !same(before[field], after[field])
      if (!touched) return
      push([field], t(FIELD_LABELS[c.coll][field]), type, after[field], before[field], current[field])
    })

    if (c.coll === 'groups') {
      const beforeLessons = before.lessons || []
      ;(after.lessons || []).forEach((l) => {
        const now = (current.lessons || []).find((x) => x.id === l.id)
        if (!now) return
        const old = beforeLessons.find((x) => x.id === l.id)
        if (!old || old.name !== l.name) push(['lessons', l.id, 'name'], t('занятие {lesson}: название', { lesson: lessonTitle(now, t) }), 'text', l.name, old?.name, now.name)
        if (!old || old.date !== l.date) push(['lessons', l.id, 'date'], t('занятие {lesson}: дата', { lesson: lessonTitle(now, t) }), 'date', l.date, old?.date, now.date)
      })
    }

    if (c.coll === 'interns') {
      const lessons = data.groups.find((g) => g.id === current.groupId)?.lessons || []
      Object.entries(after.comments || {}).forEach(([lessonId, text]) => {
        if ((before.comments || {})[lessonId] === text) return
        const lesson = lessons.find((l) => l.id === lessonId)
        const label = lesson
          ? t('комментарий тренера к занятию {lesson}', { lesson: lessonTitle(lesson, t) })
          : t('комментарий тренера')
        push(['comments', lessonId], label, 'textarea', text, before.comments?.[lessonId], current.comments?.[lessonId])
      })
    }
  })
  return result
}

function setPath(item, path, value) {
  const [field, ...rest] = path
  if (field === 'lessons') {
    const [lessonId, key] = rest
    return { ...item, lessons: (item.lessons || []).map((l) => (l.id === lessonId ? { ...l, [key]: value } : l)) }
  }
  if (field === 'comments') return { ...item, comments: { ...(item.comments || {}), [rest[0]]: value } }
  return { ...item, [field]: value }
}

// Данные с применёнными исправлениями: edits — [{ coll, id, path, value }].
export function applyCorrections(prev, edits) {
  const next = { ...prev }
  edits.forEach((e) => {
    next[e.coll] = next[e.coll].map((item) => (item.id === e.id ? setPath(item, e.path, e.value) : item))
  })
  return next
}

// Состояние данных с возвращёнными «до действия» версиями всех затронутых записей.
export function revertEntry(prev, entry) {
  const next = { ...prev }
  entry.changes.forEach((c) => {
    if (c.coll === 'settings') {
      next.settings = c.before.settings
      next.trainers = c.before.trainers
      return
    }
    const list = next[c.coll].filter((item) => item.id !== c.id)
    next[c.coll] = c.before ? [...list, c.before] : list
  })
  return next
}
