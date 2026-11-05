import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../store/StoreContext.jsx'
import { isTrainerAdmin } from '../../lib/roles'
import { computeGroupStats } from '../../lib/groupStats'
import { computeReminders } from '../../lib/reminders'
import { getInternExamStatus, getActiveAnswers, getRetakeAnswers, isExamGraded, examPercent } from '../../lib/exam'
import { formatDate } from '../../lib/date'
import { REGIONS, DEPARTMENTS, GROUP_CAPACITY } from '../../lib/constants'
import Avatar from '../../components/Avatar.jsx'
import EmptyState from '../../components/EmptyState.jsx'

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const MONTHS_FULL = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
]
const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

// Итог экзамена — статусные цвета (зелёный/красный/синий/жёлтый) всегда идут вместе с подписью.
const OUTCOMES = [
  { key: 'passed', label: 'Сдали экзамен', color: '#1fa971', dot: 'bg-success-500' },
  { key: 'failed', label: 'Не сдали', color: '#e0413a', dot: 'bg-danger-500' },
  { key: 'progress', label: 'Ещё обучаются', color: '#1e9fe0', dot: 'bg-sky-500' },
  { key: 'withdrawn', label: 'Отказались', color: '#e8a916', dot: 'bg-warning-500' },
]

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Доброй ночи'
  if (h < 12) return 'Доброе утро'
  if (h < 18) return 'Добрый день'
  return 'Добрый вечер'
}

// В системе ФИО записывается как «Фамилия Имя» — для приветствия берём имя.
function firstName(name) {
  const parts = (name || '').trim().split(/\s+/)
  return parts[1] || parts[0] || ''
}

function pct(part, total) {
  return total ? Math.round((part / total) * 100) : null
}

function plural(n, one, few, many) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}

function outcomeOf(intern) {
  if (intern.withdrawn) return 'withdrawn'
  const code = getInternExamStatus(intern).code
  if (code === 'passed') return 'passed'
  if (code === 'ungraded' || code === 'retake_pending') return 'progress'
  return 'failed'
}

// ---------- Сбор всей статистики для выбранного набора групп ----------
function buildStats(groups, interns, trainers) {
  const today = todayIso()
  const groupIds = new Set(groups.map((g) => g.id))
  const people = interns.filter((i) => groupIds.has(i.groupId))
  const active = groups.filter((g) => !g.archived)
  const archived = groups.filter((g) => g.archived)

  const outcomes = { passed: 0, failed: 0, progress: 0, withdrawn: 0 }
  people.forEach((i) => {
    outcomes[outcomeOf(i)] += 1
  })
  const decided = outcomes.passed + outcomes.failed

  const graded = people.filter((i) => !i.withdrawn && isExamGraded(getActiveAnswers(i)))
  const avgScore = graded.length
    ? Math.round(graded.reduce((s, i) => s + examPercent(getActiveAnswers(i)), 0) / graded.length)
    : null
  const firstTry = people.filter((i) => outcomeOf(i) === 'passed' && !getRetakeAnswers(i)).length

  const activeStats = active.map((g) => {
    const gi = interns.filter((i) => i.groupId === g.id)
    return { group: g, interns: gi, stats: computeGroupStats(g, gi) }
  })
  const avgOf = (key) => {
    const list = activeStats.filter((x) => x.stats[key] !== null)
    return list.length ? Math.round(list.reduce((s, x) => s + x.stats[key], 0) / list.length) : null
  }

  let lessonsDone = 0
  const upcoming = []
  groups.forEach((g) =>
    (g.lessons || []).forEach((l) => {
      if (!l.date) return
      if (l.date <= today) lessonsDone += 1
      if (!g.archived && l.date >= today) upcoming.push({ ...l, group: g })
    }),
  )
  upcoming.sort((a, b) => a.date.localeCompare(b.date))

  // Набор стажёров по месяцам за последние 12 месяцев.
  const now = new Date()
  const months = []
  for (let k = 11; k >= 0; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1)
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, m: d.getMonth(), y: d.getFullYear(), count: 0 })
  }
  people.forEach((i) => {
    const date = (i.createdAt || i.joinedAt || '').slice(0, 7)
    const slot = months.find((m) => m.key === date)
    if (slot) slot.count += 1
  })

  const byRegion = [...REGIONS.map((r) => ({ key: r.value, label: r.label })), { key: '', label: 'Не указан' }]
    .map((r) => ({ ...r, count: people.filter((i) => (i.region || '') === r.key).length }))
    .filter((r) => r.key || r.count > 0)

  const deptList = [...DEPARTMENTS]
  people.forEach((i) => {
    if (i.department && !deptList.includes(i.department)) deptList.push(i.department)
  })
  const byDept = deptList.map((d) => ({ key: d, label: d, count: people.filter((i) => i.department === d).length }))

  const startDates = groups.map((g) => (g.createdAt || '').slice(0, 10)).filter(Boolean).sort()

  const leaderboard = trainers
    .map((t) => {
      const own = groups.filter((g) => g.ownerId === t.id)
      const ownIds = new Set(own.map((g) => g.id))
      const ppl = people.filter((i) => ownIds.has(i.groupId))
      const passed = ppl.filter((i) => outcomeOf(i) === 'passed').length
      const failed = ppl.filter((i) => outcomeOf(i) === 'failed').length
      return { trainer: t, groups: own.length, interns: ppl.length, passed, rate: pct(passed, passed + failed) }
    })
    .filter((x) => x.groups > 0)
    .sort((a, b) => b.passed - a.passed || b.interns - a.interns)

  return {
    totalGroups: groups.length,
    activeCount: active.length,
    archivedCount: archived.length,
    people: people.length,
    inTraining: activeStats.reduce((s, x) => s + x.stats.internCount, 0),
    outcomes,
    passRate: pct(outcomes.passed, decided),
    firstTryRate: pct(firstTry, outcomes.passed),
    avgScore,
    attendance: avgOf('attendancePct'),
    homework: avgOf('homeworkPct'),
    lessonsDone,
    upcoming: upcoming.slice(0, 6),
    months,
    byRegion,
    byDept,
    activeStats,
    since: startDates[0] || '',
    leaderboard,
  }
}

