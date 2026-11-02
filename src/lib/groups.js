import { GROUP_CAPACITY } from './constants'

export function internCount(interns, groupId) {
  return interns.filter((i) => i.groupId === groupId).length
}

export function groupsWithCounts(groups, interns) {
  return groups.map((g) => ({ ...g, count: internCount(interns, g.id) }))
}

export function openGroupsWithSpace(groups, interns) {
  return groupsWithCounts(groups, interns).filter((g) => g.isOpen && g.count < GROUP_CAPACITY)
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
