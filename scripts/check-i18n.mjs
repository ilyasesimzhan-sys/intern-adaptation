// Проверка казахского словаря: у каждой строки интерфейса t('…') / tp(n, '…') / msg('…') должен быть перевод в kk.js.
// Дополнительно показывает строки .jsx/.js с кириллицей вне t()/msg() — кандидаты на пропущенный перевод.
// Запуск: node scripts/check-i18n.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const src = join(root, 'src')
const { default: kk } = await import(pathToFileURL(join(src, 'i18n', 'kk.js')).href)

// Строки-данные, которые намеренно остаются на русском: подписи журнала (сохраняются в базу), значение «Другой»
// в анкете, автоподсказка рекомендаций (хранится в данных стажёра), шаблоны WhatsApp (текст сообщения),
// названия и подписи для Excel/PDF, служебные регулярные выражения.
const DATA_LINES = [
  /label: `/,
  /'Другой'/,
  /Повторить темы/,
  /Здравствуйте, \{|Ваш сотрудник \{name\}|'его на протяжении всей программы/,
  /'группа'|'тренер'|'все тренеры'|'мои группы'/,
  /periodText|regionText|'регион не указан'|'все регионы'|'за всё время'/,
  /Уведомление о (завершении|результате) АП'|\['(Обучение|Дата экзамена|Бизнес-тренер|Дата выдачи)'/,
  /replace\(\/ё\/g|\/\^вопрос/,
  /new Error\('Не удалось прочитать изображение'\)/,
]

// Файлы, которые формируют документы (PDF, Excel, резервные копии) и остаются на русском.
const DOCUMENT_FILES = new Set([
  'components/CertificateSheet.jsx',
  'lib/archiveReport.js',
  'lib/backupFile.js',
  'lib/examReport.js',
  'lib/ispringReport.js',
  'lib/periodReport.js',
  'lib/constants.js',
  'store/defaultData.js',
  'i18n/kk.js',
  'i18n/I18nContext.jsx',
  'i18n/dates.js',
])

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : /\.(jsx?|mjs)$/.test(name) ? [p] : []
  })
}

const CALL = /\b(t|tr|tp|msg)\(\s*(?:[^,()'"`]+,\s*)?(['"])((?:\\.|(?!\2).)*)\2/g
const used = new Map()
const suspicious = []
const templates = []

for (const file of walk(src)) {
  const rel = relative(src, file).replace(/\\/g, '/')
  const text = readFileSync(file, 'utf8')
  for (const m of text.matchAll(CALL)) {
    const key = m[3].replace(/\\(['"\\])/g, '$1').replace(/\\n/g, '\n')
    if (!used.has(key)) used.set(key, rel)
  }
  if (/\b(t|tr|msg)\(\s*`/.test(text)) templates.push(rel)
  if (DOCUMENT_FILES.has(rel)) continue
  text.split(/\r?\n/).forEach((line, idx) => {
    const code = line.replace(/(^|\s)\/\/.*$/, '').replace(/\{\/\*.*?\*\/\}/g, '')
    if (!/[А-Яа-яЁё]/.test(code)) return
    if (/^\s*(\*|\/\*)/.test(line)) return
    if (DATA_LINES.some((re) => re.test(line))) return
    // Убираем вызовы t()/msg(), строки-ключи словаря (многострочные t(...)) и формы tp().
    let stripped = code.replace(CALL, '').replace(/console\.warn\([^)]*\)/, '')
    stripped = stripped.replace(/(['"])((?:\\.|(?!\1).)*)\1/g, (m, q, s) => (used.has(s) || /\btp\(/.test(code) ? '' : m))
    if (/[А-Яа-яЁё]/.test(stripped)) suspicious.push(`${rel}:${idx + 1}: ${line.trim()}`)
  })
}

const missing = [...used].filter(([key]) => !Object.prototype.hasOwnProperty.call(kk, key))
const unused = Object.keys(kk).filter((key) => !used.has(key))

console.log(`Строк интерфейса: ${used.size}, в словаре kk: ${Object.keys(kk).length}`)
if (missing.length) {
  console.log(`\nНет перевода (${missing.length}):`)
  for (const [key, file] of missing) console.log(`  ${file}: ${JSON.stringify(key)}`)
}
if (unused.length) console.log(`\nЛишние ключи в kk.js (${unused.length}):\n  ` + unused.map((k) => JSON.stringify(k)).join('\n  '))
if (templates.length) console.log(`\nt()/msg() с шаблонной строкой (так нельзя): ${templates.join(', ')}`)
if (suspicious.length) console.log(`\nКириллица вне t()/msg() (${suspicious.length}):\n  ` + suspicious.join('\n  '))
process.exit(missing.length || templates.length ? 1 : 0)
