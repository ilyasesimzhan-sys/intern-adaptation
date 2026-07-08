import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'

export default function LoginPage() {
  const { login, currentTrainer } = useStore()
  const navigate = useNavigate()
  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (currentTrainer) return <Navigate to="/dashboard" replace />

  function handleSubmit(e) {
    e.preventDefault()
    if (login(loginValue.trim(), password)) {
      navigate('/dashboard')
    } else {
      setError('Неверный логин или пароль')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-sm">
        <h1 className="text-xl font-bold mb-1">Вход для тренеров</h1>
        <p className="text-navy-500 text-sm mb-6">Введите ваш логин и пароль.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="field-label">Логин</label>
            <input
              className="field-input"
              value={loginValue}
              onChange={(e) => setLoginValue(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="field-label">Пароль</label>
            <input
              type="password"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-danger-500 text-sm">{error}</p>}
          <button type="submit" className="btn-primary w-full">
            Войти
          </button>
        </form>
        <Link to="/" className="block text-center text-sm text-navy-500 hover:text-navy-700 mt-4">
          ← На главную
        </Link>
      </div>
    </div>
  )
}
