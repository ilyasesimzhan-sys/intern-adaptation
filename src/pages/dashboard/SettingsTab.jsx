import { useStore } from '../../store/StoreContext.jsx'
import { formGroups } from '../../lib/groupFormation'

export default function SettingsTab() {
  const { data, update } = useStore()
  const { settings, interns } = data

  function patchSettings(patch) {
    update((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  }

  function handleFormGroups() {
    if (interns.length === 0) {
      alert('Нет ни одной анкеты для формирования групп.')
      return
    }
    if (!confirm(`Сформировать ${settings.numGroups} групп(ы) из ${interns.length} анкет? Приём новых анкет будет закрыт.`)) {
      return
    }
    update((prev) => ({
      ...prev,
      settings: { ...prev.settings, groupsFormed: true, collectionOpen: false },
      interns: formGroups(prev.interns, prev.settings.numGroups),
    }))
  }

  function handleReopen() {
    if (!confirm('Сбросить деление на группы и статус экзамена? Данные анкет сохранятся, номера групп будут очищены.')) {
      return
    }
    update((prev) => ({
      ...prev,
      settings: { ...prev.settings, groupsFormed: false, examOpen: false },
      interns: prev.interns.map((i) => ({ ...i, groupNumber: null })),
    }))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Настройки сбора</h1>

      <div className="card space-y-4">
        <div>
          <label className="field-label">Название программы</label>
          <input
            className="field-input"
            value={settings.programName}
            onChange={(e) => patchSettings({ programName: e.target.value })}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label">Дата начала сбора</label>
            <input
              type="date"
              className="field-input"
              value={settings.collectionStart}
              onChange={(e) => patchSettings({ collectionStart: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Дата окончания сбора</label>
            <input
              type="date"
              className="field-input"
              value={settings.collectionEnd}
              onChange={(e) => patchSettings({ collectionEnd: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center justify-between border border-navy-100 rounded-lg px-4 py-3">
          <div>
            <div className="font-medium">Сбор анкет открыт</div>
            <div className="text-sm text-navy-500">Публичная анкета доступна всем на главной странице.</div>
          </div>
          <button
            onClick={() => patchSettings({ collectionOpen: !settings.collectionOpen })}
            disabled={settings.groupsFormed}
            className={
              'relative w-12 h-7 rounded-full transition-colors shrink-0 ' +
              (settings.collectionOpen ? 'bg-success-500' : 'bg-navy-200')
            }
          >
            <span
              className={
                'absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ' +
                (settings.collectionOpen ? 'translate-x-6' : 'translate-x-1')
              }
            />
          </button>
        </div>
        {settings.groupsFormed && (
          <p className="text-xs text-warning-600">
            Группа уже сформирована — чтобы снова открыть сбор, сначала нажмите «Открыть заново».
          </p>
        )}
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">Формирование группы</h2>
        <p className="text-sm text-navy-500">Сейчас анкет: {interns.length}</p>
        <div>
          <label className="field-label">Количество групп</label>
          <input
            type="number"
            min={1}
            max={20}
            className="field-input max-w-[120px]"
            value={settings.numGroups}
            onChange={(e) => patchSettings({ numGroups: Math.max(1, Number(e.target.value) || 1) })}
            disabled={settings.groupsFormed}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          {!settings.groupsFormed ? (
            <button onClick={handleFormGroups} className="btn-primary">
              Сформировать группу
            </button>
          ) : (
            <button onClick={handleReopen} className="btn-secondary">
              Открыть заново
            </button>
          )}
        </div>
        {settings.groupsFormed && (
          <p className="text-sm text-success-600">Группы сформированы. Приём новых анкет закрыт.</p>
        )}
      </div>
    </div>
  )
}
