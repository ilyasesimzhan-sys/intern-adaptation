import { useStore } from '../../store/StoreContext.jsx'
import { isTrainerAdmin } from '../../lib/roles'

export default function RulesTab() {
  const { data, update, currentTrainer } = useStore()
  const admin = isTrainerAdmin(currentTrainer)

  function patchSettings(patch) {
    update((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Правила адаптационной программы</h1>
      <p className="text-sm text-navy-500 dark:text-navy-400">
        {admin
          ? 'Свободный текст с правилами адаптационной программы. Виден руководителям и стажёрам на странице прогресса и на главной странице сайта.'
          : 'Правила адаптационной программы. Редактировать их может только главный логин.'}
      </p>
      <div className="card">
        {admin ? (
          <textarea
            className="field-input min-h-[320px] font-mono text-sm"
            value={data.settings.programRules}
            onChange={(e) => patchSettings({ programRules: e.target.value })}
          />
        ) : (
          <p className="text-sm whitespace-pre-wrap text-navy-700 dark:text-navy-200">
            {data.settings.programRules}
          </p>
        )}
      </div>
    </div>
  )
}
