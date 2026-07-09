import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'
import StagePath from '../components/StagePath.jsx'
import { groupsWithCounts, openGroupsWithSpace } from '../lib/groups'
import { getCurrentStage } from '../lib/stage'
import logo from '../assets/logo.jpeg'

function formatWindow(g) {
  if (g.isOpen) {
    return g.startDate ? `Открыта с ${g.startDate}` : 'Открыта'
  }
  if (g.endDate) return `Закрыта ${g.endDate}`
  if (g.startDate) return `Была открыта с ${g.startDate}`
  return 'Закрыта'
}

const INFO_CARDS = [
  {
    emoji: '📝',
    color: 'bg-sky-500',
    title: 'Анкета стажёра',
    text: 'Анкету заполняет руководитель стажёра, а не сам стажёр — это ускоряет и упрощает сбор данных.',
    to: '/submit',
  },
  {
    emoji: '⚖️',
    color: 'bg-violet-500',
    title: 'Честное деление',
    text: 'Группы формируются автоматически и равномерно, с учётом подразделения и города каждого стажёра.',
  },
  {
    emoji: '💬',
    color: 'bg-success-500',
    title: 'Уведомление в WhatsApp',
    text: 'После формирования группы каждый стажёр получает приглашение и информацию через WhatsApp.',
  },
  {
    emoji: '📋',
    color: 'bg-navy-700',
    title: 'Правила адаптационной программы',
    text: 'Полные правила программы доступны руководителям и стажёрам без входа в систему.',
    to: '/rules',
  },
]

export default function HomePage() {
  const { data } = useStore()
  const { settings, groups, interns, trainers } = data
  const stage = getCurrentStage(groups, interns)

  const groupsInfo = groupsWithCounts(groups, interns).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  )
  const openGroups = openGroupsWithSpace(groups, interns)
  const collectionOpen = openGroups.length > 0

  return (
    <div className="min-h-screen">
      <header className="relative overflow-hidden bg-gradient-to-br from-navy-900 via-navy-700 to-sky-600 text-white">
        <img
          src={logo}
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute right-[-5%] top-1/2 -translate-y-1/2 h-[240%] w-auto max-w-none opacity-80 mix-blend-multiply saturate-150 contrast-125"
        />
        <div className="relative max-w-5xl mx-auto px-4 py-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{settings.programName}</h1>
            <p className="text-navy-100 mt-2 max-w-2xl">
              Единое место сбора анкет, формирования учебных групп и сопровождения стажёров на протяжении всей
              программы адаптации.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <Link to="/submit" className="btn bg-white text-navy-800 hover:bg-sky-50">
                Заполнить анкету стажёра
              </Link>
              <Link to="/login" className="text-sm text-navy-100 underline hover:text-white">
                Вход для тренеров
              </Link>
            </div>
          </div>
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
            <p className="text-sm text-navy-500 mt-1">
              {collectionOpen ? `Открыто групп: ${openGroups.length}` : 'Сейчас нет открытых групп для приёма анкет.'}
            </p>
          </div>
          <Link to="/submit" className="btn-primary">
            Заполнить анкету
          </Link>
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {INFO_CARDS.map((c) => {
            const content = (
              <>
                <div className={'w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3 ' + c.color}>
                  <span role="img" aria-hidden="true">
                    {c.emoji}
                  </span>
                </div>
                <h3 className="font-semibold mb-2">{c.title}</h3>
                <p className="text-sm text-navy-500">{c.text}</p>
              </>
            )
            return c.to ? (
              <Link key={c.title} to={c.to} className="card hover:bg-navy-50 transition-colors">
                {content}
              </Link>
            ) : (
              <div key={c.title} className="card">
                {content}
              </div>
            )
          })}
        </section>

        <section className="card">
          <h2 className="text-lg font-bold mb-1">Группы и прогресс стажёров</h2>
          <p className="text-sm text-navy-500 mb-4">
            Здесь видно, когда каждая группа открылась и закроется. Руководитель может открыть карточку своего
            стажёра и посмотреть посещаемость, домашние задания и результат экзамена — без входа в систему.
          </p>
          {groupsInfo.length === 0 ? (
            <p className="text-navy-400">Пока нет ни одной группы.</p>
          ) : (
            <div className="space-y-5">
              {groupsInfo.map((g) => {
                const members = interns.filter((i) => i.groupId === g.id)
                const owner = trainers.find((t) => t.id === g.ownerId)
                return (
                  <div
                    key={g.id}
                    className={
                      'rounded-xl border-l-4 pl-4 py-1 ' + (g.isOpen ? 'border-success-500' : 'border-sky-500')
                    }
                  >
                    <h3 className="font-semibold text-navy-700 mb-1 flex flex-wrap items-center gap-2">
                      {g.name}
                      <span
                        className={
                          'text-xs font-medium px-2 py-0.5 rounded-full ' +
                          (g.isOpen ? 'bg-success-50 text-success-600' : 'bg-sky-50 text-sky-600')
                        }
                      >
                        {g.isOpen ? 'приём открыт' : 'сбор закрыт — идёт обучение'}
                      </span>
                      <span className="text-xs text-navy-400 font-normal">{formatWindow(g)}</span>
                    </h3>
                    <p className="text-xs text-navy-500 mb-2">
                      Тренер: <span className="font-medium text-navy-700">{owner?.name || 'без владельца'}</span>
                      {owner?.phone && <> · {owner.phone}</>}
                      {owner?.email && <> · {owner.email}</>}
                    </p>
                    {members.length === 0 ? (
                      <p className="text-sm text-navy-400">Пока нет стажёров в этой группе.</p>
                    ) : (
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
                    )}
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
