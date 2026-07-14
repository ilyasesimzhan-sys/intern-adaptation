import { useMemo } from 'react'
import { useStore } from '../../store/StoreContext.jsx'
import { activeVisibleGroups } from '../../lib/roles'
import { computeGroupStats } from '../../lib/groupStats'
import { computeReminders } from '../../lib/reminders'
import EmptyState from '../../components/EmptyState.jsx'

function Stat({ label, value }) {
  return (
    <div className="card">
      <div className="text-2xl font-display font-bold">{value}</div>
      <div className="text-xs text-navy-500 dark:text-navy-400 mt-1">{label}</div>
    </div>
  )
}

function Bar({ label, pct, colorClass }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-medium truncate pr-2">{label}</span>
        <span className="text-navy-400 dark:text-navy-500 shrink-0">{pct === null ? '—' : `${pct}%`}</span>
      </div>
      <div className="h-2.5 rounded-full bg-navy-100 dark:bg-navy-800 overflow-hidden">
        <div
          className={'h-full rounded-full transition-all duration-500 ' + colorClass}
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
    </div>
  )
}

export default function OverviewTab() {
  const { data, currentTrainer } = useStore()
  const { groups, interns } = data

  const myGroups = useMemo(() => activeVisibleGroups(groups, currentTrainer), [groups, currentTrainer])

  const groupsWithStats = useMemo(
    () =>
      myGroups.map((g) => {
        const gi = interns.filter((i) => i.groupId === g.id)
        return { group: g, interns: gi, stats: computeGroupStats(g, gi) }
      }),
    [myGroups, interns],
  )

  const totals = useMemo(() => {
    const totalInterns = groupsWithStats.reduce((s, x) => s + x.interns.length, 0)
    const totalPassed = groupsWithStats.reduce((s, x) => s + x.stats.exam.passed, 0)
    const withAttendance = groupsWithStats.filter((x) => x.stats.attendancePct !== null)
    const avgAttendance = withAttendance.length
      ? Math.round(withAttendance.reduce((s, x) => s + x.stats.attendancePct, 0) / withAttendance.length)
      : null
    return { totalGroups: groupsWithStats.length, totalInterns, totalPassed, avgAttendance }
  }, [groupsWithStats])

  const reminders = useMemo(() => computeReminders(myGroups), [myGroups])

  if (myGroups.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Обзор</h1>
        <EmptyState
          icon="📊"
          title="Пока нет активных групп"
          description="Сводка появится, как только вы создадите хотя бы одну группу во вкладке «Настройки сбора»."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Обзор</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Активных групп" value={totals.totalGroups} />
        <Stat label="Стажёров всего" value={totals.totalInterns} />
        <Stat label="Сдали экзамен" value={totals.totalPassed} />
        <Stat label="Средняя посещаемость" value={totals.avgAttendance === null ? '—' : `${totals.avgAttendance}%`} />
      </div>

      {reminders.length > 0 && (
        <div className="card space-y-2 border-warning-500/40 bg-warning-50/60 dark:bg-warning-500/5">
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

      <div className="card space-y-5">
        <h2 className="font-semibold">Посещаемость по группам</h2>
        <div className="space-y-4">
          {groupsWithStats.map(({ group, stats }) => (
            <Bar key={group.id} label={group.name} pct={stats.attendancePct} colorClass="bg-sky-500" />
          ))}
        </div>
      </div>

      <div className="card space-y-5">
        <h2 className="font-semibold">Сдача экзамена по группам</h2>
        <div className="space-y-4">
          {groupsWithStats.map(({ group, interns: gi, stats }) => (
            <Bar
              key={group.id}
              label={`${group.name} (${stats.exam.passed}/${gi.length})`}
              pct={gi.length ? Math.round((stats.exam.passed / gi.length) * 100) : null}
              colorClass="bg-success-500"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
