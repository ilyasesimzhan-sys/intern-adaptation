// Названия месяцев и дней недели заданы вручную: во многих браузерах нет встроенных казахских данных Intl,
// и toLocaleDateString('kk-KZ') показывает «2026 M11 9, Mon». Короткие даты (дд.мм.гггг) одинаковы в обоих языках.
const NAMES = {
  ru: {
    months: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
    monthsGenitive: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
    monthsShort: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
    weekdays: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
    weekdaysShort: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'],
  },
  kk: {
    months: ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'],
    monthsShort: ['қаң', 'ақп', 'нау', 'сәу', 'мам', 'мау', 'шіл', 'там', 'қыр', 'қаз', 'қар', 'жел'],
    weekdays: ['жексенбі', 'дүйсенбі', 'сейсенбі', 'сәрсенбі', 'бейсенбі', 'жұма', 'сенбі'],
    weekdaysShort: ['жс', 'дс', 'сс', 'ср', 'бс', 'жм', 'сб'],
  },
}

const pad = (n) => String(n).padStart(2, '0')

export function makeDateFormatters(lang) {
  const n = NAMES[lang] || NAMES.ru
  return {
    monthShort: (m) => n.monthsShort[m],
    // «ноябрь 2026» / «қараша 2026»
    monthYear: (m, y) => `${n.months[m]} ${y}`,
    weekdayShort: (wd) => n.weekdaysShort[wd],
    // «понедельник, 9 ноября 2026 г.» / «2026 жылғы 9 қараша, дүйсенбі»
    formatDateLong: (value) => {
      if (!value) return ''
      const d = new Date(value)
      if (lang === 'kk') return `${d.getFullYear()} жылғы ${d.getDate()} ${n.months[d.getMonth()]}, ${n.weekdays[d.getDay()]}`
      return `${n.weekdays[d.getDay()]}, ${d.getDate()} ${n.monthsGenitive[d.getMonth()]} ${d.getFullYear()} г.`
    },
    // «09.11.2026, 10:05» (с секундами — «09.11.2026, 10:05:07»): так пишут и в ru-RU, и в kk-KZ.
    formatDateTime: (value, { seconds = false } = {}) => {
      if (!value) return '—'
      const d = new Date(value)
      const time = `${pad(d.getHours())}:${pad(d.getMinutes())}${seconds ? ':' + pad(d.getSeconds()) : ''}`
      return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${time}`
    },
  }
}
