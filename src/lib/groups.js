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
