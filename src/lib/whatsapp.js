import { formatDate } from './date'

export function renderTemplate(template, intern, groupName) {
  return (template || '')
    .replaceAll('{name}', `${intern.firstName} ${intern.lastName}`.trim())
    .replaceAll('{group}', groupName || '')
    .replaceAll('{title}', intern.position || '')
}

// startDate — дата начала АП, равна дате закрытия сбора группы (group.endDate).
export function renderManagerTemplate(template, intern, groupName, startDate, trainer) {
  return (template || '')
    .replaceAll('{managerName}', intern.managerName || '')
    .replaceAll('{name}', `${intern.firstName} ${intern.lastName}`.trim())
    .replaceAll('{group}', groupName || '')
    .replaceAll('{startDate}', formatDate(startDate))
    .replaceAll('{trainerName}', trainer?.name || '')
    .replaceAll('{trainerPhone}', trainer?.phone || '')
    .replaceAll('{trainerEmail}', trainer?.email || '')
}

export function buildWhatsAppLink(phone, text) {
  const digits = (phone || '').replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}
