import { useState } from 'react'
import { useStore } from '../../store/StoreContext.jsx'
import { isTrainerAdmin } from '../../lib/roles'
import AvatarEditor from '../../components/AvatarEditor.jsx'

export default function TrainersTab() {
  const { data, update, currentTrainer } = useStore()
  const [visiblePasswords, setVisiblePasswords] = useState({})

  function patchTrainer(id, patch) {
    update((prev) => ({
      ...prev,
      trainers: prev.trainers.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }))
  }

  function togglePassword(id) {
    setVisiblePasswords((v) => ({ ...v, [id]: !v[id] }))
  }

  if (!isTrainerAdmin(currentTrainer)) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Тренеры</h1>
        <p className="text-navy-400">Этот раздел доступен только главному логину.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Тренеры</h1>
      <p className="text-sm text-navy-500">
        До 10 именных аккаунтов тренеров. Пароль — простая защита от случайного входа, не полноценная система
        безопасности. Главный логин видит и может редактировать все группы и данные всех тренеров, остальные —
        только свои (во вкладке «Мой профиль»).
      </p>

      <div className="space-y-4">
        {data.trainers.map((t) => (
          <div key={t.id} className="card space-y-4">
            <AvatarEditor
              photo={t.photo}
              position={t.photoPosition}
              name={t.name}
              size={96}
              onPhotoChange={(photo) => patchTrainer(t.id, { photo })}
              onPositionChange={(photoPosition) => patchTrainer(t.id, { photoPosition })}
              onRemove={() => patchTrainer(t.id, { photo: '', photoPosition: null })}
            />

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="field-label">Имя</label>
                <input
                  className="field-input"
                  value={t.name}
                  onChange={(e) => patchTrainer(t.id, { name: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Почта</label>
                <input
                  type="email"
                  className="field-input"
                  value={t.email || ''}
                  onChange={(e) => patchTrainer(t.id, { email: e.target.value })}
                  placeholder="name@example.com"
                />
              </div>
              <div>
                <label className="field-label">Телефон</label>
                <input
                  type="tel"
                  className="field-input"
                  value={t.phone || ''}
                  onChange={(e) => patchTrainer(t.id, { phone: e.target.value })}
                  placeholder="+7 700 000 00 00"
                />
              </div>
              <div>
                <label className="field-label">Логин</label>
                <input
                  className="field-input"
                  value={t.login}
                  onChange={(e) => patchTrainer(t.id, { login: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Пароль</label>
                <div className="flex items-center gap-2">
                  <input
                    type={visiblePasswords[t.id] ? 'text' : 'password'}
                    className="field-input"
                    value={t.password}
                    onChange={(e) => patchTrainer(t.id, { password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => togglePassword(t.id)}
                    className="text-xs text-navy-500 hover:text-navy-700 shrink-0"
                  >
                    {visiblePasswords[t.id] ? 'Скрыть' : 'Показать'}
                  </button>
                </div>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isTrainerAdmin(t)}
                    onChange={(e) => patchTrainer(t.id, { isAdmin: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Главный логин
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
