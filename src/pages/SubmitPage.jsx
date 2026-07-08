import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'
import { KZ_CITIES } from '../lib/constants'
import { uid } from '../store/defaultData'

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
}

export default function SubmitPage() {
  const { data, update } = useStore()
  const { settings } = data
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const isOpen = settings.collectionOpen && !settings.groupsFormed

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function validate() {
    const errs = {}
    for (const key of Object.keys(EMPTY_FORM)) {
      if (!form[key].trim()) errs[key] = 'Обязательное поле'
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Некорректный email'
    }
    return errs
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    update((prev) => ({
      ...prev,
      interns: [
        ...prev.interns,
        {
          id: uid(),
          ...form,
          groupNumber: null,
          attendance: {},
          homework: {},
          comment: '',
          examScore: null,
          createdAt: new Date().toISOString(),
        },
      ],
    }))
    setSubmitted(true)
  }

  if (!isOpen) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">Приём анкет закрыт</h1>
          <p className="text-navy-500 mb-4">
            {settings.groupsFormed
              ? 'Набор в группу уже завершён. Обратитесь к тренеру за информацией о следующем наборе.'
              : 'Сбор анкет в данный момент не ведётся. Пожалуйста, зайдите позже.'}
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
          <h1 className="text-xl font-bold mb-2 text-success-600">Анкета отправлена</h1>
          <p className="text-navy-500 mb-4">Спасибо! Данные стажёра приняты и будут учтены при формировании группы.</p>
          <Link to="/" className="btn-secondary">
            На главную
          </Link>
        </div>
      </div>
    )
  }

  const fields = [
    { key: 'lastName', label: 'Фамилия стажёра' },
    { key: 'firstName', label: 'Имя стажёра' },
    { key: 'email', label: 'Электронная почта', type: 'email' },
    { key: 'department', label: 'Подразделение' },
    { key: 'position', label: 'Должность' },
    { key: 'phone', label: 'Контактный телефон стажёра', type: 'tel' },
    { key: 'managerName', label: 'ФИО руководителя' },
    { key: 'managerContact', label: 'Контакты руководителя' },
  ]

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-xl mx-auto">
        <Link to="/" className="text-sm text-navy-500 hover:text-navy-700">
          ← На главную
        </Link>
        <h1 className="text-2xl font-bold mt-4 mb-1">Анкета стажёра</h1>
        <p className="text-navy-500 mb-6 text-sm">
          Анкету заполняет руководитель стажёра. Все поля обязательны.
        </p>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {fields.map(({ key, label, type }) => (
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
          ))}

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

          <button type="submit" className="btn-primary w-full">
            Отправить анкету
          </button>
        </form>
      </div>
    </div>
  )
}
