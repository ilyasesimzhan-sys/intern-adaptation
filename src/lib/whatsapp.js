export function renderTemplate(template, intern, groupName) {
  return (template || '')
    .replaceAll('{name}', `${intern.firstName} ${intern.lastName}`.trim())
    .replaceAll('{group}', groupName || '')
    .replaceAll('{title}', intern.position || '')
}

export function buildWhatsAppLink(phone, text) {
  const digits = (phone || '').replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}
