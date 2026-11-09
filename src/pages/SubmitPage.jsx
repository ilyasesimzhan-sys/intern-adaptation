import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'
import { KZ_CITIES, DEPARTMENTS, GROUP_CAPACITY, REGIONS } from '../lib/constants'
import { uid } from '../store/defaultData'
import { openGroupsWithSpace } from '../lib/groups'
import { emptyExamAnswers, emptyExamQuestions } from '../lib/exam'
import ThemeToggle from '../components/ThemeToggle.jsx'
import SearchSelect from '../components/SearchSelect.jsx'
import { msg, useI18n } from '../i18n/I18nContext.jsx'

const EMPTY_FORM = {
  lastName: '',
  firstName: '',
  email: '',
  region: '',
  department: '',
  position: '',
  phone: '',
  managerName: '',
  managerContact: '',
  city: '',
  cityOther: '',
}

// Незаполненное поле подсвечивается красным (правило с data-field-error в index.css), под ним — эта подпись.
// В errors хранится русский текст-ключ, а переводится он при отрисовке — так ошибки меняют язык вместе с интерфейсом.
const REQUIRED = msg('Заполнение обязательно')
const PHONE_ERROR = msg('Введите номер полностью, пример: +77077777777')

export default function SubmitPage() {
  const { t } = useI18n()
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

  function clearError(field) {
    setErrors((errs) => {
      if (!errs[field]) return errs
      const { [field]: _, ...rest } = errs
      return rest
    })
  }

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    clearError(field)
  }

  function handlePhoneChange(field, raw) {
    const digits = raw.replace(/\D/g, '').slice(0, 10)
    handleChange(field, digits ? '+7' + digits : '')
  }

  function validate() {
    const errs = {}
    for (const key of Object.keys(EMPTY_FORM)) {
      if (key === 'cityOther') continue
      if (!form[key].trim()) errs[key] = REQUIRED
    }
    if (form.city === 'Другой' && !form.cityOther.trim()) {
      errs.cityOther = REQUIRED
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = msg('Некорректный email')
    }
    if (form.phone && !/^\+7\d{10}$/.test(form.phone)) {
      errs.phone = PHONE_ERROR
    }
    if (form.managerContact && !/^\+7\d{10}$/.test(form.managerContact)) {
      errs.managerContact = PHONE_ERROR
    }
    if (!groupId) errs.groupId = REQUIRED
    return errs
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      // Прокручиваем к первому незаполненному полю, чтобы руководитель сразу увидел, что не так.
      setTimeout(() => {
        document.querySelector('[data-field-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 0)
      return
    }

    update((prev) => {
      const stillOpen = openGroupsWithSpace(prev.groups, prev.interns).some((g) => g.id === groupId)
      if (!stillOpen) {
        setErrors({ groupId: msg('Группа уже закрылась или заполнилась, выберите другую') })
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
          <h1 className="text-xl font-bold mb-2">{t('Приём анкет закрыт')}</h1>
          <p className="text-navy-500 dark:text-navy-400 mb-4">
            {t('Сейчас нет ни одной открытой группы. Обратитесь к тренеру за информацией о следующем наборе.')}
          </p>
          <div className="flex justify-center items-center gap-3">
            <Link to="/" className="btn-secondary">
              {t('На главную')}
            </Link>
            <ThemeToggle />
          </div>
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
          <h1 className="text-xl font-bold mb-2 text-success-600 dark:text-success-400">{t('Анкета отправлена')}</h1>
          <p className="text-navy-500 dark:text-navy-400 mb-4">{t('Спасибо! Данные стажёра приняты.')}</p>
          <div className="flex justify-center items-center gap-3">
            <Link to="/" className="btn-secondary">
              {t('На главную')}
            </Link>
            <ThemeToggle />
          </div>
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
        {errors[key] && <p data-field-error className="text-danger-500 text-xs mt-1">{t(errors[key])}</p>}
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
        {errors[key] && <p data-field-error className="text-danger-500 text-xs mt-1">{t(errors[key])}</p>}
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
            {t('← На главную')}
          </Link>
          <ThemeToggle />
        </div>
        <h1 className="text-2xl font-bold mb-1">{t('Анкета стажёра')}</h1>
        <p className="text-navy-500 dark:text-navy-400 mb-6 text-sm">
          {t('Анкету заполняет руководитель стажёра. Все поля обязательны.')}
        </p>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="field-label">{t('Группа')}</label>
            <select className="field-input" value={groupId} onChange={(e) => {
                setGroupId(e.target.value)
                clearError('groupId')
              }}
            >
              <option value="">{t('Выберите группу')}</option>
              {openGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({t('осталось мест: {n}', { n: GROUP_CAPACITY - g.count })})
                </option>
              ))}
            </select>
            {errors.groupId && <p data-field-error className="text-danger-500 text-xs mt-1">{t(errors.groupId)}</p>}
          </div>

          <SectionHeader icon="👤" title={t('Данные стажёра')} />
          <div className="space-y-4 pl-8">
            {renderField({ key: 'lastName', label: t('Фамилия') })}
            {renderField({ key: 'firstName', label: t('Имя') })}
            {renderField({ key: 'email', label: t('Электронная почта'), type: 'email' })}
            {renderPhoneField('phone', t('Контактный телефон'))}
          </div>

          <div className="border-t border-navy-100 dark:border-navy-800" />

          <SectionHeader icon="🏢" title={t('Регион, подразделение и город')} />
          <div className="space-y-4 pl-8">
            <div>
              <label className="field-label">{t('Регион')}</label>
              <select className="field-input" value={form.region} onChange={(e) => handleChange('region', e.target.value)}>
                <option value="">{t('Выберите регион')}</option>
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {t(r.label)}
                  </option>
                ))}
              </select>
              {errors.region && <p data-field-error className="text-danger-500 text-xs mt-1">{t(errors.region)}</p>}
            </div>

            <div>
              <label className="field-label">{t('Подразделение')}</label>
              <select
                className="field-input"
                value={form.department}
                onChange={(e) => handleChange('department', e.target.value)}
              >
                <option value="">{t('Выберите подразделение')}</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {errors.department && <p data-field-error className="text-danger-500 text-xs mt-1">{t(errors.department)}</p>}
            </div>

            {renderField({ key: 'position', label: t('Должность') })}

            <div>
              <label className="field-label">{t('Город/район')}</label>
              <SearchSelect
                value={form.city}
                onChange={(city) => handleChange('city', city)}
                options={KZ_CITIES}
                optionLabel={(city) => (city === 'Другой' ? t('Другой') : city)}
                placeholder={t('Выберите или начните вводить город/район')}
              />
              {errors.city && <p data-field-error className="text-danger-500 text-xs mt-1">{t(errors.city)}</p>}
            </div>

            {form.city === 'Другой' && (
              <div>
                <label className="field-label">{t('Укажите город или село')}</label>
                <input
                  className="field-input"
                  value={form.cityOther}
                  onChange={(e) => handleChange('cityOther', e.target.value)}
                />
                {errors.cityOther && <p data-field-error className="text-danger-500 text-xs mt-1">{t(errors.cityOther)}</p>}
              </div>
            )}
          </div>

          <div className="border-t border-navy-100 dark:border-navy-800" />

          <SectionHeader icon="🧑‍💼" title={t('Руководитель')} />
          <div className="space-y-4 pl-8">
            {renderField({ key: 'managerName', label: t('ФИО руководителя') })}
            {renderPhoneField('managerContact', t('Контакты руководителя'))}
          </div>

          <button type="submit" className="btn-primary w-full">
            {t('Отправить анкету')}
          </button>
        </form>
      </div>
    </div>
  )
}
