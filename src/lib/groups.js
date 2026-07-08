import { GROUP_CAPACITY } from './constants'

export function internCount(interns, groupId) {
  return interns.filter((i) => i.groupId === groupId).length
}

export function groupsWithCounts(groups, interns) {
  return groups.map((g) => ({ ...g, count: internCount(interns, g.id) }))
}

// collectionOpen — общий рубильник поверх старта/стопа отдельных групп: если выключен,
// анкеты не принимаются, даже если какая-то группа сама по себе открыта.
export function openGroupsWithSpace(groups, interns, collectionOpen = true) {
  if (!collectionOpen) return []
  return groupsWithCounts(groups, interns).filter((g) => g.isOpen && g.count < GROUP_CAPACITY)
}
