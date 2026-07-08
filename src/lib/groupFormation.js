// Равномерно и честно распределяет стажёров по группам: на каждом шаге
// человек уходит в наименее заполненную на данный момент группу, поэтому
// итоговые группы сбалансированы и по размеру, и по составу подразделений/городов.
export function formGroups(interns, numGroups) {
  if (numGroups < 1) return interns.map((i) => ({ ...i, groupNumber: 1 }))

  const byDept = new Map()
  for (const intern of interns) {
    const deptKey = intern.department || 'Без подразделения'
    if (!byDept.has(deptKey)) byDept.set(deptKey, new Map())
    const byCity = byDept.get(deptKey)
    const cityKey = intern.city || 'Без города'
    if (!byCity.has(cityKey)) byCity.set(cityKey, [])
    byCity.get(cityKey).push(intern)
  }

  // Крупные связки "подразделение + город" распределяем первыми — так они
  // сами по себе успевают равномерно разойтись по всем группам.
  const buckets = []
  for (const byCity of byDept.values()) {
    for (const list of byCity.values()) buckets.push(list)
  }
  buckets.sort((a, b) => b.length - a.length)

  const groupSizes = Array(numGroups).fill(0)
  let tieBreaker = 0
  const result = []

  for (const bucket of buckets) {
    for (const intern of bucket) {
      const minSize = Math.min(...groupSizes)
      const candidates = []
      groupSizes.forEach((size, idx) => {
        if (size === minSize) candidates.push(idx)
      })
      const chosen = candidates[tieBreaker % candidates.length]
      tieBreaker += 1
      groupSizes[chosen] += 1
      result.push({ ...intern, groupNumber: chosen + 1 })
    }
  }

  return result
}
