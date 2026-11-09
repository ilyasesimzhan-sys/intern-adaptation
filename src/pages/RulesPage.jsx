import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'

export default function RulesPage() {
  const { t } = useI18n()
  const { data } = useStore()

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm text-navy-500 hover:text-navy-700 dark:text-navy-400 dark:hover:text-navy-200">
            {t('← На главную')}
          </Link>
          <ThemeToggle />
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 rounded-xl bg-navy-700 dark:bg-sky-500 flex items-center justify-center text-lg shrink-0">
              📋
            </span>
            <h1 className="text-xl font-bold">{t('Правила адаптационной программы')}</h1>
          </div>
          {data.settings.programRules ? (
            <p className="text-sm whitespace-pre-wrap text-navy-700 dark:text-navy-200">
              {data.settings.programRules}
            </p>
          ) : (
            <p className="text-sm text-navy-400 dark:text-navy-500">{t('Правила пока не заполнены.')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
