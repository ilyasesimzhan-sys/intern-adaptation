import { useMemo, useState } from 'react'
import { useStore } from '../../store/StoreContext.jsx'
import { HOMEWORK_STATUSES } from '../../lib/constants'
import { uid } from '../../store/defaultData'

const COLUMNS = [
  { key: 'lastName', label: 'Фамилия' },
  { key: 'firstName', label: 'Имя' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Подразделение' },
  { key: 'position', label: 'Должность' },
  { key: 'phone', label: 'Телефон' },
  { key: 'managerName', label: 'Руководитель' },
  { key: 'managerContact', label: 'Контакты руководителя' },
  { key: 'city', label: 'Город' },
]

export default function InternsTab() {
  const { data, update } = useStore()
  const { groups, interns } = data
  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [groups],
  )
  const [groupId, setGroupId] = useState(sortedGroups[0]?.id || '')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)

  const group = groups.find((g) => g.id === groupId) || null
  const groupInterns = useMemo(() => interns.filter((i) => i.groupId === groupId), [interns, groupId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return groupInterns
    return groupInterns.filter((i) => COLUMNS.some((c) => String(i[c.key] ?? '').toLowerCase().includes(q)))
  }, [groupInterns, search])

  function patchIntern(id, patch) {
    update((prev) => ({
      ...prev,
      interns: prev.interns.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }))
  }

  function deleteIntern(id) {
    if (!confirm('Удалить эту анкету?')) return
    update((prev) => ({ ...prev, interns: prev.interns.filter((i) => i.id !== id) }))
  }

  function copyTable() {
    const header = COLUMNS.map((c) => c.label).join('\t')
    const rows = filtered.map((i) => COLUMNS.map((c) => i[c.key] ?? '').join('\t'))
    const text = [header, ...rows].join('\n')

    function fallbackCopy() {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      let ok = false
      try {
        ok = document.execCommand('copy')
      } catch {
        ok = false
      }
      document.body.removeChild(textarea)
      return ok
    }

    function showResult(ok) {
      setCopied(ok ? 'success' : 'error')
      setTimeout(() => setCopied(false), 2000)
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => showResult(true))
        .catch(() => showResult(fallbackCopy()))
    } else {
      showResult(fallbackCopy())
    }
  }

  if (sortedGroups.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Список стажёров</h1>
        <p className="text-navy-400">Сначала создайте группу во вкладке «Настройки сбора».</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Список стажёров</h1>
        <select className="field-input max-w-xs" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          {sortedGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} {g.isOpen ? '(открыта)' : '(закрыта)'}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          className="field-input max-w-xs"
          placeholder="Поиск..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={copyTable} className="btn-secondary shrink-0">
          {copied === 'success' ? 'Скопировано!' : copied === 'error' ? 'Не удалось скопировать' : 'Копировать таблицу'}
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr className="text-left text-navy-500 border-b border-navy-100">
              {COLUMNS.map((c) => (
                <th key={c.key} className="py-2 pr-3 whitespace-nowrap">
                  {c.label}
                </th>
              ))}
              <th className="py-2 pr-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((intern) => (
              <tr key={intern.id} className="border-b border-navy-50 last:border-0">
                {COLUMNS.map((c) => (
                  <td key={c.key} className="py-1.5 pr-3">
                    <input
                      className="field-input min-w-[130px]"
                      value={intern[c.key] ?? ''}
                      onChange={(e) => patchIntern(intern.id, { [c.key]: e.target.value })}
                    />
                  </td>
                ))}
                <td className="py-1.5 pr-3">
                  <button
                    onClick={() => deleteIntern(intern.id)}
                    className="text-danger-500 hover:text-danger-600 text-xs whitespace-nowrap"
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="py-6 text-center text-navy-400">
                  Анкет не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {group && !group.isOpen && <GroupProgress group={group} interns={groupInterns} update={update} />}
      {group && group.isOpen && (
        <p className="text-sm text-navy-400">
          Посещаемость и домашние задания станут доступны здесь после закрытия группы.
        </p>
      )}
    </div>
  )
}

