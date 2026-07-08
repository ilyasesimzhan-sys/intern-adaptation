import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'
import StagePath from '../components/StagePath.jsx'
import { getCurrentStage, daysUntil } from '../lib/stage'

export default function HomePage() {
  const { data } = useStore()
  const { settings, interns } = data
  const stage = getCurrentStage(settings)
  const days = daysUntil(settings.collectionEnd)

  const groups = {}
  if (settings.groupsFormed) {
    for (const intern of interns) {
      const g = intern.groupNumber || 1
      if (!groups[g]) groups[g] = []
      groups[g].push(intern)
    }
  }
  const groupNumbers = Object.keys(groups)
    .map(Number)
    .sort((a, b) => a - b)

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
                  'inline-block w-2.5 h-2.5 rounded-full ' +
                  (settings.collectionOpen ? 'bg-success-500' : 'bg-danger-500')
                }
              />
              <span className="font-semibold">
                {settings.collectionOpen ? 'Сбор анкет открыт' : 'Сбор анкет закрыт'}
              </span>
            </div>
            {settings.collectionOpen && settings.collectionEnd && (
              <p className="text-sm text-navy-500 mt-1">
                Окончание сбора: {settings.collectionEnd}
                {days !== null && days >= 0 ? ` (осталось ${days} дн.)` : ''}
              </p>
            )}
            {!settings.collectionOpen && !settings.groupsFormed && (
              <p className="text-sm text-navy-500 mt-1">Приём новых анкет временно недоступен.</p>
            )}
          </div>
          {settings.collectionOpen && !settings.groupsFormed && (
            <Link to="/submit" className="btn-primary">
              Заполнить анкету
            </Link>
          )}
        </section>

        {settings.groupsFormed && (
          <section className="card">
            <h2 className="text-lg font-bold mb-4">Учебные группы</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupNumbers.map((num) => (
                <div key={num} className="border border-navy-100 rounded-xl p-4">
                  <h3 className="font-semibold text-navy-700 mb-2">Группа {num}</h3>
                  <ul className="space-y-1 text-sm">
                    {groups[num].map((i) => (
                      <li key={i.id} className="flex justify-between gap-2">
                        <span>
                          {i.lastName} {i.firstName}
                        </span>
                        <span className="text-navy-400">{i.city}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

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
      </main>
    </div>
  )
}
