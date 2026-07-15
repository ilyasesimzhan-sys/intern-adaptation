// Поля анкеты, по которым ищем стажёра — везде, где выводится список стажёров.
export const INTERN_SEARCH_FIELDS = [
  'lastName',
  'firstName',
  'email',
  'department',
  'position',
  'phone',
  'managerName',
  'managerContact',
  'city',
]

export function internMatchesQuery(intern, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return INTERN_SEARCH_FIELDS.some((f) => String(intern[f] ?? '').toLowerCase().includes(q))
}

export function filterInternsBySearch(interns, query) {
  if (!query.trim()) return interns
  return interns.filter((i) => internMatchesQuery(i, query))
}
