import { useState } from 'react'
import { useStore } from '../../store/StoreContext.jsx'
import { isTrainerAdmin } from '../../lib/roles'
import { fileToResizedDataUrl } from '../../lib/image'
import Avatar from '../../components/Avatar.jsx'

export default function TrainersTab() {
  const { data, update, currentTrainer } = useStore()
  const [visiblePasswords, setVisiblePasswords] = useState({})
  const [photoErrors, setPhotoErrors] = useState({})

  function patchTrainer(id, patch) {
    update((prev) => ({
      ...prev,
      trainers: prev.trainers.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }))
  }

  function togglePassword(id) {
    setVisiblePasswords((v) => ({ ...v, [id]: !v[id] }))
  }

  async function handlePhotoChange(id, e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPhotoErrors((v) => ({ ...v, [id]: 'Выберите файл изображения.' }))
      return
    }
    try {
      const dataUrl = await fileToResizedDataUrl(file)
      patchTrainer(id, { photo: dataUrl })
      setPhotoErrors((v) => ({ ...v, [id]: '' }))
    } catch {
      setPhotoErrors((v) => ({ ...v, [id]: 'Не удалось загрузить фото, попробуйте другой файл.' }))
    }
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
            <div className="flex items-center gap-4">
              <Avatar src={t.photo} name={t.name} size={56} />
              <div className="space-y-2">
                <div className="flex gap-2">
                  <label className="btn-secondary text-sm cursor-pointer">
                    Загрузить фото
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoChange(t.id, e)}
                    />
                  </label>
                  {t.photo && (
                    <button
                      type="button"
                      onClick={() => patchTrainer(t.id, { photo: '' })}
                      className="text-sm text-danger-500 hover:text-danger-600"
                    >
                      Удалить фото
                    </button>
                  )}
                </div>
                {photoErrors[t.id] && <p className="text-xs text-danger-500">{photoErrors[t.id]}</p>}
              </div>
            </div>

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
