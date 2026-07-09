import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'

export default function RulesPage() {
  const { data } = useStore()

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to="/" className="text-sm text-navy-500 hover:text-navy-700">
          ← На главную
        </Link>

        <div className="card">
          <h1 className="text-xl font-bold mb-4">Правила адаптационной программы</h1>
          {data.settings.programRules ? (
            <p className="text-sm whitespace-pre-wrap text-navy-700">{data.settings.programRules}</p>
          ) : (
            <p className="text-sm text-navy-400">Правила пока не заполнены.</p>
          )}
        </div>
      </div>
    </div>
  )
}
