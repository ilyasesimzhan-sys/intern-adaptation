import { useTheme } from '../store/ThemeContext.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'
import LangToggle from './LangToggle.jsx'

const BASE =
  'border transition-colors border-navy-200 bg-white text-navy-600 hover:bg-navy-50 ' +
  'dark:border-navy-600 dark:bg-navy-800 dark:text-navy-200 dark:hover:bg-navy-700 '

// Кнопка смены темы вместе с переключателем языка RU / KZ — так оба видны на каждой странице.
export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const { t } = useI18n()
  const isDark = theme === 'dark'

  return (
    <div className="inline-flex items-center gap-2">
      <LangToggle className={BASE + className} />
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? t('Включить светлую тему') : t('Включить тёмную тему')}
        title={isDark ? t('Светлая тема') : t('Тёмная тема')}
        className={'inline-flex items-center justify-center w-9 h-9 rounded-full ' + BASE + className}
      >
        {isDark ? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="4" />
            <path
              strokeLinecap="round"
              d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M20.742 13.045a8.088 8.088 0 0 1-2.077.273c-4.505 0-8.155-3.65-8.155-8.155 0-1.113.223-2.174.627-3.14a.75.75 0 0 0-.926-1.007A10.083 10.083 0 0 0 2 10.917C2 16.484 6.516 21 12.083 21a10.083 10.083 0 0 0 9.51-6.7.75.75 0 0 0-.851-.955Z" />
          </svg>
        )}
      </button>
    </div>
  )
}