// ---------- Мелкие компоненты ----------
function Ring({ value, size = 64, stroke = 7, color = '#1e9fe0', label }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = value ?? 0
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-navy-100 dark:stroke-navy-800" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${(c * v) / 100} ${c}`}
            style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-bold font-display">
          {value === null ? '—' : `${value}%`}
        </div>
      </div>
      {label && <div className="text-[11px] text-navy-500 dark:text-navy-400">{label}</div>}
    </div>
  )
}

function Kpi({ icon, value, label, hint, accent }) {
  return (
    <div className="card !p-5 relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className={'absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity ' + accent} />
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-3xl font-display font-bold leading-none">{value}</div>
          <div className="text-sm font-medium text-navy-600 dark:text-navy-300 mt-2">{label}</div>
          {hint && <div className="text-xs text-navy-400 dark:text-navy-500 mt-0.5">{hint}</div>}
        </div>
        <div className={'w-10 h-10 rounded-xl flex items-center justify-center text-lg text-white shrink-0 ' + accent}>{icon}</div>
      </div>
    </div>
  )
}

function CardTitle({ children, sub }) {
  return (
    <div className="mb-4">
      <h2 className="font-semibold text-base">{children}</h2>
      {sub && <div className="text-xs text-navy-400 dark:text-navy-500 mt-0.5">{sub}</div>}
    </div>
  )
}

