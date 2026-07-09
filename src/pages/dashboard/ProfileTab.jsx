import { useState } from 'react'
import { useStore } from '../../store/StoreContext.jsx'
import { fileToResizedDataUrl } from '../../lib/image'
import Avatar from '../../components/Avatar.jsx'

export default function ProfileTab() {
  const { data, update, currentTrainer } = useStore()
  const [showPassword, setShowPassword] = useState(false)
  const [photoError, setPhotoError] = useState('')

  const trainer = data.trainers.find((t) => t.id === currentTrainer?.id)
  if (!trainer) return null

  function patch(fields) {
    update((prev) => ({
      ...prev,
      trainers: prev.trainers.map((t) => (t.id === trainer.id ? { ...t, ...fields } : t)),
    }))
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPhotoError('Выберите файл изображения.')
      return
    }
    try {
      const dataUrl = await fileToResizedDataUrl(file)
      patch({ photo: dataUrl })
      setPhotoError('')
    } catch {
      setPhotoError('Не удалось загрузить фото, попробуйте другой файл.')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Мой профиль</h1>
      <p className="text-sm text-navy-500">
        Здесь можно изменить свои данные для входа в кабинет и контакты. Роль «Главный логин» назначает только
        главный тренер во вкладке «Тренеры».
      </p>

      <div className="card space-y-6">
        <div className="flex items-center gap-4">
          <Avatar src={trainer.photo} name={trainer.name} size={72} />
          <div className="space-y-2">
            <div className="flex gap-2">
              <label className="btn-secondary text-sm cursor-pointer">
                Загрузить фото
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
              {trainer.photo && (
                <button type="button" onClick={() => patch({ photo: '' })} className="text-sm text-danger-500 hover:text-danger-600">
                  Удалить фото
                </button>
              )}
            </div>
            {photoError && <p className="text-xs text-danger-500">{photoError}</p>}
          </div>
        </div>

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
                className="text-xs text-navy-500 hover:text-navy-700 shrink-0"
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
