import { useStore } from '../../store/StoreContext.jsx'

export default function RulesTab() {
  const { data, update } = useStore()

  function patchSettings(patch) {
    update((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Правила программы</h1>
      <p className="text-sm text-navy-500">
        Свободный текст с правилами адаптационной программы. Виден и редактируется только внутри кабинета тренера.
      </p>
      <div className="card">
        <textarea
          className="field-input min-h-[320px] font-mono text-sm"
          value={data.settings.programRules}
          onChange={(e) => patchSettings({ programRules: e.target.value })}
        />
      </div>
    </div>
  )
}
