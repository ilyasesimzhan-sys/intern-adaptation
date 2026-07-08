import { useState } from 'react'
import { useStore } from '../../store/StoreContext.jsx'
import { uid } from '../../store/defaultData'
import { groupsWithCounts } from '../../lib/groups'
import { GROUP_CAPACITY } from '../../lib/constants'

const COLUMNS = [
  { key: 'lastName', label: 'Фамилия' },
  { key: 'firstName', label: 'Имя' },
  { key: 'department', label: 'Подразделение' },
  { key: 'city', label: 'Город' },
]

export default function SettingsTab() {
  const { data, update } = useStore()
  const { settings, groups, interns } = data
  const [newGroupName, setNewGroupName] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  function patchSettings(patch) {
    update((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  }

  function createGroup() {
    const name = newGroupName.trim()
    if (!name) return
    const group = { id: uid(), name, isOpen: true, lessons: [], createdAt: new Date().toISOString() }
    update((prev) => ({ ...prev, groups: [...prev.groups, group] }))
    setNewGroupName('')
    setExpandedId(group.id)
  }

  function toggleGroupOpen(groupId) {
    update((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => (g.id === groupId ? { ...g, isOpen: !g.isOpen } : g)),
    }))
  }

  function deleteGroup(groupId) {
    const count = interns.filter((i) => i.groupId === groupId).length
    if (count > 0) {
      alert('В этой группе есть стажёры — сначала перенесите или удалите их в «Списке стажёров».')
      return
    }
    if (!confirm('Удалить эту группу?')) return
    update((prev) => ({ ...prev, groups: prev.groups.filter((g) => g.id !== groupId) }))
  }

  const groupsInfo = groupsWithCounts(groups, interns)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Настройки сбора</h1>

      <div className="card space-y-4">
        <label className="field-label">Название программы</label>
        <input
          className="field-input"
          value={settings.programName}
          onChange={(e) => patchSettings({ programName: e.target.value })}
        />
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">Группы</h2>
        <p className="text-sm text-navy-500">
          Можно открыть сразу несколько групп — каждая принимает анкеты независимо, до {GROUP_CAPACITY} участников.
        </p>

        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="field-label">Название новой группы</label>
            <input
              className="field-input"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Например, Стажёры — июль 2026"
            />
          </div>
          <button onClick={createGroup} className="btn-primary shrink-0">
            Создать группу
          </button>
        </div>

        <div className="space-y-3">
          {groupsInfo.length === 0 && <p className="text-navy-400">Групп пока нет.</p>}
          {groupsInfo.map((g) => {
            const expanded = expandedId === g.id
            const members = interns.filter((i) => i.groupId === g.id)
            return (
              <div key={g.id} className="border border-navy-100 rounded-xl overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <button
                    onClick={() => setExpandedId(expanded ? null : g.id)}
                    className="flex items-center gap-3 text-left"
                  >
                    <span className={'text-navy-400 transition-transform ' + (expanded ? 'rotate-90' : '')}>▶</span>
                    <div>
                      <div className="font-semibold">{g.name}</div>
                      <div className="text-sm text-navy-500">
                        {g.count}/{GROUP_CAPACITY} участников
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={
                        'px-2 py-1 rounded-full text-xs font-semibold ' +
                        (g.isOpen ? 'bg-success-50 text-success-600' : 'bg-navy-100 text-navy-500')
                      }
                    >
                      {g.isOpen ? 'Открыта' : 'Закрыта'}
                    </span>
                    <button onClick={() => toggleGroupOpen(g.id)} className="btn-secondary text-xs px-3 py-1.5">
                      {g.isOpen ? 'Закрыть' : 'Открыть заново'}
                    </button>
                    <button
                      onClick={() => deleteGroup(g.id)}
                      className="text-danger-500 hover:text-danger-600 text-xs"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div className="border-t border-navy-100 p-4 overflow-x-auto">
                    {members.length === 0 ? (
                      <p className="text-navy-400 text-sm">В группе пока нет стажёров.</p>
                    ) : (
                      <table className="w-full text-sm min-w-[400px]">
                        <thead>
                          <tr className="text-left text-navy-500 border-b border-navy-100">
                            {COLUMNS.map((c) => (
                              <th key={c.key} className="py-1.5 pr-3">
                                {c.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((i) => (
                            <tr key={i.id} className="border-b border-navy-50 last:border-0">
                              {COLUMNS.map((c) => (
                                <td key={c.key} className="py-1.5 pr-3">
                                  {i[c.key]}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
