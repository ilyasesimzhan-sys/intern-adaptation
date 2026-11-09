import { useRef, useState } from 'react'
import { useStore } from '../../store/StoreContext.jsx'
import { uid } from '../../store/defaultData'
import {
  groupsWithCounts,
  splitInternsByCity,
  isPastCloseDeadline,
  isGroupOpen,
  AUTO_CLOSE_TIME,
} from '../../lib/groups'
import { GROUP_CAPACITY } from '../../lib/constants'
import { isTrainerAdmin, activeVisibleGroups } from '../../lib/roles'
import { msg, useI18n } from '../../i18n/I18nContext.jsx'
import Avatar from '../../components/Avatar.jsx'

const COLUMNS = [
  { key: 'lastName', label: msg('Фамилия') },
  { key: 'firstName', label: msg('Имя') },
  { key: 'department', label: msg('Подразделение') },
  { key: 'city', label: msg('Город/район') },
]

const DAY_MS = 24 * 60 * 60 * 1000

function today() {
  return new Date().toISOString().slice(0, 10)
}

// «2026-11-10» → части даты без сдвига часового пояса.
function parseDay(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '')
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate(), weekday: d.getDay(), time: d.getTime() }
}

// Состояние приёма: открыт / срок вышел (открыт вручную, но дата закрытия прошла) / закрыт.
function groupStatus(g) {
  if (isGroupOpen(g)) return 'open'
  if (g.isOpen && isPastCloseDeadline(g)) return 'expired'
  return 'closed'
}

const STATUS_STYLE = {
  open: {
    label: msg('Приём открыт'),
    bar: 'bg-success-500',
    head: 'from-success-50 to-white dark:from-success-500/10 dark:to-navy-900',
    pill: 'bg-success-500 text-white',
    dot: 'bg-white',
  },
  expired: {
    label: msg('Срок приёма вышел'),
    bar: 'bg-warning-500',
    head: 'from-warning-50 to-white dark:from-warning-500/10 dark:to-navy-900',
    pill: 'bg-warning-500 text-white',
    dot: 'bg-white',
  },
  closed: {
    label: msg('Приём закрыт'),
    bar: 'bg-navy-300 dark:bg-navy-600',
    head: 'from-navy-50 to-white dark:from-navy-800/60 dark:to-navy-900',
    pill: 'bg-navy-100 text-navy-600 dark:bg-navy-800 dark:text-navy-300',
    dot: 'bg-navy-400',
  },
}

