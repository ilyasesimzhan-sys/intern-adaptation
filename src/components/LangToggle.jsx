import { LANGS, useI18n } from '../i18n/I18nContext.jsx'

// Переключатель языка интерфейса RU / KZ. Выбор запоминается в localStorage (см. I18nContext).
export default function LangToggle({ className = '' }) {
  const { lang, setLang, t } = useI18n()

  return (
    <div
      role="group"
      aria-label={t('Язык интерфейса')}
      className={'inline-flex items-center h-9 rounded-full p-0.5 text-xs font-semibold ' + className}
    >
      {LANGS.map((l) => {
        const active = l.code === lang
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => setLang(l.code)}
            aria-pressed={active}
            title={l.name}
            lang={l.code}
            className={
              'h-full px-2.5 rounded-full transition-colors ' +
              (active ? 'bg-navy-700 text-white dark:bg-sky-500 dark:text-navy-950' : 'opacity-70 hover:opacity-100')
            }
          >
            {l.label}
          </button>
        )
      })}
    </div>
  )
}
