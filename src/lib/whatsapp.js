export function renderTemplate(template, intern) {
  return (template || '')
    .replaceAll('{name}', `${intern.firstName} ${intern.lastName}`.trim())
    .replaceAll('{group}', intern.groupNumber ? String(intern.groupNumber) : '')
    .replaceAll('{title}', intern.position || '')
}

export function buildWhatsAppLink(phone, text) {
  const digits = (phone || '').replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}
