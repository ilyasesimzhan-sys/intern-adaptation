import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'
import StagePath from '../components/StagePath.jsx'
import { groupsWithCounts } from '../lib/groups'
import { GROUP_CAPACITY } from '../lib/constants'
import { getCurrentStage, daysUntil } from '../lib/stage'

export default function HomePage() {
  const { data } = useStore()
  const { settings, groups, interns } = data
  const stage = getCurrentStage(groups, interns)
  const days = daysUntil(settings.collectionEnd)

  const groupsInfo = groupsWithCounts(groups, interns).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  )
  const openGroups = groupsInfo.filter((g) => g.isOpen && g.count < GROUP_CAPACITY)
  const collectionOpen = openGroups.length > 0

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
          <StagePath current={stage} />
        </section>

        <section className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={
                  'inline-block w-2.5 h-2.5 rounded-full ' + (collectionOpen ? 'bg-success-500' : 'bg-danger-500')
                }
              />
              <span className="font-semibold">{collectionOpen ? 'Сбор анкет открыт' : 'Сбор анкет закрыт'}</span>
            </div>
            {collectionOpen && settings.collectionEnd && (
              <p className="text-sm text-navy-500 mt-1">
                Окончание сбора: {settings.collectionEnd}
                {days !== null && days >= 0 ? ` (осталось ${days} дн.)` : ''}
              </p>
            )}
            {!collectionOpen && (
              <p className="text-sm text-navy-500 mt-1">Сейчас нет открытых групп для приёма анкет.</p>
            )}
          </div>
          <Link to="/submit" className="btn-primary">
            Заполнить анкету
          </Link>
        </section>

        <section className="grid sm:grid-cols-3 gap-4">
          <div className="card">
            <h3 className="font-semibold mb-2">Анкета стажёра</h3>
            <p className="text-sm text-navy-500">
              Анкету заполняет руководитель стажёра, а не сам стажёр — это ускоряет и упрощает сбор данных.
            </p>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-2">Честное деление</h3>
            <p className="text-sm text-navy-500">
              Группы формируются автоматически и равномерно, с учётом подразделения и города каждого стажёра.
            </p>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-2">Уведомление в WhatsApp</h3>
            <p className="text-sm text-navy-500">
              После формирования группы каждый стажёр получает приглашение и информацию через WhatsApp.
            </p>
          </div>
        </section>

        <section className="card">
          <h2 className="text-lg font-bold mb-1">Прогресс стажёров</h2>
          <p className="text-sm text-navy-500 mb-4">
            Руководитель может открыть карточку своего стажёра и посмотреть посещаемость, домашние задания и
            результат экзамена — без входа в систему.
          </p>
          {groupsInfo.every((g) => interns.filter((i) => i.groupId === g.id).length === 0) ? (
            <p className="text-navy-400">Пока нет ни одного стажёра.</p>
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
      </main>
    </div>
  )
}
