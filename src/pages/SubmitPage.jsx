import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'
import { KZ_CITIES, GROUP_CAPACITY } from '../lib/constants'
import { uid } from '../store/defaultData'
import { openGroupsWithSpace } from '../lib/groups'
import { emptyExamAnswers, emptyExamQuestions } from '../lib/exam'

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

  function validate() {
    const errs = {}
    for (const key of Object.keys(EMPTY_FORM)) {
      if (!form[key].trim()) errs[key] = 'Обязательное поле'
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Некорректный email'
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
      return {
        ...prev,
        interns: [
          ...prev.interns,
          {
            id: uid(),
            ...form,
            groupId,
            attendance: {},
            homework: {},
            comment: '',
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
          <h1 className="text-xl font-bold mb-2">Приём анкет закрыт</h1>
          <p className="text-navy-500 mb-4">
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
          <h1 className="text-xl font-bold mb-2 text-success-600">Анкета отправлена</h1>
          <p className="text-navy-500 mb-4">Спасибо! Данные стажёра приняты.</p>
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