function GroupProgress({ group, interns, update }) {
  const [newLessonName, setNewLessonName] = useState('')
  const [newLessonDate, setNewLessonDate] = useState('')
  const [activeLessonId, setActiveLessonId] = useState(group.lessons[0]?.id || '')

  const activeLesson = group.lessons.find((l) => l.id === activeLessonId)

  function patchGroup(patch) {
    update((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => (g.id === group.id ? { ...g, ...patch } : g)),
    }))
  }

  function addLesson() {
    if (!newLessonName.trim()) return
    const lesson = { id: uid(), name: newLessonName.trim(), date: newLessonDate }
    patchGroup({ lessons: [...group.lessons, lesson] })
    setActiveLessonId(lesson.id)
    setNewLessonName('')
    setNewLessonDate('')
  }

  function removeLesson(id) {
    if (!confirm('Удалить это занятие? Отметки посещаемости и ДЗ по нему будут потеряны.')) return
    patchGroup({ lessons: group.lessons.filter((l) => l.id !== id) })
    if (activeLessonId === id) setActiveLessonId('')
  }

  function toggleAttendance(internId) {
    update((prev) => ({
      ...prev,
      interns: prev.interns.map((i) =>
        i.id === internId
          ? { ...i, attendance: { ...i.attendance, [activeLessonId]: !i.attendance[activeLessonId] } }
          : i,
      ),
    }))
  }

  function setHomework(internId, value) {
    update((prev) => ({
      ...prev,
      interns: prev.interns.map((i) =>
        i.id === internId ? { ...i, homework: { ...i.homework, [activeLessonId]: value } } : i,
      ),
    }))
  }

  function setComment(internId, value) {
    update((prev) => ({
      ...prev,
      interns: prev.interns.map((i) => (i.id === internId ? { ...i, comment: value } : i)),
    }))
  }

  return (
    <div className="card space-y-4">
      <h2 className="font-semibold">Прогресс — {group.name}</h2>

      <div className="flex flex-wrap gap-2">
        {group.lessons.map((l) => (
          <button
            key={l.id}
            onClick={() => setActiveLessonId(l.id)}
            className={
              'px-3 py-1.5 rounded-full text-sm border flex items-center gap-2 ' +
              (l.id === activeLessonId
                ? 'bg-navy-700 text-white border-navy-700'
                : 'bg-white text-navy-700 border-navy-200 hover:bg-navy-50')
            }
          >
            {l.name}
            {l.date ? ` · ${l.date}` : ''}
            <span
              onClick={(e) => {
                e.stopPropagation()
                removeLesson(l.id)
              }}
              className="opacity-60 hover:opacity-100"
            >
              ✕
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="field-label">Название занятия</label>
          <input
            className="field-input"
            value={newLessonName}
            onChange={(e) => setNewLessonName(e.target.value)}
            placeholder="Например, Занятие 1"
          />
        </div>
        <div>
          <label className="field-label">Дата</label>
          <input
            type="date"
            className="field-input"
            value={newLessonDate}
            onChange={(e) => setNewLessonDate(e.target.value)}
          />
        </div>
        <button onClick={addLesson} className="btn-primary">
          Добавить занятие
        </button>
      </div>

      {interns.length === 0 ? (
        <p className="text-navy-400">В группе нет стажёров.</p>
      ) : !activeLesson ? (
        <p className="text-navy-400">Добавьте и выберите занятие, чтобы отмечать посещаемость.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-left text-navy-500 border-b border-navy-100">
                <th className="py-2 pr-3">ФИО</th>
                <th className="py-2 pr-3">Присутствие</th>
                <th className="py-2 pr-3">Домашнее задание</th>
                <th className="py-2 pr-3">Комментарий тренера</th>
              </tr>
            </thead>
            <tbody>
              {interns.map((i) => (
                <tr key={i.id} className="border-b border-navy-50 last:border-0">
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {i.lastName} {i.firstName}
                  </td>
                  <td className="py-2 pr-3">
                    <button
                      onClick={() => toggleAttendance(i.id)}
                      className={
                        'px-3 py-1 rounded-full text-xs font-semibold ' +
                        (i.attendance[activeLessonId]
                          ? 'bg-success-50 text-success-600'
                          : 'bg-danger-50 text-danger-500')
                      }
                    >
                      {i.attendance[activeLessonId] ? 'Присутствовал' : 'Отсутствовал'}
                    </button>
                  </td>
                  <td className="py-2 pr-3">
                    <select
                      className="field-input min-w-[150px]"
                      value={i.homework[activeLessonId] || ''}
                      onChange={(e) => setHomework(i.id, e.target.value)}
                    >
                      <option value="">Не указано</option>
                      {HOMEWORK_STATUSES.map((h) => (
                        <option key={h.value} value={h.value}>
                          {h.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      className="field-input min-w-[180px]"
                      value={i.comment}
                      onChange={(e) => setComment(i.id, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
