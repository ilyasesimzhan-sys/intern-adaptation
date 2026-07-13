import { useState } from 'react'
import { useStore } from '../../store/StoreContext.jsx'
import AvatarEditor from '../../components/AvatarEditor.jsx'

export default function ProfileTab() {
  const { data, update, currentTrainer } = useStore()
  const [showPassword, setShowPassword] = useState(false)

  const trainer = data.trainers.find((t) => t.id === currentTrainer?.id)
  if (!trainer) return null

  function patch(fields) {
    update((prev) => ({
      ...prev,
      trainers: prev.trainers.map((t) => (t.id === trainer.id ? { ...t, ...fields } : t)),
    }))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Мой профиль</h1>
      <p className="text-sm text-navy-500 dark:text-navy-400">
        Здесь можно изменить свои данные для входа в кабинет и контакты. Роль «Главный логин» назначает только
        главный тренер во вкладке «Тренеры».
      </p>

      <div className="card space-y-6">
        <AvatarEditor
          photo={trainer.photo}
          position={trainer.photoPosition}
          name={trainer.name}
          size={128}
          onPhotoChange={(photo) => patch({ photo })}
          onPositionChange={(photoPosition) => patch({ photoPosition })}
          onRemove={() => patch({ photo: '', photoPosition: null })}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label">Имя</label>
            <input
              className="field-input"
              value={trainer.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Почта</label>
            <input
              type="email"
              className="field-input"
              value={trainer.email || ''}
              onChange={(e) => patch({ email: e.target.value })}
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="field-label">Телефон</label>
            <input
              type="tel"
              className="field-input"
              value={trainer.phone || ''}
              onChange={(e) => patch({ phone: e.target.value })}
              placeholder="+7 700 000 00 00"
            />
          </div>
          <div>
            <label className="field-label">Логин</label>
            <input
              className="field-input"
              value={trainer.login}
              onChange={(e) => patch({ login: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Пароль</label>
            <div className="flex items-center gap-2">
              <input
                type={showPassword ? 'text' : 'password'}
                className="field-input"
                value={trainer.password}
                onChange={(e) => patch({ password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-xs text-navy-500 hover:text-navy-700 dark:text-navy-400 dark:hover:text-navy-200 shrink-0"
              >
                {showPassword ? 'Скрыть' : 'Показать'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
