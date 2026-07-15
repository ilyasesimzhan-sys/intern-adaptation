import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'
import { KZ_CITIES, DEPARTMENTS, GROUP_CAPACITY } from '../lib/constants'
import { uid } from '../store/defaultData'
import { openGroupsWithSpace } from '../lib/groups'
import { emptyExamAnswers, emptyExamQuestions } from '../lib/exam'
import ThemeToggle from '../components/ThemeToggle.jsx'

const EMPTY_FORM = {
  lastName: '',
  firstName: '',
  email: '',
  department: '',
  position: '',
  phone: '',
  managerName: '',
  managerContact: '',
  city: '',
  cityOther: '',
}

export default function SubmitPage() {
  const { data, update } = useStore()
  const [searchParams] = useSearchParams()
  const openGroups = openGroupsWithSpace(data.groups, data.interns)
  const preselected = searchParams.get('group')

  const [form, setForm] = useState(EMPTY_FORM)
  const [groupId, setGroupId] = useState(
    preselected && openGroups.some((g) => g.id === preselected) ? preselected : '',
  )
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handlePhoneChange(field, raw) {
    const digits = raw.replace(/\D/g, '').slice(0, 10)
    handleChange(field, digits ? '+7' + digits : '')
  }

  function validate() {
    const errs = {}
    for (const key of Object.keys(EMPTY_FORM)) {
      if (key === 'cityOther') continue
      if (!form[key].trim()) errs[key] = 'Обязательное поле'
    }
    if (form.city === 'Другой' && !form.cityOther.trim()) {
      errs.cityOther = 'Укажите город или село'
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Некорректный email'
    }
    if (form.phone && !/^\+7\d{10}$/.test(form.phone)) {
      errs.phone = 'Введите номер полностью, пример: +77077777777'
    }
    if (form.managerContact && !/^\+7\d{10}$/.test(form.managerContact)) {
      errs.managerContact = 'Введите номер полностью, пример: +77077777777'
    }
    if (!groupId) errs.groupId = 'Выберите группу'
    return errs
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    update((prev) => {
      const stillOpen = openGroupsWithSpace(prev.groups, prev.interns).some((g) => g.id === groupId)
      if (!stillOpen) {
        setErrors({ groupId: 'Группа уже закрылась или заполнилась, выберите другую' })
        return prev
      }
      const { cityOther, ...rest } = form
      return {
        ...prev,
        interns: [
          ...prev.interns,
          {
            id: uid(),
            ...rest,
            city: form.city === 'Другой' ? cityOther.trim() : form.city,
            groupId,
            attendance: {},
            homework: {},
            comments: {},
            examQuestions: emptyExamQuestions(),
            examAnswers: emptyExamAnswers(),
            createdAt: new Date().toISOString(),
          },
        ],
      }
    })
    setSubmitted(true)
  }

  if (openGroups.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-navy-100 dark:bg-navy-800 flex items-center justify-center text-2xl mx-auto mb-4">
            🔒
          </div>
          <h1 className="text-xl font-bold mb-2">Приём анкет закрыт</h1>
          <p className="text-navy-500 dark:text-navy-400 mb-4">
            Сейчас нет ни одной открытой группы. Обратитесь к тренеру за информацией о следующем наборе.
          </p>
          <Link to="/" className="btn-secondary">
            На главную
          </Link>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-success-50 dark:bg-success-500/10 flex items-center justify-center text-2xl mx-auto mb-4">
            ✅
          </div>
          <h1 className="text-xl font-bold mb-2 text-success-600 dark:text-success-400">Анкета отправлена</h1>
          <p className="text-navy-500 dark:text-navy-400 mb-4">Спасибо! Данные стажёра приняты.</p>
          <Link to="/" className="btn-secondary">
            На главную
          </Link>
        </div>
      </div>
    )
  }

  function renderField({ key, label, type }) {
    return (
      <div key={key}>
        <label className="field-label">{label}</label>
        <input
          type={type || 'text'}
          className="field-input"
          value={form[key]}
          onChange={(e) => handleChange(key, e.target.value)}
        />
        {errors[key] && <p className="text-danger-500 text-xs mt-1">{errors[key]}</p>}
      </div>
    )
  }

  function renderPhoneField(key, label) {
    return (
      <div key={key}>
        <label className="field-label">{label}</label>
        <div className="flex">
          <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-navy-200 dark:border-navy-600 bg-navy-50 dark:bg-navy-800 text-sm text-navy-500 dark:text-navy-400">
            +7
          </span>
          <input
            type="tel"
            inputMode="numeric"
            className="field-input rounded-l-none"
            value={form[key].replace(/^\+7/, '')}
            onChange={(e) => handlePhoneChange(key, e.target.value)}
            placeholder="7077777777"
          />
        </div>
        {errors[key] && <p className="text-danger-500 text-xs mt-1">{errors[key]}</p>}
      </div>
    )
  }

  function SectionHeader({ icon, title }) {
    return (
      <div className="flex items-center gap-2 pt-2 first:pt-0">
        <span className="w-6 h-6 rounded-md bg-navy-50 dark:bg-navy-800 flex items-center justify-center text-sm shrink-0">
          {icon}
        </span>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-navy-400 dark:text-navy-500">{title}</h2>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Link to="/" className="text-sm text-navy-500 hover:text-navy-700 dark:text-navy-400 dark:hover:text-navy-200">
            ← На главную
          </Link>
          <ThemeToggle />
        </div>
        <h1 className="text-2xl font-bold mb-1">Анкета стажёра</h1>
        <p className="text-navy-500 dark:text-navy-400 mb-6 text-sm">
          Анкету заполняет руководитель стажёра. Все поля обязательны.
        </p>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="field-label">Группа</label>
            <select className="field-input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">Выберите группу</option>
              {openGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} (осталось {GROUP_CAPACITY - g.count} мест)
                </option>
              ))}
            </select>
            {errors.groupId && <p className="text-danger-500 text-xs mt-1">{errors.groupId}</p>}
          </div>

          <SectionHeader icon="👤" title="Данные стажёра" />
          <div className="space-y-4 pl-8">
            {renderField({ key: 'lastName', label: 'Фамилия стажёра' })}
            {renderField({ key: 'firstName', label: 'Имя стажёра' })}
            {renderField({ key: 'email', label: 'Электронная почта', type: 'email' })}
            {renderPhoneField('phone', 'Контактный телефон стажёра')}
          </div>

          <div className="border-t border-navy-100 dark:border-navy-800" />

          <SectionHeader icon="🏢" title="Подразделение и город" />
          <div className="space-y-4 pl-8">
            <div>
              <label className="field-label">Подразделение</label>
              <select
                className="field-input"
                value={form.department}
                onChange={(e) => handleChange('department', e.target.value)}
              >
                <option value="">Выберите подразделение</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {errors.department && <p className="text-danger-500 text-xs mt-1">{errors.department}</p>}
            </div>

            {renderField({ key: 'position', label: 'Должность' })}

            <div>
              <label className="field-label">Город</label>
              <select
                className="field-input"
                value={form.city}
                onChange={(e) => handleChange('city', e.target.value)}
              >
                <option value="">Выберите город</option>
                {KZ_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errors.city && <p className="text-danger-500 text-xs mt-1">{errors.city}</p>}
            </div>

            {form.city === 'Другой' && (
              <div>
                <label className="field-label">Укажите город или село</label>
                <input
                  className="field-input"
                  value={form.cityOther}
                  onChange={(e) => handleChange('cityOther', e.target.value)}
                />
                {errors.cityOther && <p className="text-danger-500 text-xs mt-1">{errors.cityOther}</p>}
              </div>
            )}
          </div>

          <div className="border-t border-navy-100 dark:border-navy-800" />

          <SectionHeader icon="🧑‍💼" title="Руководитель" />
          <div className="space-y-4 pl-8">
            {renderField({ key: 'managerName', label: 'ФИО руководителя' })}
            {renderPhoneField('managerContact', 'Контакты руководителя')}
          </div>

          <button type="submit" className="btn-primary w-full">
            Отправить анкету
          </button>
        </form>
      </div>
    </div>
  )
}
