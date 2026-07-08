import { useStore } from '../../store/StoreContext.jsx'
import { renderTemplate, buildWhatsAppLink } from '../../lib/whatsapp'
import { activeVisibleGroups } from '../../lib/roles'

const DEFAULT_TEMPLATE =
  'Здравствуйте, {name}! Вы зачислены в группу {group} адаптационной программы для стажёров ({title}). Ждём вас на первом занятии!'

export default function WhatsAppTab() {
  const { data, update, currentTrainer } = useStore()
  const { settings, groups, interns: allInterns } = data
  const template = settings.whatsappTemplate ?? DEFAULT_TEMPLATE

  const myGroups = activeVisibleGroups(groups, currentTrainer)
  const myGroupIds = new Set(myGroups.map((g) => g.id))
  const interns = allInterns.filter((i) => myGroupIds.has(i.groupId))

  function setTemplate(value) {
    update((prev) => ({ ...prev, settings: { ...prev.settings, whatsappTemplate: value } }))
  }

  if (interns.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Рассылка WhatsApp</h1>
        <p className="text-navy-400">Пока нет ни одного стажёра.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Рассылка WhatsApp</h1>

      <div className="card space-y-2">
        <label className="field-label">Шаблон сообщения</label>
        <textarea
          className="field-input min-h-[100px]"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
        />
        <p className="text-xs text-navy-400">
          Доступные подстановки: <code>{'{name}'}</code>, <code>{'{group}'}</code>, <code>{'{title}'}</code>
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="text-left text-navy-500 border-b border-navy-100">
              <th className="py-2 pr-3">ФИО</th>
              <th className="py-2 pr-3">Группа</th>
              <th className="py-2 pr-3">Телефон</th>
              <th className="py-2 pr-3" />
            </tr>
          </thead>
          <tbody>
            {interns.map((i) => {
              const groupName = groups.find((g) => g.id === i.groupId)?.name ?? '—'
              const text = renderTemplate(template, i, groupName)
              return (
                <tr key={i.id} className="border-b border-navy-50 last:border-0">
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {i.lastName} {i.firstName}
                  </td>
                  <td className="py-2 pr-3">{groupName}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{i.phone}</td>
                  <td className="py-2 pr-3">
                    <a
                      href={buildWhatsAppLink(i.phone, text)}
                      target="_blank"
                      rel="noreferrer"
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
    </div>
  )
}
