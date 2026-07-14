import { useMemo, useState } from 'react'
import { useStore } from '../../store/StoreContext.jsx'
import { HOMEWORK_STATUSES } from '../../lib/constants'
import { uid } from '../../store/defaultData'
import { activeVisibleGroups, isTrainerAdmin } from '../../lib/roles'
import { formatDate } from '../../lib/date'
import { computeGroupStats } from '../../lib/groupStats'
import { copyText } from '../../lib/clipboard'
import Avatar from '../../components/Avatar.jsx'
import EmptyState from '../../components/EmptyState.jsx'

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
  const { data, update, currentTrainer } = useStore()
  const { groups, interns } = data
  const admin = isTrainerAdmin(currentTrainer)
  const sortedGroups = useMemo(
    () => activeVisibleGroups(groups, currentTrainer).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [groups, currentTrainer],
  )
  const [groupId, setGroupId] = useState(sortedGroups[0]?.id || '')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)
  const [linkCopiedId, setLinkCopiedId] = useState(null)

  const group = groups.find((g) => g.id === groupId) || null
  const groupInterns = useMemo(() => interns.filter((i) => i.groupId === groupId), [interns, groupId])

  const q = search.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!q) return groupInterns
    return groupInterns.filter((i) => COLUMNS.some((c) => String(i[c.key] ?? '').toLowerCase().includes(q)))
  }, [groupInterns, q])

  const visibleInterns = useMemo(() => {
    const ids = new Set(sortedGroups.map((g) => g.id))
    return interns.filter((i) => ids.has(i.groupId))
  }, [interns, sortedGroups])

  const crossMatches = useMemo(() => {
    if (!q) return []
    return visibleInterns
      .filter((i) => i.groupId !== groupId && COLUMNS.some((c) => String(i[c.key] ?? '').toLowerCase().includes(q)))
      .slice(0, 8)
  }, [visibleInterns, groupId, q])

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

  async function copyTable() {
    const header = COLUMNS.map((c) => c.label).join('\t')
    const rows = filtered.map((i) => COLUMNS.map((c) => i[c.key] ?? '').join('\t'))
    const text = [header, ...rows].join('\n')
    const ok = await copyText(text)
    setCopied(ok ? 'success' : 'error')
    setTimeout(() => setCopied(false), 2000)
  }

  async function copyLink(internId) {
    const url = `${window.location.origin}${window.location.pathname}#/progress/${internId}`
    await copyText(url)
    setLinkCopiedId(internId)
    setTimeout(() => setLinkCopiedId(null), 2000)
  }

  if (sortedGroups.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Список стажёров</h1>
        <EmptyState
          icon="👥"
          title="Сначала создайте группу"
          description="Группа создаётся во вкладке «Настройки сбора» — после этого здесь появится список её стажёров."
        />
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

      {group && <GroupSummary group={group} interns={groupInterns} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          className="field-input max-w-xs"
          placeholder="Поиск по всем группам..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={copyTable} className="btn-secondary shrink-0">
          {copied === 'success' ? 'Скопировано!' : copied === 'error' ? 'Не удалось скопировать' : 'Копировать таблицу'}
        </button>
      </div>

      {crossMatches.length > 0 && (
        <div className="text-sm bg-navy-50 dark:bg-navy-800 rounded-lg p-3 space-y-2">
          <div className="text-xs font-semibold text-navy-500 dark:text-navy-400">Найдено в других группах:</div>
          {crossMatches.map((i) => {
            const g = groups.find((gr) => gr.id === i.groupId)
            return (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {i.lastName} {i.firstName} — <span className="text-navy-500 dark:text-navy-400">{g?.name || '—'}</span>
                </span>
                <button
                  className="btn-secondary text-xs px-2 py-1"
                  onClick={() => {
                    setGroupId(i.groupId)
                    setSearch('')
                  }}
                >
                  Показать
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr className="text-left text-navy-500 dark:text-navy-400 border-b border-navy-100 dark:border-navy-700">
              {COLUMNS.map((c) => (
                <th key={c.key} className="py-2 pr-3 whitespace-nowrap">
                  {c.label}
                </th>
              ))}
              <th className="py-2 pr-3" />
              {admin && <th className="py-2 pr-3" />}
            </tr>
          </thead>
          <tbody>
            {filtered.map((intern) => (
              <tr key={intern.id} className="border-b border-navy-50 dark:border-navy-800 last:border-0">
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
                    onClick={() => copyLink(intern.id)}
                    className="btn-secondary text-xs px-2 py-1 whitespace-nowrap"
                  >
                    {linkCopiedId === intern.id ? 'Скопировано!' : 'Ссылка'}
                  </button>
                </td>
                {admin && (
                  <td className="py-1.5 pr-3">
                    <button
                      onClick={() => deleteIntern(intern.id)}
                      className="text-danger-500 hover:text-danger-600 text-xs whitespace-nowrap"
                    >
                      Удалить
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length + 1 + (admin ? 1 : 0)}
                  className="py-6 text-center text-navy-400 dark:text-navy-500"
                >
                  Анкет не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {group && !group.isOpen && <GroupProgress group={group} interns={groupInterns} update={update} />}
      {group && group.isOpen && (
        <p className="text-sm text-navy-400 dark:text-navy-500">
          Посещаемость и домашние задания станут доступны здесь после закрытия группы.
        </p>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-navy-500 dark:text-navy-400">{label}</div>
    </div>
  )
}

function GroupSummary({ group, interns }) {
  const stats = useMemo(() => computeGroupStats(group, interns), [group, interns])

  return (
    <div className="card">
      <h2 className="font-semibold mb-4">Сводка по группе</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Стажёров" value={interns.length} />
        <Stat label="Посещаемость" value={stats.attendancePct === null ? '—' : `${stats.attendancePct}%`} />
        <Stat label="ДЗ выполнено" value={stats.homeworkPct === null ? '—' : `${stats.homeworkPct}%`} />
        <Stat
          label="Экзамен"
          value={
            <span className="text-sm font-normal space-x-2">
              <span className="text-success-600 dark:text-success-400 font-semibold">{stats.exam.passed} сдали</span>
              <span className="text-warning-600 dark:text-warning-500 font-semibold">{stats.exam.retake} пересдача</span>
              <span className="text-danger-500 font-semibold">{stats.exam.failed} не сдали</span>
              <span className="text-navy-400 dark:text-navy-500 font-semibold">{stats.exam.notStarted} не начат</span>
            </span>
          }
        />
      </div>
    </div>
  )
}

function GroupProgress({ group, interns, update }) {
  const [newLessonName, setNewLessonName] = useState('')
  const [newLessonDate, setNewLessonDate] = useState('')

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
    setNewLessonName('')
    setNewLessonDate('')
  }

  function removeLesson(id) {
    if (!confirm('Удалить это занятие? Отметки посещаемости и ДЗ по нему будут потеряны.')) return
    patchGroup({ lessons: group.lessons.filter((l) => l.id !== id) })
  }

  function toggleAttendance(internId, lessonId) {
    update((prev) => ({
      ...prev,
      interns: prev.interns.map((i) =>
        i.id === internId ? { ...i, attendance: { ...i.attendance, [lessonId]: !i.attendance[lessonId] } } : i,
      ),
    }))
  }

  function setHomework(internId, lessonId, value) {
    update((prev) => ({
      ...prev,
      interns: prev.interns.map((i) =>
        i.id === internId ? { ...i, homework: { ...i.homework, [lessonId]: value } } : i,
      ),
    }))
  }

  function setComment(internId, lessonId, value) {
    update((prev) => ({
      ...prev,
      interns: prev.interns.map((i) =>
        i.id === internId ? { ...i, comments: { ...i.comments, [lessonId]: value } } : i,
      ),
    }))
  }

  return (
    <div className="card space-y-4">
      <h2 className="font-semibold">Прогресс — {group.name}</h2>

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
        <p className="text-navy-400 dark:text-navy-500">В группе нет стажёров.</p>
      ) : group.lessons.length === 0 ? (
        <p className="text-navy-400 dark:text-navy-500">Добавьте занятие, чтобы отмечать посещаемость.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="text-sm border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-navy-500 dark:text-navy-400">
                <th className="sticky left-0 z-10 bg-white dark:bg-navy-900 py-2 pr-3 whitespace-nowrap border-b border-navy-100 dark:border-navy-700">
                  ФИО
                </th>
                {group.lessons.map((l) => (
                  <th
                    key={l.id}
                    className="py-2 px-2 min-w-[190px] border-b border-navy-100 dark:border-navy-700 align-bottom"
                  >
                    <div className="flex items-center justify-between gap-2 font-medium">
                      <span>
                        {l.name}
                        {l.date ? ` · ${formatDate(l.date)}` : ''}
                      </span>
                      <span
                        onClick={() => removeLesson(l.id)}
                        className="opacity-60 hover:opacity-100 cursor-pointer shrink-0"
                        title="Удалить занятие"
                      >
                        ✕
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {interns.map((i) => (
                <tr key={i.id} className="border-b border-navy-50 dark:border-navy-800 last:border-0">
                  <td className="sticky left-0 z-10 bg-white dark:bg-navy-900 py-2 pr-3 whitespace-nowrap font-medium align-top">
                    <div className="flex items-center gap-2">
                      <Avatar name={`${i.firstName} ${i.lastName}`} size={28} />
                      <span>
                        {i.lastName} {i.firstName}
                      </span>
                    </div>
                  </td>
                  {group.lessons.map((l) => (
                    <td key={l.id} className="py-2 px-2 align-top">
                      <div className="space-y-1.5">
                        <button
                          onClick={() => toggleAttendance(i.id, l.id)}
                          className={
                            'w-full px-2 py-1 rounded-full text-xs font-semibold ' +
                            (i.attendance[l.id]
                              ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400'
                              : 'bg-danger-50 text-danger-500 dark:bg-danger-500/10 dark:text-danger-400')
                          }
                        >
                          {i.attendance[l.id] ? 'Присутствовал' : 'Отсутствовал'}
                        </button>
                        <select
                          className="field-input text-xs py-1"
                          value={i.homework[l.id] || ''}
                          onChange={(e) => setHomework(i.id, l.id, e.target.value)}
                        >
                          <option value="">ДЗ: не указано</option>
                          {HOMEWORK_STATUSES.map((h) => (
                            <option key={h.value} value={h.value}>
                              {h.label}
                            </option>
                          ))}
                        </select>
                        <input
                          className="field-input text-xs py-1"
                          placeholder="Комментарий"
                          value={i.comments?.[l.id] || ''}
                          onChange={(e) => setComment(i.id, l.id, e.target.value)}
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
