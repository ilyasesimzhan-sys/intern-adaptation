// Человекочитаемое описание записей журнала действий и проверка, можно ли их безопасно отменить.

const FIELD_LABELS = {
  groups: {
    name: 'название',
    ownerId: 'владелец',
    isOpen: 'приём анкет',
    startDate: 'дата открытия',
    endDate: 'дата закрытия',
    lessons: 'занятия',
    archived: 'архив',
    archivedAt: 'дата архивации',
  },
  interns: {
    lastName: 'фамилия',
    firstName: 'имя',
    email: 'email',
    region: 'регион',
    department: 'подразделение',
    position: 'должность',
    phone: 'телефон',
    managerName: 'руководитель',
    managerContact: 'контакты руководителя',
    city: 'город/район',
    groupId: 'группа',
    attendance: 'посещаемость',
    homework: 'ДЗ',
    comments: 'комментарии',
    examQuestions: 'вопросы экзамена',
    examAnswers: 'ответы экзамена',
    examDate: 'дата экзамена',
    examRetakeQuestions: 'вопросы пересдачи',
    examRetakeAnswers: 'пересдача',
    examRetakeDate: 'дата пересдачи',
    examFinalOutcome: 'итог экзамена',
    examFinalComment: 'комментарий к итогу',
    withdrawn: 'отказ от обучения',
    withdrawnReason: 'причина отказа',
    whatsappSentAt: 'сообщение стажёру',
    whatsappManagerSentAt: 'сообщение руководителю',
  },
  settings: {
    programName: 'название программы',
    examRules: 'правила экзамена',
    programRules: 'правила программы',
    whatsappTemplate: 'шаблон WhatsApp стажёрам',
    whatsappManagerTemplate: 'шаблон WhatsApp руководителям',
    examQuestionBank: 'банк вопросов',
    trainers: 'тренеры',
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

export function entityName(change) {
  const item = change.after || change.before || {}
  if (change.coll === 'groups') return `группа «${item.name || '—'}»`
  if (change.coll === 'interns') return `стажёр ${[item.lastName, item.firstName].filter(Boolean).join(' ') || '—'}`
  return 'настройки'
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

export function describeChange(change, groups) {
  const name = entityName(change)
  const title = name[0].toUpperCase() + name.slice(1)
  if (!change.before) return `Добавлен(а) ${name}`
  if (!change.after) return `Удалён(а) ${name}`
  const labels = FIELD_LABELS[change.coll] || {}
  const fields = changedFields(change)
  if (change.coll === 'interns' && fields.includes('groupId')) {
    const to = groups.find((g) => g.id === change.after.groupId)?.name
    if (to) return `${title}: переведён(а) в группу «${to}»`
  }
  if (fields.length === 0) return `Изменён(а) ${name}`
  return `${title}: изменено — ${fields.map((f) => labels[f] || f).join(', ')}`
}

export function describeEntry(entry, groups) {
  if (entry.label) return entry.label
  if (entry.changes.length === 1) return describeChange(entry.changes[0], groups)
  return `Изменено записей: ${entry.changes.length}`
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

function lessonTitle(lesson) {
  return `«${lesson.name || 'занятие'}»`
}

// Список полей записи журнала, которые можно откорректировать, с текущими значениями.
// key — уникальный ключ поля, path — путь внутри записи: [field] | ['lessons', lessonId, 'name'|'date'] | ['comments', lessonId].
export function correctableFields(entry, data) {
  const result = []
  entry.changes.forEach((c) => {
    const editable = EDITABLE_FIELDS[c.coll]
    if (!editable || !c.after) return
    const current = currentDoc(c, data)
    if (!current) return
    const before = c.before || {}
    const after = c.after
    const entity = entityName({ ...c, after: current })
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
      push([field], FIELD_LABELS[c.coll][field], type, after[field], before[field], current[field])
    })

    if (c.coll === 'groups') {
      const beforeLessons = before.lessons || []
      ;(after.lessons || []).forEach((l) => {
        const now = (current.lessons || []).find((x) => x.id === l.id)
        if (!now) return
        const old = beforeLessons.find((x) => x.id === l.id)
        if (!old || old.name !== l.name) push(['lessons', l.id, 'name'], `занятие ${lessonTitle(now)}: название`, 'text', l.name, old?.name, now.name)
        if (!old || old.date !== l.date) push(['lessons', l.id, 'date'], `занятие ${lessonTitle(now)}: дата`, 'date', l.date, old?.date, now.date)
      })
    }

    if (c.coll === 'interns') {
      const lessons = data.groups.find((g) => g.id === current.groupId)?.lessons || []
      Object.entries(after.comments || {}).forEach(([lessonId, text]) => {
        if ((before.comments || {})[lessonId] === text) return
        const lesson = lessons.find((l) => l.id === lessonId)
        const label = `комментарий тренера${lesson ? ` к занятию ${lessonTitle(lesson)}` : ''}`
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
