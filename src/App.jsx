import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store/StoreContext.jsx'
import HomePage from './pages/HomePage.jsx'
import SubmitPage from './pages/SubmitPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ProgressPage from './pages/ProgressPage.jsx'
import RulesPage from './pages/RulesPage.jsx'
import DashboardLayout from './pages/dashboard/DashboardLayout.jsx'
import SettingsTab from './pages/dashboard/SettingsTab.jsx'
import ProfileTab from './pages/dashboard/ProfileTab.jsx'
import TrainersTab from './pages/dashboard/TrainersTab.jsx'
import RulesTab from './pages/dashboard/RulesTab.jsx'
import InternsTab from './pages/dashboard/InternsTab.jsx'
import ExamTab from './pages/dashboard/ExamTab.jsx'
import WhatsAppTab from './pages/dashboard/WhatsAppTab.jsx'
import ArchiveTab from './pages/dashboard/ArchiveTab.jsx'
import KnowledgeBaseTab from './pages/dashboard/KnowledgeBaseTab.jsx'

function RequireAuth({ children }) {
  const { currentTrainer } = useStore()
  if (!currentTrainer) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/submit" element={<SubmitPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/progress/:internId" element={<ProgressPage />} />
      <Route path="/rules" element={<RulesPage />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="settings" replace />} />
        <Route path="settings" element={<SettingsTab />} />
        <Route path="profile" element={<ProfileTab />} />
        <Route path="trainers" element={<TrainersTab />} />
        <Route path="rules" element={<RulesTab />} />
        <Route path="interns" element={<InternsTab />} />
        <Route path="exam" element={<ExamTab />} />
        <Route path="whatsapp" element={<WhatsAppTab />} />
        <Route path="archive" element={<ArchiveTab />} />
        <Route path="knowledge" element={<KnowledgeBaseTab />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
