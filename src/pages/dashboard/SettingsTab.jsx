import { useState } from 'react'
import { useStore } from '../../store/StoreContext.jsx'
import { uid } from '../../store/defaultData'
import { groupsWithCounts } from '../../lib/groups'
import { GROUP_CAPACITY } from '../../lib/constants'
import { isTrainerAdmin, activeVisibleGroups } from '../../lib/roles'

const COLUMNS = [
  { key: 'lastName', label: 'Фамилия' },
  { key: 'firstName', label: 'Имя' },
  { key: 'department', label: 'Подразделение' },
  { key: 'city', label: 'Город' },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function SettingsTab() {
  const { data, update, currentTrainer } = useStore()
  const { settings, groups, interns, trainers } = data
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupOwnerId, setNewGroupOwnerId] = useState('')
  const admin = isTrainerAdmin(currentTrainer)

  function patchSettings(patch) {
    update((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  }

  function patchGroup(groupId, patch) {
    update((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => (g.id === groupId ? { ...g, ...patch } : g)),
    }))
  }

  function createGroup() {
    const name = newGroupName.trim()
    if (!name) return
    if (admin && !newGroupOwnerId) {
      alert('Назначьте владельца группы — себя или любого другого тренера.')
      return
    }
    const group = {
      id: uid(),
      name,
      ownerId: admin ? newGroupOwnerId : currentTrainer.id,
      isOpen: false,
      startDate: '',
      endDate: '',
      lessons: [],
      createdAt: new Date().toISOString(),
    }
    update((prev) => ({ ...prev, groups: [...prev.groups, group] }))
    setNewGroupName('')
    setNewGroupOwnerId('')
  }

  function reassignOwner(groupId, ownerId) {
    patchGroup(groupId, { ownerId })
  }

  function startGroup(group) {
    patchGroup(group.id, { isOpen: true, startDate: group.startDate || today(), endDate: '' })
  }

  function stopGroup(group) {
    patchGroup(group.id, { isOpen: false, endDate: group.endDate || today() })
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

  const groupsInfo = groupsWithCounts(activeVisibleGroups(groups, currentTrainer), interns)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Настройки сбора</h1>

      <div className="card space-y-4">
        <div>
          <label className="field-label">Название программы</label>
          <input
            className="field-input"
            value={settings.programName}
            onChange={(e) => patchSettings({ programName: e.target.value })}
          />
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">Группы</h2>
        <p className="text-sm text-navy-500 dark:text-navy-400">
          Можно вести сразу несколько групп — у каждой свой приём анкет, до {GROUP_CAPACITY} участников. Даты
          открытия/закрытия приёма видны руководителям на главной странице. Отправить группу в архив можно во
          вкладке «Итоговый экзамен», когда всем стажёрам выставлен балл.
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
          {admin && (
            <div className="min-w-[180px]">
              <label className="field-label">Владелец группы</label>
              <select
                className="field-input"
                value={newGroupOwnerId}
                onChange={(e) => setNewGroupOwnerId(e.target.value)}
              >
                <option value="">Выберите тренера</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.id === currentTrainer.id ? ' (я)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button onClick={createGroup} className="btn-primary shrink-0">
            Создать группу
          </button>
        </div>

        <div className="space-y-3">
          {groupsInfo.length === 0 && <p className="text-navy-400 dark:text-navy-500">Групп пока нет.</p>}
          {groupsInfo.map((g) => {
            const members = interns.filter((i) => i.groupId === g.id)
            return (
              <div key={g.id} className="border border-navy-100 dark:border-navy-700 rounded-xl overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <div className="font-semibold">{g.name}</div>
                    <div className="text-sm text-navy-500 dark:text-navy-400">
                      {g.count}/{GROUP_CAPACITY} участников
                    </div>
                  </div>
                  <span
                    className={
                      'px-2 py-1 rounded-full text-xs font-semibold shrink-0 ' +
                      (g.isOpen
                        ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400'
                        : 'bg-navy-100 text-navy-500 dark:bg-navy-800 dark:text-navy-400')
                    }
                  >
                    {g.isOpen ? 'Открыта' : 'Закрыта'}
                  </span>
                </div>

                <div className="border-t border-navy-100 dark:border-navy-700 p-4 space-y-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="field-label">Дата открытия приёма</label>
                      <input
                        type="date"
                        className="field-input max-w-[170px]"
                        value={g.startDate}
                        onChange={(e) => patchGroup(g.id, { startDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="field-label">Дата закрытия приёма</label>
                      <input
                        type="date"
                        className="field-input max-w-[170px]"
                        value={g.endDate}
                        onChange={(e) => patchGroup(g.id, { endDate: e.target.value })}
                      />
                    </div>
                    {admin && (
                      <div>
                        <label className="field-label">Владелец группы</label>
                        <select
                          className="field-input min-w-[160px]"
                          value={g.ownerId || ''}
                          onChange={(e) => reassignOwner(g.id, e.target.value)}
                        >
                          <option value="">Без владельца</option>
                          {trainers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                              {t.id === currentTrainer.id ? ' (я)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {g.isOpen ? (
                      <button onClick={() => stopGroup(g)} className="btn-secondary text-sm">
                        Закрыть приём
                      </button>
                    ) : (
                      <button onClick={() => startGroup(g)} className="btn-success text-sm">
                        Открыть приём
                      </button>
                    )}
                    <button
                      onClick={() => deleteGroup(g.id)}
                      className="text-danger-500 hover:text-danger-600 text-xs ml-auto"
                    >
                      Удалить
                    </button>
                  </div>

                  <div className="overflow-x-auto pt-2 border-t border-navy-50 dark:border-navy-800">
                    {members.length === 0 ? (
                      <p className="text-navy-400 dark:text-navy-500 text-sm">В группе пока нет стажёров.</p>
                    ) : (
                      <table className="w-full text-sm min-w-[400px]">
                        <thead>
                          <tr className="text-left text-navy-500 dark:text-navy-400 border-b border-navy-100 dark:border-navy-700">
                            {COLUMNS.map((c) => (
                              <th key={c.key} className="py-1.5 pr-3">
                                {c.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((i) => (
                            <tr key={i.id} className="border-b border-navy-50 dark:border-navy-800 last:border-0">
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
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
