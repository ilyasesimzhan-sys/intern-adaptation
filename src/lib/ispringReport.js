import * as XLSX from 'xlsx'

// Выгрузка данных для создания логинов iSpring: анкетные данные стажёров группы + пустые/заполненные логин и пароль.
export function downloadIspringReport(group, interns) {
  const rows = interns.map((i) => ({
    Фамилия: i.lastName,
    Имя: i.firstName,
    'Электронная почта': i.email,
    Подразделение: i.department,
    Должность: i.position,
    'Город/район': i.city,
    'Логин iSpring': i.ispringLogin || '',
    'Пароль iSpring': i.ispringPassword || '',
  }))

  const sheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'iSpring')

  const safeName = group.name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80)
  XLSX.writeFile(workbook, `Логины iSpring — ${safeName}.xlsx`)
}
