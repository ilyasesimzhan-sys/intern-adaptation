import { GROUP_CAPACITY } from './constants'

export function internCount(interns, groupId) {
  return interns.filter((i) => i.groupId === groupId).length
}

export function groupsWithCounts(groups, interns) {
  return groups.map((g) => ({ ...g, count: internCount(interns, g.id) }))
}

// Приём анкет закрывается автоматически в дату закрытия в 10:00 по времени Казахстана (UTC+5),
// независимо от часового пояса компьютера, на котором открыт сайт.
export const AUTO_CLOSE_TIME = '10:00'

export function closeDeadline(group) {
  if (!group?.endDate) return null
  const d = new Date(`${group.endDate.slice(0, 10)}T${AUTO_CLOSE_TIME}:00+05:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function isPastCloseDeadline(group, now = new Date()) {
  const deadline = closeDeadline(group)
  return Boolean(deadline && now >= deadline)
}

// Группа реально принимает анкеты: открыта вручную и срок закрытия ещё не наступил.
export function isGroupOpen(group, now = new Date()) {
  return Boolean(group?.isOpen) && !group.archived && !isPastCloseDeadline(group, now)
}

export function openGroupsWithSpace(groups, interns) {
  const now = new Date()
  return groupsWithCounts(groups, interns).filter((g) => isGroupOpen(g, now) && g.count < GROUP_CAPACITY)
}

function shuffle(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Случайно делит стажёров на две части так, чтобы каждый город/район был поровну в обеих
// (разница не больше одного человека), а общий размер частей отличался не больше чем на одного.
// При равенстве по городу и по размеру — выравниваем по подразделению, дальше — случайно.
export function splitInternsByCity(interns) {
  const parts = [[], []]
  const count = (part, key, value) => part.filter((i) => (i[key] || '') === (value || '')).length
  const byCity = new Map()
  for (const intern of shuffle(interns)) {
    const city = intern.city || ''
    if (!byCity.has(city)) byCity.set(city, [])
    byCity.get(city).push(intern)
  }
  // Сначала крупные города — так остаток от нечётных групп проще выровнять мелкими.
  const cities = shuffle([...byCity.values()]).sort((x, y) => y.length - x.length)
  for (const members of cities) {
    for (const intern of members) {
      const score = (part) => [
        count(part, 'city', intern.city),
        part.length,
        count(part, 'department', intern.department),
        Math.random(),
      ]
      const [s0, s1] = [score(parts[0]), score(parts[1])]
      const idx = s0.findIndex((v, k) => v !== s1[k])
      parts[s0[idx] <= s1[idx] ? 0 : 1].push(intern)
    }
  }
  return parts
}
