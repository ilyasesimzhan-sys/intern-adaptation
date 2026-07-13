import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'
import logo from '../assets/logo.jpeg'
import ThemeToggle from '../components/ThemeToggle.jsx'

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
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center px-4 bg-gradient-to-br from-navy-50 via-sky-50 to-violet-50 dark:from-navy-950 dark:via-navy-900 dark:to-navy-950">
      <img
        src={logo}
        alt=""
        aria-hidden="true"
        className="pointer-events-none select-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] max-w-none sm:w-[900px] opacity-90 dark:opacity-10 mix-blend-multiply saturate-[2] contrast-125"
      />
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="relative card w-full max-w-sm !bg-white/45 dark:!bg-navy-900/70 backdrop-blur-sm">
        <h1 className="text-xl font-bold mb-1">Вход для тренеров</h1>
        <p className="text-navy-500 dark:text-navy-400 text-sm mb-6">Введите ваш логин и пароль.</p>
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
        <Link
          to="/"
          className="block text-center text-sm text-navy-500 hover:text-navy-700 dark:text-navy-400 dark:hover:text-navy-200 mt-4"
        >
          ← На главную
        </Link>
      </div>
    </div>
  )
}
