import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useStore } from '../../store/StoreContext.jsx'
import { isTrainerAdmin } from '../../lib/roles'
import Avatar from '../../components/Avatar.jsx'
import logo from '../../assets/logo.jpeg'

const TABS = [
  { to: 'settings', label: 'Настройки сбора' },
  { to: 'profile', label: 'Мой профиль' },
  { to: 'trainers', label: 'Тренеры', adminOnly: true },
  { to: 'rules', label: 'Правила адаптационной программы' },
  { to: 'interns', label: 'Список стажёров' },
  { to: 'exam', label: 'Итоговый экзамен' },
  { to: 'whatsapp', label: 'Рассылка WhatsApp' },
  { to: 'archive', label: 'Архив' },
]

export default function DashboardLayout() {
  const { currentTrainer, logout } = useStore()
  const navigate = useNavigate()
  const admin = isTrainerAdmin(currentTrainer)
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
          <div className="relative font-bold">Кабинет тренера</div>
          <div className="relative flex items-center gap-2 mt-2">
            <Avatar src={currentTrainer?.photo} name={currentTrainer?.name} size={32} />
            <div className="text-sm text-navy-300">{currentTrainer?.name}</div>
          </div>
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
              {tab.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 mt-auto border-t border-navy-700 hidden lg:block">
          <button onClick={handleLogout} className="text-sm text-navy-300 hover:text-white">
            Выйти
          </button>
        </div>
      </aside>

      <div className="relative flex-1 flex flex-col">
        <img
          src={logo}
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] sm:w-[640px] lg:w-[900px] max-w-none opacity-[0.18] mix-blend-multiply saturate-150 z-20"
        />
        <div className="relative z-10 lg:hidden p-3 bg-white border-b border-navy-100 flex justify-end">
          <button onClick={handleLogout} className="text-sm text-navy-500 hover:text-navy-700">
            Выйти
          </button>
        </div>
        <main className="relative z-10 flex-1 p-4 sm:p-6 max-w-5xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
