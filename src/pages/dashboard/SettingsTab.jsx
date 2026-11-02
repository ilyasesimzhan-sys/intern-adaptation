import { useState } from 'react'
import { useStore } from '../../store/StoreContext.jsx'
import { uid } from '../../store/defaultData'
import { groupsWithCounts, splitInternsByCity } from '../../lib/groups'
import { GROUP_CAPACITY } from '../../lib/constants'
import { isTrainerAdmin, activeVisibleGroups } from '../../lib/roles'

const COLUMNS = [
  { key: 'lastName', label: 'Фамилия' },
  { key: 'firstName', label: 'Имя' },
  { key: 'department', label: 'Подразделение' },
  { key: 'city', label: 'Город/район' },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function SettingsTab() {
  const { data, update, currentTrainer } = useStore()
  const { settings, groups, interns, trainers } = data
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupOwnerId, setNewGroupOwnerId] = useState('')
  const [createError, setCreateError] = useState('')
  // Подтверждение удаления и переименование — прямо в карточке группы, без системных окон confirm/alert,
  // которые некоторые браузеры (в т.ч. встроенные) молча блокируют.
  const [deleteState, setDeleteState] = useState({ id: null, blocked: false })
  const [rename, setRename] = useState({ id: null, value: '' })
  // Предпросмотр деления группы на две: { groupId, parts: [[...], [...]] }
  const [split, setSplit] = useState(null)
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
      setCreateError('Назначьте владельца группы — себя или любого другого тренера.')
      return
    }
    setCreateError('')
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

  function askDeleteGroup(groupId) {
    const blocked = interns.some((i) => i.groupId === groupId)
    setDeleteState({ id: groupId, blocked })
  }

  function deleteGroup(groupId) {
    setDeleteState({ id: null, blocked: false })
    update((prev) => ({ ...prev, groups: prev.groups.filter((g) => g.id !== groupId) }))
  }

  function previewSplit(groupId) {
    setSplit({ groupId, parts: splitInternsByCity(interns.filter((i) => i.groupId === groupId)) })
  }

  // Вторая группа получает те же занятия (с теми же id), поэтому уже отмеченные посещаемость и ДЗ сохраняются.
  function confirmSplit(group) {
    const newId = uid()
    const movedIds = new Set(split.parts[1].map((i) => i.id))
    update((prev) => ({
      ...prev,
      groups: [
        ...prev.groups.map((g) => (g.id === group.id ? { ...g, name: `${group.name} (1)` } : g)),
        {
          ...group,
          id: newId,
          name: `${group.name} (2)`,
          lessons: (group.lessons || []).map((l) => ({ ...l })),
          createdAt: new Date().toISOString(),
        },
      ],
      interns: prev.interns.map((i) => (movedIds.has(i.id) ? { ...i, groupId: newId } : i)),
    }))
    setSplit(null)
  }

  function saveRename() {
    const name = rename.value.trim()
    if (!name) return
    patchGroup(rename.id, { name })
    setRename({ id: null, value: '' })
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
        {createError && <p className="text-sm text-danger-500">{createError}</p>}

        <div className="space-y-3">
          {groupsInfo.length === 0 && <p className="text-navy-400 dark:text-navy-500">Групп пока нет.</p>}
          {groupsInfo.map((g) => {
            const members = interns.filter((i) => i.groupId === g.id)
            return (
              <div key={g.id} className="border border-navy-100 dark:border-navy-700 rounded-xl overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex-1 min-w-[200px]">
                    {rename.id === g.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          className="field-input flex-1 min-w-[200px]"
                          value={rename.value}
                          autoFocus
                          onChange={(e) => setRename({ id: g.id, value: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRename()
                            if (e.key === 'Escape') setRename({ id: null, value: '' })
                          }}
                        />
                        <button onClick={saveRename} disabled={!rename.value.trim()} className="btn-primary text-sm">
                          Сохранить
                        </button>
                        <button onClick={() => setRename({ id: null, value: '' })} className="btn-secondary text-sm">
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="font-semibold">{g.name}</div>
                        {admin && (
                          <button
                            onClick={() => setRename({ id: g.id, value: g.name })}
                            className="text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400"
                          >
                            Переименовать
                          </button>
                        )}
                      </div>
                    )}
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
                    {!g.isOpen && members.length >= 2 && split?.groupId !== g.id && (
                      <button onClick={() => previewSplit(g.id)} className="btn-secondary text-sm">
                        Поделить на 2
                      </button>
                    )}
                    {deleteState.id !== g.id && (
                      <button
                        onClick={() => askDeleteGroup(g.id)}
                        className="text-danger-500 hover:text-danger-600 text-xs ml-auto"
                      >
                        Удалить
                      </button>
                    )}
                  </div>

                  {deleteState.id === g.id &&
                    (deleteState.blocked ? (
                      <div className="flex flex-wrap items-center gap-3 text-sm text-danger-500">
                        В этой группе есть стажёры — сначала перенесите или удалите их в «Списке стажёров».
                        <button
                          onClick={() => setDeleteState({ id: null, blocked: false })}
                          className="btn-secondary text-sm"
                        >
                          Понятно
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="text-danger-500 font-semibold">Удалить группу «{g.name}»?</span>
                        <button
                          onClick={() => deleteGroup(g.id)}
                          className="text-sm px-3 py-1.5 rounded-lg bg-danger-500 hover:bg-danger-600 text-white font-semibold"
                        >
                          Да, удалить
                        </button>
                        <button
                          onClick={() => setDeleteState({ id: null, blocked: false })}
                          className="btn-secondary text-sm"
                        >
                          Отмена
                        </button>
                      </div>
                    ))}

                  {split?.groupId === g.id && (
                    <div className="rounded-xl border border-sky-200 dark:border-sky-800 p-3 space-y-3">
                      <div className="text-sm">
                        <span className="font-semibold">Предпросмотр деления.</span>{' '}
                        <span className="text-navy-500 dark:text-navy-400">
                          Стажёры распределены случайно, каждый город/район — поровну между группами. Можно
                          перемешать ещё раз.
                        </span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {split.parts.map((part, idx) => (
                          <div key={idx} className="rounded-lg bg-navy-50 dark:bg-navy-800/60 p-3">
                            <div className="font-semibold text-sm mb-2">
                              {g.name} ({idx + 1}) — {part.length} чел.
                            </div>
                            <ul className="text-sm space-y-0.5">
                              {[...part]
                                .sort((a, b) => (a.city || '').localeCompare(b.city || '', 'ru'))
                                .map((i) => (
                                  <li key={i.id}>
                                    {i.lastName} {i.firstName}
                                    <span className="text-navy-400 dark:text-navy-500"> · {i.city || 'город не указан'}</span>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => confirmSplit(g)} className="btn-primary text-sm">
                          Поделить
                        </button>
                        <button onClick={() => previewSplit(g.id)} className="btn-secondary text-sm">
                          Перемешать ещё раз
                        </button>
                        <button onClick={() => setSplit(null)} className="btn-secondary text-sm">
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}

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
