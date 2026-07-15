import { useState } from 'react'
import { useStore } from '../../store/StoreContext.jsx'
import { renderTemplate, renderManagerTemplate, buildWhatsAppLink } from '../../lib/whatsapp'
import { activeVisibleGroups } from '../../lib/roles'
import { formatDate } from '../../lib/date'
import { filterInternsBySearch } from '../../lib/internSearch'

function SentBadge({ sentAt, onReset }) {
  if (!sentAt) {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-navy-100 text-navy-500 dark:bg-navy-800 dark:text-navy-400">
        Не отправлено
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400 whitespace-nowrap">
        Отправлено {formatDate(sentAt)}
      </span>
      <button onClick={onReset} title="Отметить как неотправленное" className="text-navy-400 hover:text-navy-600 dark:hover:text-navy-200 text-xs">
        ✕
      </button>
    </span>
  )
}

const DEFAULT_TEMPLATE =
  'Здравствуйте, {name}! Вы зачислены в группу {group} адаптационной программы для стажёров ({title}). Ждём вас на первом занятии!'

const DEFAULT_MANAGER_TEMPLATE =
  'Здравствуйте, {managerName}! Меня зовут {trainerName}, я бизнес-тренер Корпоративного университета Kazakhtelecom. ' +
  'Ваш сотрудник {name} начал обучение по адаптационной программе (группа {group}) с {startDate}. Буду сопровождать ' +
  'его на протяжении всей программы и держать вас в курсе прогресса. Мои контакты: {trainerPhone}.'

