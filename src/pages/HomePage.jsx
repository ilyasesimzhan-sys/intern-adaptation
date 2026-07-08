import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'
import { groupsWithCounts } from '../lib/groups'
import { GROUP_CAPACITY } from '../lib/constants'

export default function HomePage() {
  const { data } = useStore()
  const { settings, groups, interns } = data
  const groupsInfo = groupsWithCounts(groups, interns).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  )
  const openGroups = groupsInfo.filter((g) => g.isOpen && g.count < GROUP_CAPACITY)

  return (
    <div className="min-h-screen">
      <header className="bg-navy-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold">{settings.programName}</h1>
          <p className="text-navy-200 mt-2 max-w-2xl">
            Единое место сбора анкет, формирования учебных групп и сопровождения стажёров на протяжении всей
            программы адаптации.
          </p>
          <Link to="/login" className="inline-block mt-4 text-sm text-navy-200 underline hover:text-white">
            Вход для тренеров
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <section className="card">
          <h2 className="text-lg font-bold mb-4">Открытые группы</h2>
          {openGroups.length === 0 ? (
            <p className="text-navy-400">Сейчас нет открытых групп — приём анкет временно недоступен.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {openGroups.map((g) => (
                <div key={g.id} className="border border-navy-100 rounded-xl p-4 flex flex-col gap-3">
                  <div>
                    <div className="font-semibold">{g.name}</div>
                    <div className="text-sm text-navy-500">
                      {g.count}/{GROUP_CAPACITY} участников
                    </div>
                  </div>
                  <Link to={`/submit?group=${g.id}`} className="btn-primary text-sm">
                    Заполнить анкету
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="text-lg font-bold mb-1">Стажёры</h2>
          <p className="text-sm text-navy-500 mb-4">
            Нажмите на стажёра, чтобы посмотреть его прогресс по адаптационной программе.
          </p>
          {groupsInfo.length === 0 ? (
            <p className="text-navy-400">Пока нет ни одной группы.</p>
          ) : (
            <div className="space-y-5">
              {groupsInfo.map((g) => {
                const members = interns.filter((i) => i.groupId === g.id)
                if (members.length === 0) return null
                return (
                  <div key={g.id}>
                    <h3 className="font-semibold text-navy-700 mb-2">
                      {g.name}{' '}
                      <span
                        className={
                          'ml-2 text-xs font-medium px-2 py-0.5 rounded-full ' +
                          (g.isOpen ? 'bg-success-50 text-success-600' : 'bg-navy-100 text-navy-500')
                        }
                      >
                        {g.isOpen ? 'набор открыт' : 'обучение'}
                      </span>
                    </h3>
                    <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {members.map((i) => (
                        <li key={i.id}>
                          <Link
                            to={`/progress/${i.id}`}
                            className="flex justify-between gap-2 rounded-lg border border-navy-100 px-3 py-2 text-sm hover:bg-navy-50"
                          >
                            <span>
                              {i.lastName} {i.firstName}
                            </span>
                            <span className="text-navy-400">{i.city}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="grid sm:grid-cols-3 gap-4">
          <div className="card">
            <h3 className="font-semibold mb-2">Анкета стажёра</h3>
            <p className="text-sm text-navy-500">
              Анкету заполняет руководитель стажёра, а не сам стажёр — это ускоряет и упрощает сбор данных.
            </p>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-2">До 30 в группе</h3>
            <p className="text-sm text-navy-500">
              Можно одновременно вести несколько групп — каждая принимает анкеты независимо от других.
            </p>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-2">Уведомление в WhatsApp</h3>
            <p className="text-sm text-navy-500">
              После набора группы каждый стажёр получает приглашение и информацию через WhatsApp.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
