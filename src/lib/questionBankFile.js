import * as XLSX from 'xlsx'

// Читает вопросы из Excel: первый лист, первый столбец, один вопрос в строке.
// Пустые строки и повторы пропускаются; строка-заголовок вида «Вопрос»/«Вопросы» тоже.
export async function readQuestionsFromFile(file) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false })
  const seen = new Set()
  const questions = []
  rows.forEach((row) => {
    const text = String(row?.[0] ?? '').trim()
    if (!text || /^вопрос(ы)?:?$/i.test(text) || seen.has(text)) return
    seen.add(text)
    questions.push(text)
  })
  return questions
}
