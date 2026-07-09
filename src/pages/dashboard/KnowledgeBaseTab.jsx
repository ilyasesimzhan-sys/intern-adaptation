import { useStore } from '../../store/StoreContext.jsx'
import { isTrainerAdmin } from '../../lib/roles'

export default function KnowledgeBaseTab() {
  const { data, update, currentTrainer } = useStore()
  const admin = isTrainerAdmin(currentTrainer)
  const { knowledgeBaseUrl, knowledgeBaseNote } = data.settings

  function patchSettings(patch) {
    update((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">База знаний</h1>

      {admin && (
        <div className="card space-y-4">
          <div>
            <label className="field-label">Ссылка на базу знаний</label>
            <input
              className="field-input"
              value={knowledgeBaseUrl || ''}
              onChange={(e) => patchSettings({ knowledgeBaseUrl: e.target.value })}
              placeholder="https://drive.google.com/..."
            />
          </div>
          <div>
            <label className="field-label">Описание (необязательно)</label>
            <input
              className="field-input"
              value={knowledgeBaseNote || ''}
              onChange={(e) => patchSettings({ knowledgeBaseNote: e.target.value })}
              placeholder="Например: презентации, шаблоны и записи занятий"
            />
          </div>
        </div>
      )}

      <div className="card space-y-3">
        {knowledgeBaseUrl ? (
          <>
            {knowledgeBaseNote && <p className="text-sm text-navy-500">{knowledgeBaseNote}</p>}
            <a href={knowledgeBaseUrl} target="_blank" rel="noreferrer" className="btn-primary inline-flex">
              Открыть базу знаний
            </a>
          </>
        ) : (
          <p className="text-navy-400">
            {admin
              ? 'Вставьте ссылку выше, чтобы она стала доступна остальным тренерам.'
              : 'Ссылка ещё не добавлена главным логином.'}
          </p>
        )}
      </div>
    </div>
  )
}