// Кольцевая диаграмма итогов экзамена с легендой (цвет никогда не единственный носитель смысла).
function OutcomeDonut({ outcomes, passRate }) {
  const [hover, setHover] = useState(null)
  const total = OUTCOMES.reduce((s, o) => s + outcomes[o.key], 0)
  const size = 180
  const stroke = 22
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const gap = total > 1 ? 3 : 0
  let offset = 0
  const segments = OUTCOMES.map((o) => {
    const len = total ? (outcomes[o.key] / total) * c : 0
    const seg = { ...o, len, offset }
    offset += len
    return seg
  }).filter((s) => s.len > 0)
  const shown = hover ? OUTCOMES.find((o) => o.key === hover) : null

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-navy-100 dark:stroke-navy-800" />
          {segments.map((s) => (
            <circle
              key={s.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={hover === s.key ? stroke + 4 : stroke}
              strokeDasharray={`${Math.max(s.len - gap, 0.5)} ${c}`}
              strokeDashoffset={-s.offset}
              onMouseEnter={() => setHover(s.key)}
              onMouseLeave={() => setHover(null)}
              className="cursor-pointer transition-all duration-200"
              opacity={hover && hover !== s.key ? 0.45 : 1}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          {shown ? (
            <>
              <div className="text-3xl font-display font-bold">{outcomes[shown.key]}</div>
              <div className="text-xs text-navy-500 dark:text-navy-400 px-6 leading-tight">{shown.label}</div>
            </>
          ) : (
            <>
              <div className="text-3xl font-display font-bold">{passRate === null ? '—' : `${passRate}%`}</div>
              <div className="text-xs text-navy-500 dark:text-navy-400 px-6 leading-tight">успешно сдали</div>
            </>
          )}
        </div>
      </div>
      <ul className="space-y-2.5 w-full">
        {OUTCOMES.map((o) => (
          <li
            key={o.key}
            onMouseEnter={() => setHover(o.key)}
            onMouseLeave={() => setHover(null)}
            className={
              'flex items-center gap-3 text-sm rounded-lg px-2 py-1 -mx-2 transition-colors ' +
              (hover === o.key ? 'bg-navy-50 dark:bg-navy-800' : '')
            }
          >
            <span className={'w-3 h-3 rounded-full shrink-0 ' + o.dot} />
            <span className="flex-1 text-navy-600 dark:text-navy-300">{o.label}</span>
            <span className="font-semibold">{outcomes[o.key]}</span>
            <span className="w-10 text-right text-xs text-navy-400 dark:text-navy-500">
              {total ? `${pct(outcomes[o.key], total)}%` : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Столбики «новые стажёры по месяцам» с подсказкой при наведении.
function MonthlyChart({ months }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...months.map((m) => m.count))
  const total = months.reduce((s, m) => s + m.count, 0)
  return (
    <div>
      <div className="relative h-44 flex items-end gap-1.5 sm:gap-2.5 border-b border-navy-100 dark:border-navy-800">
        {[0.5, 1].map((f) => (
          <div
            key={f}
            className="absolute left-0 right-0 border-t border-dashed border-navy-100 dark:border-navy-800"
            style={{ bottom: `${f * 100}%` }}
          />
        ))}
        {months.map((m, idx) => (
          <div
            key={m.key}
            className="relative flex-1 h-full flex items-end justify-center cursor-default"
            onMouseEnter={() => setHover(idx)}
            onMouseLeave={() => setHover(null)}
          >
            {hover === idx && (
              <div className="absolute z-10 bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-navy-900 text-white dark:bg-white dark:text-navy-900 text-xs px-2.5 py-1.5 shadow-lg">
                <div className="font-semibold capitalize">
                  {MONTHS_FULL[m.m]} {m.y}
                </div>
                <div>
                  {m.count} {plural(m.count, 'стажёр', 'стажёра', 'стажёров')}
                </div>
              </div>
            )}
            {m.count > 0 && (
              <div className="absolute text-[11px] font-semibold text-navy-500 dark:text-navy-400" style={{ bottom: `calc(${(m.count / max) * 100}% + 4px)` }}>
                {m.count}
              </div>
            )}
            <div
              className={
                'w-full max-w-[36px] rounded-t transition-all duration-500 ' +
                (hover === idx ? 'bg-sky-400' : 'bg-gradient-to-t from-navy-500 to-sky-500') +
                (m.count === 0 ? ' !bg-navy-100 dark:!bg-navy-800' : '')
              }
              style={{ height: m.count ? `${(m.count / max) * 100}%` : '3px' }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 sm:gap-2.5 mt-1.5">
        {months.map((m) => (
          <div key={m.key} className="flex-1 text-center text-[11px] text-navy-400 dark:text-navy-500">
            {MONTHS[m.m]}
          </div>
        ))}
      </div>
      <div className="text-xs text-navy-400 dark:text-navy-500 mt-3">
        За 12 месяцев: <span className="font-semibold text-navy-600 dark:text-navy-300">{total}</span>{' '}
        {plural(total, 'стажёр', 'стажёра', 'стажёров')}
      </div>
    </div>
  )
}

// Горизонтальные полосы — одна серия, один цвет.
function HBars({ rows, barClass = 'bg-sky-500' }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  const total = rows.reduce((s, r) => s + r.count, 0)
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.key || 'none'} className="group">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="truncate pr-2 text-navy-600 dark:text-navy-300">{r.label}</span>
            <span className="shrink-0 font-semibold">
              {r.count}
              <span className="ml-1.5 text-xs font-normal text-navy-400 dark:text-navy-500">
                {total ? `${pct(r.count, total)}%` : ''}
              </span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-navy-100 dark:bg-navy-800 overflow-hidden">
            <div
              className={'h-full rounded-full transition-all duration-700 group-hover:brightness-110 ' + barClass}
              style={{ width: `${(r.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function groupStage(g) {
  if (g.isOpen) return { label: 'Приём анкет', cls: 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400' }
  if ((g.lessons || []).length === 0) return { label: 'Формирование', cls: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400' }
  return { label: 'Идёт обучение', cls: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400' }
}

function GroupCard({ group, interns, stats, ownerName }) {
  const stage = groupStage(group)
  const today = todayIso()
  const lessons = (group.lessons || []).filter((l) => l.date)
  const done = lessons.filter((l) => l.date <= today).length
  const exam = stats.exam
  const examTotal = exam.passed + exam.failed + exam.retake + exam.notStarted
  const parts = [
    { key: 'p', n: exam.passed, cls: 'bg-success-500', label: 'сдали' },
    { key: 'f', n: exam.failed, cls: 'bg-danger-500', label: 'не сдали' },
    { key: 'r', n: exam.retake, cls: 'bg-warning-500', label: 'пересдача' },
    { key: 'n', n: exam.notStarted, cls: 'bg-navy-200 dark:bg-navy-700', label: 'не оценены' },
  ]
  return (
    <div className="rounded-2xl border border-navy-100 dark:border-navy-800 p-4 hover:border-sky-400/60 hover:shadow-md transition-all bg-white/60 dark:bg-navy-900/60">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold truncate" title={group.name}>
            {group.name}
          </div>
          {ownerName && <div className="text-xs text-navy-400 dark:text-navy-500 truncate">{ownerName}</div>}
        </div>
        <span className={'text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ' + stage.cls}>{stage.label}</span>
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-xs text-navy-500 dark:text-navy-400 mb-1">
          <span>Стажёров</span>
          <span className="font-semibold text-navy-700 dark:text-navy-200">
            {stats.internCount}
            {stats.withdrawnCount > 0 && <span className="font-normal text-warning-600"> (+{stats.withdrawnCount} отказ)</span>} / {GROUP_CAPACITY}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-navy-100 dark:bg-navy-800 overflow-hidden">
          <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(100, (interns.length / GROUP_CAPACITY) * 100)}%` }} />
        </div>
      </div>

      <div className="flex justify-around mt-4">
        <Ring value={stats.attendancePct} label="Посещаемость" color="#1e9fe0" size={58} stroke={6} />
        <Ring value={stats.homeworkPct} label="Домашние задания" color="#7c4fd4" size={58} stroke={6} />
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs text-navy-500 dark:text-navy-400 mb-1">
          <span>Экзамен</span>
          <span>
            {lessons.length > 0 ? `занятий ${done}/${lessons.length}` : 'занятий нет'}
          </span>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden gap-0.5 bg-navy-100 dark:bg-navy-800">
          {examTotal > 0 &&
            parts
              .filter((p) => p.n > 0)
              .map((p) => (
                <div key={p.key} className={p.cls} style={{ width: `${(p.n / examTotal) * 100}%` }} title={`${p.label}: ${p.n}`} />
              ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[11px] text-navy-500 dark:text-navy-400">
          {parts
            .filter((p) => p.n > 0)
            .map((p) => (
              <span key={p.key} className="inline-flex items-center gap-1">
                <span className={'w-2 h-2 rounded-full ' + p.cls} />
                {p.label} {p.n}
              </span>
            ))}
        </div>
      </div>
    </div>
  )
}

// ---------- Страница ----------
export default function OverviewTab() {
  const { data, currentTrainer, archiveLoaded, requestArchive } = useStore()
  const { groups, interns, trainers } = data
  const admin = isTrainerAdmin(currentTrainer)
  const [scope, setScope] = useState('mine')

  // Статистика «за всё время» требует стажёров архивных групп.
  useEffect(() => {
    requestArchive()
  }, [requestArchive])

  const scopeGroups = useMemo(
    () => (admin && scope === 'all' ? groups : groups.filter((g) => g.ownerId === currentTrainer?.id)),
    [groups, admin, scope, currentTrainer],
  )
  const s = useMemo(() => buildStats(scopeGroups, interns, trainers), [scopeGroups, interns, trainers])
  const reminders = useMemo(() => computeReminders(scopeGroups.filter((g) => !g.archived)), [scopeGroups])
  const trainerName = (id) => trainers.find((t) => t.id === id)?.name || ''

  const today = new Date()
  const dateText = today.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Шапка тренера */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800 via-navy-700 to-sky-600 text-white p-6 sm:p-8 shadow-lg">
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-sky-400/20 blur-2xl" />
        <div className="absolute right-40 -bottom-24 w-64 h-64 rounded-full bg-violet-500/20 blur-2xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="rounded-full ring-4 ring-white/20 shrink-0">
              <Avatar src={currentTrainer?.photo} name={currentTrainer?.name} position={currentTrainer?.photoPosition} size={84} />
            </div>
            <div className="min-w-0">
              <div className="text-sm text-sky-100/80 first-letter:uppercase">{dateText}</div>
              <h1 className="text-2xl sm:text-3xl font-bold mt-0.5">
                {greeting()}, {firstName(currentTrainer?.name)}!
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
                <span className="px-2.5 py-0.5 rounded-full bg-white/15 font-medium">
                  {admin ? 'Администратор · бизнес-тренер' : 'Бизнес-тренер'}
                </span>
                {s.since && <span className="text-sky-100/80">в программе с {formatDate(s.since)}</span>}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-6 lg:min-w-[440px]">
            {[
              { v: s.totalGroups, l: plural(s.totalGroups, 'группа', 'группы', 'групп'), sub: 'за всё время' },
              { v: s.people, l: plural(s.people, 'стажёр', 'стажёра', 'стажёров'), sub: 'прошли через программу' },
              { v: s.outcomes.passed, l: 'обучено', sub: 'сдали итоговый экзамен' },
            ].map((x) => (
              <div key={x.l + x.sub} className="rounded-2xl bg-white/10 backdrop-blur-sm px-3 py-3 sm:px-4 text-center">
                <div className="text-3xl sm:text-4xl font-display font-bold">{archiveLoaded ? x.v : '…'}</div>
                <div className="text-sm font-semibold">{x.l}</div>
                <div className="text-[11px] text-sky-100/70 leading-tight mt-0.5">{x.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {admin && (
        <div className="inline-flex rounded-xl bg-white dark:bg-navy-900 border border-navy-100 dark:border-navy-800 p-1 text-sm">
          {[
            { v: 'mine', l: 'Мои группы' },
            { v: 'all', l: 'Все тренеры' },
          ].map((o) => (
            <button
              key={o.v}
              onClick={() => setScope(o.v)}
              className={
                'px-4 py-1.5 rounded-lg font-medium transition-colors ' +
                (scope === o.v
                  ? 'bg-navy-700 text-white dark:bg-sky-500 dark:text-navy-950'
                  : 'text-navy-500 hover:text-navy-800 dark:text-navy-400 dark:hover:text-navy-100')
              }
            >
              {o.l}
            </button>
          ))}
        </div>
      )}

      {s.totalGroups === 0 ? (
        <EmptyState
          icon="📊"
          title="Пока нет групп"
          description="Статистика появится, как только вы создадите хотя бы одну группу во вкладке «Настройки сбора»."
        />
      ) : (
        <>
          {/* Ключевые показатели */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <Kpi icon="👥" value={s.activeCount} label="Активных групп" hint={`ещё ${s.archivedCount} в архиве`} accent="bg-navy-600" />
            <Kpi icon="🎓" value={s.inTraining} label="Сейчас обучаются" hint="в активных группах" accent="bg-violet-500" />
            <Kpi icon="🏆" value={s.passRate === null ? '—' : `${s.passRate}%`} label="Успешность" hint="сдали из получивших итог" accent="bg-success-500" />
            <Kpi icon="📝" value={s.avgScore === null ? '—' : `${s.avgScore}%`} label="Средний балл" hint={s.firstTryRate === null ? 'по итоговому экзамену' : `${s.firstTryRate}% сдали с 1-й попытки`} accent="bg-sky-500" />
            <Kpi icon="📅" value={s.attendance === null ? '—' : `${s.attendance}%`} label="Посещаемость" hint="средняя по активным группам" accent="bg-warning-500" />
            <Kpi icon="📚" value={s.lessonsDone} label="Занятий проведено" hint={s.homework === null ? 'за всё время' : `ДЗ выполнено ${s.homework}%`} accent="bg-danger-500" />
          </div>

          {reminders.length > 0 && (
            <div className="card !p-5 space-y-2 border-warning-500/40 bg-warning-50/60 dark:bg-warning-500/5">
              <h2 className="font-semibold text-warning-600 dark:text-warning-500">Напоминания</h2>
              <ul className="space-y-1.5 text-sm">
                {reminders.map((r) => (
                  <li key={r.id} className="flex items-start gap-2">
                    <span aria-hidden="true">⚠️</span>
                    <span>{r.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="card lg:col-span-2">
              <CardTitle sub="Все стажёры за всё время">Итоги обучения</CardTitle>
              {archiveLoaded ? (
                <OutcomeDonut outcomes={s.outcomes} passRate={s.passRate} />
              ) : (
                <p className="text-sm text-navy-400">Загрузка...</p>
              )}
            </div>
            <div className="card lg:col-span-3">
              <CardTitle sub="Сколько анкет поступило по месяцам">Набор стажёров</CardTitle>
              <MonthlyChart months={s.months} />
            </div>
          </div>

          {s.activeStats.length > 0 && (
            <div className="card">
              <CardTitle sub="Состав, посещаемость, домашние задания и экзамен">Активные группы</CardTitle>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {s.activeStats.map(({ group, interns: gi, stats }) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    interns={gi}
                    stats={stats}
                    ownerName={scope === 'all' ? trainerName(group.ownerId) : ''}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="card">
              <CardTitle sub="Региональные дирекции">Стажёры по регионам</CardTitle>
              <HBars rows={s.byRegion} barClass="bg-sky-500" />
            </div>
            <div className="card">
              <CardTitle sub="Подразделения стажёров">По подразделениям</CardTitle>
              <HBars rows={s.byDept} barClass="bg-violet-500" />
            </div>
            <div className="card">
              <CardTitle sub="Ближайшие даты по активным группам">Ближайшие занятия</CardTitle>
              {s.upcoming.length === 0 ? (
                <p className="text-sm text-navy-400 dark:text-navy-500">Запланированных занятий нет.</p>
              ) : (
                <ul className="space-y-2.5">
                  {s.upcoming.map((l) => {
                    const d = new Date(l.date + 'T00:00:00')
                    const isToday = l.date === todayIso()
                    return (
                      <li key={l.group.id + l.id} className="flex items-center gap-3">
                        <div
                          className={
                            'w-12 shrink-0 rounded-xl text-center py-1 ' +
                            (isToday ? 'bg-sky-500 text-white' : 'bg-navy-50 dark:bg-navy-800')
                          }
                        >
                          <div className="text-lg font-bold leading-none font-display">{d.getDate()}</div>
                          <div className={'text-[10px] uppercase ' + (isToday ? 'text-white/90' : 'text-navy-400')}>
                            {MONTHS[d.getMonth()]} · {WEEKDAYS[d.getDay()]}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{l.name || 'Занятие'}</div>
                          <div className="text-xs text-navy-400 dark:text-navy-500 truncate">
                            {isToday ? 'Сегодня · ' : ''}
                            {l.group.name}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          {admin && scope === 'all' && s.leaderboard.length > 0 && (
            <div className="card">
              <CardTitle sub="По числу стажёров, сдавших итоговый экзамен">Рейтинг тренеров</CardTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="text-left text-xs text-navy-400 dark:text-navy-500 border-b border-navy-100 dark:border-navy-800">
                      <th className="py-2 pr-3 w-8">#</th>
                      <th className="py-2 pr-3">Тренер</th>
                      <th className="py-2 pr-3 text-right">Групп</th>
                      <th className="py-2 pr-3 text-right">Стажёров</th>
                      <th className="py-2 pr-3 text-right">Обучено</th>
                      <th className="py-2 pr-3 w-48">Успешность</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.leaderboard.map((x, idx) => (
                      <tr key={x.trainer.id} className="border-b border-navy-50 dark:border-navy-800 last:border-0">
                        <td className="py-2 pr-3 font-semibold text-navy-400">{['🥇', '🥈', '🥉'][idx] || idx + 1}</td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2">
                            <Avatar src={x.trainer.photo} name={x.trainer.name} position={x.trainer.photoPosition} size={28} />
                            <span className="font-medium">{x.trainer.name}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-3 text-right">{x.groups}</td>
                        <td className="py-2 pr-3 text-right">{x.interns}</td>
                        <td className="py-2 pr-3 text-right font-semibold text-success-600 dark:text-success-400">{x.passed}</td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-navy-100 dark:bg-navy-800 overflow-hidden">
                              <div className="h-full rounded-full bg-success-500" style={{ width: `${x.rate ?? 0}%` }} />
                            </div>
                            <span className="w-9 text-right text-xs">{x.rate === null ? '—' : `${x.rate}%`}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="text-center">
            <Link to="../reports" className="text-sm text-sky-600 hover:underline dark:text-sky-400">
              Подробные отчёты в Excel →
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
