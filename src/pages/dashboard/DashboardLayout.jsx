import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../../store/StoreContext.jsx'
import { isTrainerAdmin } from '../../lib/roles'
import { ensureDailyBackup } from '../../lib/backup'
import Avatar from '../../components/Avatar.jsx'
import CreatorCard from '../../components/CreatorCard.jsx'
import ThemeToggle from '../../components/ThemeToggle.jsx'
import logo from '../../assets/logo.jpeg'
import { msg, useI18n } from '../../i18n/I18nContext.jsx'

const TABS = [
  { to: 'overview', label: msg('Обзор') },
  { to: 'settings', label: msg('Настройки сбора') },
  { to: 'interns', label: msg('Список стажёров') },
  { to: 'whatsapp', label: msg('Рассылка WhatsApp') },
  { to: 'exam', label: msg('Итоговый экзамен') },
  { to: 'rules', label: msg('Правила адаптационной программы') },
  { to: 'trainers', label: msg('Тренеры'), adminOnly: true },
  { to: 'reports', label: msg('Отчёты') },
  { to: 'archive', label: msg('Архив') },
  { to: 'ispring', label: msg('Логины iSpring') },
  { to: 'knowledge', label: msg('База знаний') },
  { to: 'journal', label: msg('Журнал действий'), adminOnly: true },
  { to: 'backups', label: msg('Резервные копии'), adminOnly: true },
]

export default function DashboardLayout() {
  const { t } = useI18n()
  const { data, currentTrainer, logout } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const admin = isTrainerAdmin(currentTrainer)

  useEffect(() => {
    ensureDailyBackup(data, currentTrainer)
  }, [data, currentTrainer])
  const visibleTabs = TABS.filter((tab) => !tab.adminOnly || admin)

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <aside className="lg:w-64 bg-navy-800 text-white shrink-0">
        <div className="relative overflow-hidden p-4 border-b border-navy-700">
          <img
            src={logo}
            alt=""
            aria-hidden="true"
            className="pointer-events-none select-none absolute -right-16 -top-16 w-[420px] max-w-none opacity-100 mix-blend-multiply saturate-[2.5] contrast-150 brightness-125"
          />
          <div className="relative font-bold">{t('Кабинет тренера')}</div>
          <NavLink
            to="profile"
            className={({ isActive }) =>
              'relative flex items-center gap-2 mt-2 -mx-2 px-2 py-1.5 rounded-lg transition-colors ' +
              (isActive ? 'bg-navy-700' : 'hover:bg-navy-700/60')
            }
          >
            <Avatar
              src={currentTrainer?.photo}
              name={currentTrainer?.name}
              position={currentTrainer?.photoPosition}
              size={44}
            />
            <div className="text-sm text-navy-300">{currentTrainer?.name}</div>
          </NavLink>
        </div>
        <nav className="p-2 flex lg:flex-col gap-1 overflow-x-auto">
          {visibleTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                'px-3 py-2 rounded-lg text-sm whitespace-nowrap ' +
                (isActive ? 'bg-navy-700 font-semibold' : 'hover:bg-navy-700/60 text-navy-200')
              }
            >
              {t(tab.label)}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 mt-auto border-t border-navy-700 hidden lg:block space-y-3">
          <CreatorCard />
          <div className="flex items-center justify-between">
            <button onClick={handleLogout} className="text-sm text-navy-300 hover:text-white">
              {t('Выйти')}
            </button>
            <ThemeToggle className="!bg-navy-700 !border-navy-600 !text-navy-100 hover:!bg-navy-600" />
          </div>
        </div>
      </aside>

      <div className="relative flex-1 flex flex-col">
        <img
          src={logo}
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] sm:w-[640px] lg:w-[900px] max-w-none opacity-[0.05] mix-blend-multiply saturate-150 z-0"
        />
        <div className="relative z-10 lg:hidden p-3 bg-white dark:bg-navy-900 border-b border-navy-100 dark:border-navy-800 flex items-center justify-between">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="text-sm text-navy-500 hover:text-navy-700 dark:text-navy-400 dark:hover:text-navy-200"
          >
            {t('Выйти')}
          </button>
        </div>
        <main className="relative z-10 flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto">
          <div key={location.pathname} className="animate-fadein">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
