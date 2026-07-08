import { useState } from 'react'
import { useStore } from '../../store/StoreContext.jsx'

export default function TrainersTab() {
  const { data, update } = useStore()
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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Тренеры</h1>
      <p className="text-sm text-navy-500">
        До 10 именных аккаунтов тренеров. Пароль — простая защита от случайного входа, не полноценная система
        безопасности.
      </p>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="text-left text-navy-500 border-b border-navy-100">
              <th className="py-2 pr-4">Имя</th>
              <th className="py-2 pr-4">Логин</th>
              <th className="py-2 pr-4">Пароль</th>
            </tr>
          </thead>
          <tbody>
            {data.trainers.map((t) => (
              <tr key={t.id} className="border-b border-navy-50 last:border-0">
                <td className="py-2 pr-4">
                  <input
                    className="field-input"
                    value={t.name}
                    onChange={(e) => patchTrainer(t.id, { name: e.target.value })}
                  />
                </td>
                <td className="py-2 pr-4">
                  <input
                    className="field-input"
                    value={t.login}
                    onChange={(e) => patchTrainer(t.id, { login: e.target.value })}
                  />
                </td>
                <td className="py-2 pr-4">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