export default function WhatsAppTab() {
  const { data, update, currentTrainer } = useStore()
  const { settings, groups, interns: allInterns, trainers } = data
  const template = settings.whatsappTemplate ?? DEFAULT_TEMPLATE
  const managerTemplate = settings.whatsappManagerTemplate ?? DEFAULT_MANAGER_TEMPLATE

  const [search, setSearch] = useState('')

  const myGroups = activeVisibleGroups(groups, currentTrainer)
  const myGroupIds = new Set(myGroups.map((g) => g.id))
  const interns = allInterns.filter((i) => myGroupIds.has(i.groupId))

  // АП считается начавшейся с даты закрытия сбора группы — до этого момента руководителю нечего сообщить.
  const startedGroups = myGroups.filter((g) => !g.isOpen && g.endDate)
  const startedGroupIds = new Set(startedGroups.map((g) => g.id))
  const managerInterns = interns.filter((i) => startedGroupIds.has(i.groupId))

  const visibleInterns = filterInternsBySearch(interns, search)
  const visibleManagerInterns = filterInternsBySearch(managerInterns, search)

  function setTemplate(value) {
    update((prev) => ({ ...prev, settings: { ...prev.settings, whatsappTemplate: value } }))
  }

  function setManagerTemplate(value) {
    update((prev) => ({ ...prev, settings: { ...prev.settings, whatsappManagerTemplate: value } }))
  }

  function markSent(internId, field) {
    update((prev) => ({
      ...prev,
      interns: prev.interns.map((i) => (i.id === internId ? { ...i, [field]: new Date().toISOString() } : i)),
    }))
  }

  function resetSent(internId, field) {
    update((prev) => ({
      ...prev,
      interns: prev.interns.map((i) => (i.id === internId ? { ...i, [field]: null } : i)),
    }))
  }

  if (interns.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Рассылка WhatsApp</h1>
        <p className="text-navy-400 dark:text-navy-500">Пока нет ни одного стажёра.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Рассылка WhatsApp</h1>

      <input
        className="field-input max-w-xs"
        placeholder="Поиск по ФИО, email, телефону..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <section className="space-y-4">
        <h2 className="font-semibold">Стажёрам</h2>
        <div className="card space-y-2">
          <label className="field-label">Шаблон сообщения</label>
          <textarea
            className="field-input min-h-[100px]"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
          />
          <p className="text-xs text-navy-400 dark:text-navy-500">
            Доступные подстановки: <code>{'{name}'}</code>, <code>{'{group}'}</code>, <code>{'{title}'}</code>
          </p>
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-navy-500 dark:text-navy-400 border-b border-navy-100 dark:border-navy-700">
                <th className="py-2 pr-3">ФИО</th>
                <th className="py-2 pr-3">Группа</th>
                <th className="py-2 pr-3">Телефон</th>
                <th className="py-2 pr-3">Статус</th>
                <th className="py-2 pr-3" />
              </tr>
            </thead>
            <tbody>
              {visibleInterns.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-navy-400 dark:text-navy-500">
                    Совпадений не найдено
                  </td>
                </tr>
              )}
              {visibleInterns.map((i) => {
                const groupName = groups.find((g) => g.id === i.groupId)?.name ?? '—'
                const text = renderTemplate(template, i, groupName)
                return (
                  <tr key={i.id} className="border-b border-navy-50 dark:border-navy-800 last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {i.lastName} {i.firstName}
                    </td>
                    <td className="py-2 pr-3">{groupName}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{i.phone}</td>
                    <td className="py-2 pr-3">
                      <SentBadge sentAt={i.whatsappSentAt} onReset={() => resetSent(i.id, 'whatsappSentAt')} />
                    </td>
                    <td className="py-2 pr-3">
                      <a
                        href={buildWhatsAppLink(i.phone, text)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => markSent(i.id, 'whatsappSentAt')}
                        className="btn-success text-xs px-3 py-1.5"
                      >
                        Написать
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold">Руководителям стажёров</h2>
        <div className="card space-y-2">
          <label className="field-label">Шаблон сообщения</label>
          <textarea
            className="field-input min-h-[120px]"
            value={managerTemplate}
            onChange={(e) => setManagerTemplate(e.target.value)}
          />
          <p className="text-xs text-navy-400 dark:text-navy-500">
            Доступные подстановки: <code>{'{managerName}'}</code>, <code>{'{name}'}</code>, <code>{'{group}'}</code>,{' '}
            <code>{'{startDate}'}</code>, <code>{'{trainerName}'}</code>, <code>{'{trainerPhone}'}</code>,{' '}
            <code>{'{trainerEmail}'}</code>
          </p>
        </div>

        {managerInterns.length === 0 ? (
          <p className="text-navy-400 dark:text-navy-500 text-sm">
            Пока нет групп с закрытым сбором — рассылка руководителям станет доступна, когда группа закроется и
            начнётся обучение.
          </p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="text-left text-navy-500 dark:text-navy-400 border-b border-navy-100 dark:border-navy-700">
                  <th className="py-2 pr-3">Руководитель</th>
                  <th className="py-2 pr-3">Стажёр</th>
                  <th className="py-2 pr-3">Группа</th>
                  <th className="py-2 pr-3">Контакты</th>
                  <th className="py-2 pr-3">Статус</th>
                  <th className="py-2 pr-3" />
                </tr>
              </thead>
              <tbody>
                {visibleManagerInterns.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-navy-400 dark:text-navy-500">
                      Совпадений не найдено
                    </td>
                  </tr>
                )}
                {visibleManagerInterns.map((i) => {
                  const group = groups.find((g) => g.id === i.groupId)
                  const trainer = trainers.find((t) => t.id === group?.ownerId) || currentTrainer
                  const text = renderManagerTemplate(managerTemplate, i, group?.name, group?.endDate, trainer)
                  return (
                    <tr key={i.id} className="border-b border-navy-50 dark:border-navy-800 last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">{i.managerName}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {i.lastName} {i.firstName}
                      </td>
                      <td className="py-2 pr-3">{group?.name ?? '—'}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{i.managerContact}</td>
                      <td className="py-2 pr-3">
                        <SentBadge
                          sentAt={i.whatsappManagerSentAt}
                          onReset={() => resetSent(i.id, 'whatsappManagerSentAt')}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <a
                          href={buildWhatsAppLink(i.managerContact, text)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => markSent(i.id, 'whatsappManagerSentAt')}
                          className="btn-success text-xs px-3 py-1.5"
                        >
                          Написать
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
