import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useStore } from '../../store/StoreContext.jsx'
import { isTrainerAdmin } from '../../lib/roles'

const TABS = [
  { to: 'settings', label: 'Настройки сбора' },
  { to: 'trainers', label: 'Тренеры', adminOnly: true },
  { to: 'rules', label: 'Правила программы' },
  { to: 'interns', label: 'Список стажёров' },
  { to: 'exam', label: 'Итоговый экзамен' },
  { to: 'whatsapp', label: 'Рассылка WhatsApp' },
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
        <div className="p-4 border-b border-navy-700">
          <div className="font-bold">Кабинет тренера</div>
          <div className="text-sm text-navy-300">{currentTrainer?.name}</div>
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

      <div className="flex-1 flex flex-col">
        <div className="lg:hidden p-3 bg-white border-b border-navy-100 flex justify-end">
          <button onClick={handleLogout} className="text-sm text-navy-500 hover:text-navy-700">
            Выйти
          </button>
        </div>
        <main className="flex-1 p-4 sm:p-6 max-w-5xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