// Дата в виде листка календаря. Нажатие открывает выбор даты.
function DateTile({ label, value, onChange, accent }) {
  const { t, monthShort, weekdayShort } = useI18n()
  const ref = useRef(null)
  const d = parseDay(value)
  function open() {
    const input = ref.current
    if (!input) return
    try {
      input.showPicker()
    } catch {
      input.focus()
      input.click()
    }
  }
  return (
    <div className="relative">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-navy-400 dark:text-navy-500 mb-1.5">{label}</div>
      <button
        type="button"
        onClick={open}
        className="group block w-[104px] rounded-xl overflow-hidden border border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition text-center"
        title={t('Нажмите, чтобы выбрать дату')}
      >
        <div className={'text-[11px] font-bold uppercase tracking-wider text-white py-1 ' + accent}>
          {d ? `${monthShort(d.month)} ${d.year}` : t('Дата')}
        </div>
        {d ? (
          <div className="py-1.5">
            <div className="font-display text-3xl font-extrabold leading-none text-navy-800 dark:text-white">{d.day}</div>
            <div className="text-xs text-navy-400 dark:text-navy-400 mt-1">{weekdayShort(d.weekday)}</div>
          </div>
        ) : (
          <div className="py-2.5 text-xs text-navy-400 group-hover:text-navy-600 dark:group-hover:text-navy-200">
            {t('не задана')}
            <div className="text-sky-600 dark:text-sky-400 font-semibold mt-0.5">+ {t('выбрать')}</div>
          </div>
        )}
      </button>
      <input
        ref={ref}
        type="date"
        tabIndex={-1}
        aria-label={label}
        className="absolute left-0 bottom-0 w-[104px] h-0 opacity-0 pointer-events-none"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export default function SettingsTab() {
  const { t: tr } = useI18n()
  const { data, update, currentTrainer } = useStore()
  const { groups, interns, trainers } = data
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupOwnerId, setNewGroupOwnerId] = useState('')
  const [createError, setCreateError] = useState('')
  // Подтверждение удаления и переименование — прямо в карточке группы, без системных окон confirm/alert,
  // которые некоторые браузеры (в т.ч. встроенные) молча блокируют.
  const [deleteState, setDeleteState] = useState({ id: null, blocked: false })
  const [rename, setRename] = useState({ id: null, value: '' })
  // Предпросмотр деления группы на две: { groupId, parts: [[...], [...]], ownerId }
  // ownerId — тренер, которому передаётся вторая группа; после деления она пропадает у исходного тренера.
  const [split, setSplit] = useState(null)
  // Открытые списки стажёров по группам
  const [openLists, setOpenLists] = useState({})
  const admin = isTrainerAdmin(currentTrainer)

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
      setCreateError(msg('Назначьте владельца группы — себя или любого другого тренера.'))
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

  // Будущая дата закрытия сохраняется (по ней приём закроется сам), прошедшая — сбрасывается,
  // иначе группа закрылась бы сразу после открытия.
  function startGroup(group) {
    const endDate = isPastCloseDeadline(group) ? '' : group.endDate || ''
    patchGroup(group.id, { isOpen: true, startDate: group.startDate || today(), endDate })
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
    update((prev) => ({ ...prev, groups: prev.groups.filter((g) => g.id !== groupId) }), {
      label: `Удалена группа «${groups.find((g) => g.id === groupId)?.name || '—'}»`,
    })
  }

  function previewSplit(groupId) {
    setSplit((prev) => ({
      groupId,
      parts: splitInternsByCity(interns.filter((i) => i.groupId === groupId)),
      ownerId: prev?.groupId === groupId ? prev.ownerId : '',
    }))
  }

  // Вторая группа получает те же занятия (с теми же id), поэтому уже отмеченные посещаемость и ДЗ сохраняются.
  function confirmSplit(group) {
    if (!split.ownerId) return
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
          ownerId: split.ownerId,
          lessons: (group.lessons || []).map((l) => ({ ...l })),
          createdAt: new Date().toISOString(),
        },
      ],
      interns: prev.interns.map((i) => (movedIds.has(i.id) ? { ...i, groupId: newId } : i)),
    }), {
      label: `Группа «${group.name}» поделена на две; вторая передана тренеру ${trainers.find((t) => t.id === split.ownerId)?.name || '—'}`,
    })
    setSplit(null)
  }

  function saveRename() {
    const name = rename.value.trim()
    if (!name) return
    patchGroup(rename.id, { name })
    setRename({ id: null, value: '' })
  }

  const groupsInfo = groupsWithCounts(activeVisibleGroups(groups, currentTrainer), interns)
  const openCount = groupsInfo.filter((g) => groupStatus(g) === 'open').length
  const internsTotal = groupsInfo.reduce((s, g) => s + g.count, 0)
  const freeSeats = groupsInfo
    .filter((g) => groupStatus(g) === 'open')
    .reduce((s, g) => s + Math.max(0, GROUP_CAPACITY - g.count), 0)

  const trainerSelect = (value, onChange, emptyLabel, extraClass = '') => (
    <select className={'field-input ' + extraClass} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{emptyLabel}</option>
      {trainers.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
          {t.id === currentTrainer.id ? ' ' + tr('(я)') : ''}
        </option>
      ))}
    </select>
  )

  return (
    <div className="space-y-6">
      {/* Шапка с итогами */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-700 via-navy-600 to-sky-500 text-white p-6 shadow-sm">
        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/10" aria-hidden />
        <div className="absolute right-24 -bottom-14 w-32 h-32 rounded-full bg-white/10" aria-hidden />
        <div className="relative">
          <h1 className="font-display text-2xl font-extrabold">{tr('Настройки сбора')}</h1>
          <p className="text-white/80 text-sm mt-1 max-w-xl">
            {tr('Здесь вы создаёте группы, выбираете даты приёма анкет и назначаете тренера.')}
          </p>
          <div className="grid grid-cols-3 gap-3 mt-5 max-w-lg">
            {[
              [openCount, tr('групп принимают анкеты')],
              [internsTotal, tr('стажёров в группах')],
              [freeSeats, tr('свободных мест')],
            ].map(([n, label]) => (
              <div key={label} className="rounded-xl bg-white/15 backdrop-blur-sm px-3 py-2.5">
                <div className="font-display text-2xl font-extrabold leading-none">{n}</div>
                <div className="text-[11px] text-white/80 mt-1 leading-tight">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Как это работает */}
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          [tr('Создайте группу'), tr('До {capacity} стажёров в одной группе.', { capacity: GROUP_CAPACITY })],
          [tr('Выберите даты и откройте приём'), tr('Руководители видят даты на главной странице.')],
          [tr('Приём закроется сам'), tr('В дату закрытия в {time} по времени Казахстана.', { time: AUTO_CLOSE_TIME })],
        ].map(([title, text], idx) => (
          <div key={idx} className="flex gap-3 rounded-xl bg-white dark:bg-navy-900 border border-navy-100 dark:border-navy-800 p-3">
            <div className="w-7 h-7 shrink-0 rounded-full bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400 font-bold text-sm flex items-center justify-center">
              {idx + 1}
            </div>
            <div>
              <div className="text-sm font-semibold">{title}</div>
              <div className="text-xs text-navy-500 dark:text-navy-400 mt-0.5">{text}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Новая группа */}
      <div className="rounded-2xl border-2 border-dashed border-sky-200 dark:border-sky-500/30 bg-sky-50/50 dark:bg-sky-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-7 h-7 rounded-full bg-sky-500 text-white text-lg leading-none flex items-center justify-center">+</span>
          <h2 className="font-semibold">{tr('Новая группа')}</h2>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="field-label">{tr('Название новой группы')}</label>
            <input
              className="field-input bg-white"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createGroup()}
              placeholder={tr('Например, Стажёры — июль 2026')}
            />
          </div>
          {admin && (
            <div className="min-w-[180px]">
              <label className="field-label">{tr('Тренер группы')}</label>
              {trainerSelect(newGroupOwnerId, setNewGroupOwnerId, tr('Выберите тренера'), 'bg-white')}
            </div>
          )}
          <button onClick={createGroup} disabled={!newGroupName.trim()} className="btn-primary shrink-0">
            {tr('Создать группу')}
          </button>
        </div>
        {createError && <p className="text-sm text-danger-500 mt-2">{tr(createError)}</p>}
      </div>

      {/* Группы */}
      <div className="space-y-4">
        {groupsInfo.length === 0 && (
          <div className="card text-center text-navy-400 dark:text-navy-500">{tr('Групп пока нет.')}</div>
        )}
        {groupsInfo.map((g) => {
          const members = interns.filter((i) => i.groupId === g.id)
          const status = groupStatus(g)
          const st = STATUS_STYLE[status]
          const owner = trainers.find((t) => t.id === g.ownerId)
          const fill = Math.min(100, Math.round((g.count / GROUP_CAPACITY) * 100))
          const fillColor =
            g.count >= GROUP_CAPACITY ? 'bg-danger-500' : g.count >= GROUP_CAPACITY * 0.9 ? 'bg-warning-500' : 'bg-success-500'
          const start = parseDay(g.startDate)
          const end = parseDay(g.endDate)
          const spanDays = start && end ? Math.round((end.time - start.time) / DAY_MS) : null
          // Сколько календарных дней до даты закрытия: 0 — сегодня, 1 — завтра.
          const now = new Date()
          const daysLeft =
            status === 'open' && end
              ? Math.round((end.time - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / DAY_MS)
              : null
          const listOpen = Boolean(openLists[g.id])

          return (
            <div
              key={g.id}
              className="relative rounded-2xl overflow-hidden bg-white dark:bg-navy-900 border border-navy-100 dark:border-navy-800 shadow-sm"
            >
              <div className={'absolute left-0 top-0 bottom-0 w-1.5 ' + st.bar} aria-hidden />

              {/* Заголовок карточки */}
              <div className={'bg-gradient-to-r pl-6 pr-4 py-4 ' + st.head}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-[220px]">
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
                          {tr('Сохранить')}
                        </button>
                        <button onClick={() => setRename({ id: null, value: '' })} className="btn-secondary text-sm">
                          {tr('Отмена')}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h3 className="font-display text-xl font-extrabold text-navy-800 dark:text-white">{g.name}</h3>
                        {admin && (
                          <button
                            onClick={() => setRename({ id: g.id, value: g.name })}
                            className="text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400"
                          >
                            ✎ {tr('Переименовать')}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Заполненность */}
                    <div className="mt-2.5 flex items-center gap-3 max-w-sm">
                      <div className="flex-1 h-2 rounded-full bg-navy-100 dark:bg-navy-800 overflow-hidden">
                        <div className={'h-full rounded-full transition-all ' + fillColor} style={{ width: fill + '%' }} />
                      </div>
                      <div className="text-sm font-semibold text-navy-600 dark:text-navy-300 whitespace-nowrap">
                        {tr('{count}/{capacity} участников', { count: g.count, capacity: GROUP_CAPACITY })}
                      </div>
                    </div>
                  </div>

                  <span className={'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 ' + st.pill}>
                    <span className="relative flex w-2 h-2">
                      {status === 'open' && <span className="absolute inset-0 rounded-full bg-white animate-ping opacity-75" />}
                      <span className={'relative w-2 h-2 rounded-full ' + st.dot} />
                    </span>
                    {tr(st.label)}
                  </span>
                </div>
              </div>

              <div className="pl-6 pr-4 py-4 space-y-4 border-t border-navy-100 dark:border-navy-800">
                <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
                  {/* Даты приёма */}
                  <div className="flex items-end gap-2">
                    <DateTile
                      label={tr('Открытие приёма')}
                      value={g.startDate}
                      onChange={(v) => patchGroup(g.id, { startDate: v })}
                      accent="bg-success-500"
                    />
                    <div className="pb-8 px-1 text-center min-w-[56px]">
                      <div className="text-navy-300 dark:text-navy-600 text-lg leading-none">→</div>
                      {spanDays != null && spanDays >= 0 && (
                        <div className="text-[11px] text-navy-400 mt-1 whitespace-nowrap">{tr('{n} дн.', { n: spanDays })}</div>
                      )}
                    </div>
                    <DateTile
                      label={tr('Закрытие приёма')}
                      value={g.endDate}
                      onChange={(v) => patchGroup(g.id, { endDate: v })}
                      accent="bg-danger-500"
                    />
                  </div>

                  {/* Тренер */}
                  <div className="min-w-[220px] flex-1 max-w-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-navy-400 dark:text-navy-500 mb-1.5">
                      {tr('Тренер группы')}
                    </div>
                    <div className="flex items-center gap-3 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 p-2.5">
                      <div className="rounded-full ring-2 ring-violet-400 ring-offset-2 ring-offset-violet-50 dark:ring-offset-navy-900">
                        <Avatar src={owner?.photo} name={owner?.name} position={owner?.photoPosition} size={40} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {admin ? (
                          <select
                            className="w-full bg-transparent font-semibold text-violet-700 dark:text-violet-400 focus:outline-none cursor-pointer"
                            value={g.ownerId || ''}
                            onChange={(e) => reassignOwner(g.id, e.target.value)}
                            title={tr('Сменить тренера')}
                          >
                            <option value="">{tr('Без владельца')}</option>
                            {trainers.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                                {t.id === currentTrainer.id ? ' ' + tr('(я)') : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="font-semibold text-violet-700 dark:text-violet-400 truncate">
                            {owner?.name || tr('Без владельца')}
                          </div>
                        )}
                        {owner?.phone && <div className="text-xs text-navy-500 dark:text-navy-400 truncate">{owner.phone}</div>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Подсказка о сроке */}
                {status === 'open' && daysLeft != null && (
                  <div className="text-sm rounded-lg bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400 px-3 py-2">
                    ⏱{' '}
                    {daysLeft <= 1
                      ? tr('Приём закроется автоматически {date} в {time}', {
                          date: daysLeft <= 0 ? tr('сегодня') : tr('завтра'),
                          time: AUTO_CLOSE_TIME,
                        })
                      : tr('Приём закроется автоматически через {n} дн., в {time}', { n: daysLeft, time: AUTO_CLOSE_TIME })}
                  </div>
                )}
                {status === 'open' && !g.endDate && (
                  <div className="text-sm rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 px-3 py-2">
                    {tr('Дата закрытия не выбрана — приём будет открыт, пока вы его не закроете.')}
                  </div>
                )}
                {status === 'expired' && (
                  <div className="text-sm rounded-lg bg-warning-50 dark:bg-warning-500/10 text-warning-600 px-3 py-2">
                    {tr('Дата закрытия прошла, анкеты больше не принимаются. Чтобы продлить приём, выберите новую дату закрытия.')}
                  </div>
                )}

                {/* Действия */}
                <div className="flex flex-wrap items-center gap-2">
                  {g.isOpen ? (
                    <button onClick={() => stopGroup(g)} className="btn-secondary text-sm">
                      ■ {tr('Закрыть приём')}
                    </button>
                  ) : (
                    <button onClick={() => startGroup(g)} className="btn-success text-sm">
                      ▶ {tr('Открыть приём')}
                    </button>
                  )}
                  {!g.isOpen && members.length >= 2 && split?.groupId !== g.id && (
                    <button onClick={() => previewSplit(g.id)} className="btn-secondary text-sm">
                      {tr('Поделить на 2')}
                    </button>
                  )}
                  <button
                    onClick={() => setOpenLists((s) => ({ ...s, [g.id]: !s[g.id] }))}
                    className="btn-secondary text-sm"
                  >
                    {listOpen ? '▴' : '▾'} {tr('Стажёры группы')} ({members.length})
                  </button>
                  {deleteState.id !== g.id && (
                    <button
                      onClick={() => askDeleteGroup(g.id)}
                      className="text-danger-500 hover:text-danger-600 text-xs ml-auto"
                    >
                      {tr('Удалить')}
                    </button>
                  )}
                </div>

                {deleteState.id === g.id &&
                  (deleteState.blocked ? (
                    <div className="flex flex-wrap items-center gap-3 text-sm text-danger-500">
                      {tr('В этой группе есть стажёры — сначала перенесите или удалите их в «Списке стажёров».')}
                      <button
                        onClick={() => setDeleteState({ id: null, blocked: false })}
                        className="btn-secondary text-sm"
                      >
                        {tr('Понятно')}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="text-danger-500 font-semibold">{tr('Удалить группу «{name}»?', { name: g.name })}</span>
                      <button
                        onClick={() => deleteGroup(g.id)}
                        className="text-sm px-3 py-1.5 rounded-lg bg-danger-500 hover:bg-danger-600 text-white font-semibold"
                      >
                        {tr('Да, удалить')}
                      </button>
                      <button
                        onClick={() => setDeleteState({ id: null, blocked: false })}
                        className="btn-secondary text-sm"
                      >
                        {tr('Отмена')}
                      </button>
                    </div>
                  ))}

                {split?.groupId === g.id && (
                  <div className="rounded-xl border border-sky-200 dark:border-sky-800 p-3 space-y-3">
                    <div className="text-sm">
                      <span className="font-semibold">{tr('Предпросмотр деления.')}</span>{' '}
                      <span className="text-navy-500 dark:text-navy-400">
                        {tr('Стажёры распределены случайно, каждый город/район — поровну между группами. Можно перемешать ещё раз.')}
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {split.parts.map((part, idx) => (
                        <div key={idx} className="rounded-lg bg-navy-50 dark:bg-navy-800/60 p-3">
                          <div className="font-semibold text-sm mb-2">
                            {g.name} ({idx + 1}) — {tr('{n} чел.', { n: part.length })}
                          </div>
                          <ul className="text-sm space-y-0.5">
                            {[...part]
                              .sort((a, b) => (a.city || '').localeCompare(b.city || '', 'ru'))
                              .map((i) => (
                                <li key={i.id}>
                                  {i.lastName} {i.firstName}
                                  <span className="text-navy-400 dark:text-navy-500"> · {i.city || tr('город не указан')}</span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className="field-label">{tr('Тренер для группы «{name}»', { name: g.name + ' (2)' })}</label>
                      <select
                        className="field-input max-w-sm"
                        value={split.ownerId}
                        onChange={(e) => setSplit((s) => ({ ...s, ownerId: e.target.value }))}
                      >
                        <option value="">{tr('Выберите тренера')}</option>
                        {trainers
                          .filter((t) => t.id !== g.ownerId)
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                      </select>
                      <p className="text-xs text-navy-400 dark:text-navy-500 mt-1">
                        {admin
                          ? tr('Вторая группа перейдёт выбранному тренеру. Сменить тренера позже можно в поле «Тренер группы».')
                          : tr('Вторая группа перейдёт выбранному тренеру и пропадёт из вашего кабинета.')}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => confirmSplit(g)} disabled={!split.ownerId} className="btn-primary text-sm">
                        {tr('Поделить')}
                      </button>
                      <button onClick={() => previewSplit(g.id)} className="btn-secondary text-sm">
                        {tr('Перемешать ещё раз')}
                      </button>
                      <button onClick={() => setSplit(null)} className="btn-secondary text-sm">
                        {tr('Отмена')}
                      </button>
                    </div>
                  </div>
                )}

                {listOpen && (
                  <div className="overflow-x-auto rounded-xl border border-navy-100 dark:border-navy-800 animate-fadein">
                    {members.length === 0 ? (
                      <p className="text-navy-400 dark:text-navy-500 text-sm p-3">{tr('В группе пока нет стажёров.')}</p>
                    ) : (
                      <table className="w-full text-sm min-w-[400px]">
                        <thead>
                          <tr className="text-left text-navy-500 dark:text-navy-400 bg-navy-50 dark:bg-navy-800/60">
                            <th className="py-2 pl-3 pr-2 w-8">#</th>
                            {COLUMNS.map((c) => (
                              <th key={c.key} className="py-2 pr-3">
                                {tr(c.label)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((i, n) => (
                            <tr key={i.id} className="border-t border-navy-50 dark:border-navy-800">
                              <td className="py-1.5 pl-3 pr-2 text-navy-400">{n + 1}</td>
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
            </div>
          )
        })}
      </div>

      <p className="text-xs text-navy-400 dark:text-navy-500">
        {tr('Отправить группу в архив можно во вкладке «Итоговый экзамен», когда всем стажёрам выставлен балл.')}
      </p>
    </div>
  )
}
