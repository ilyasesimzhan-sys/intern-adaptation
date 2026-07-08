import { useState } from 'react'
import { useStore } from '../../store/StoreContext.jsx'
import { HOMEWORK_STATUSES } from '../../lib/constants'
import { uid } from '../../store/defaultData'

export default function ProgressTab() {
  const { data, update } = useStore()
  const { settings, interns } = data
  const [newLessonName, setNewLessonName] = useState('')
  const [newLessonDate, setNewLessonDate] = useState('')
  const [activeLessonId, setActiveLessonId] = useState(settings.lessons[0]?.id || '')

  const activeLesson = settings.lessons.find((l) => l.id === activeLessonId)

  function addLesson() {
    if (!newLessonName.trim()) return
    const lesson = { id: uid(), name: newLessonName.trim(), date: newLessonDate }
    update((prev) => ({
      ...prev,
      settings: { ...prev.settings, lessons: [...prev.settings.lessons, lesson] },
    }))
    setActiveLessonId(lesson.id)
    setNewLessonName('')
    setNewLessonDate('')
  }

  function removeLesson(id) {
    if (!confirm('Удалить это занятие? Отметки посещаемости и ДЗ по нему будут потеряны.')) return
    update((prev) => ({
      ...prev,
      settings: { ...prev.settings, lessons: prev.settings.lessons.filter((l) => l.id !== id) },
    }))
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
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Прогресс</h1>

      <div className="card space-y-4">
        <h2 className="font-semibold">Занятия</h2>
        <div className="flex flex-wrap gap-2">
          {settings.lessons.map((l) => (
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
      </div>

      {interns.length === 0 ? (
        <p className="text-navy-400">Нет ни одного стажёра.</p>
      ) : !activeLesson ? (
        <p className="text-navy-400">Добавьте и выберите занятие, чтобы отмечать посещаемость.</p>
      ) : (
        <div className="card overflow-x-auto">
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
