import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import CompanyDetail from './pages/CompanyDetail'
import MatrixPage from './pages/MatrixPage'
import DividendsPage from './pages/DividendsPage'
import UploadPage from './pages/UploadPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import AccountPage from './pages/AccountPage'
import PortfolioOptimizerPage from './pages/PortfolioOptimizerPage'
import NewsPage from './pages/NewsPage'
import WatchlistPage from './pages/WatchlistPage'
import StockScreenerPage from './pages/StockScreenerPage'
import AITradeDeskPage from './pages/AITradeDeskPage'
import ProtectedRoute from './components/ProtectedRoute'
import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import { useAuth } from './context/AuthContext'

function ShellLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('tricard-sidebar-collapsed') === 'true')

  useEffect(() => {
    localStorage.setItem('tricard-sidebar-collapsed', String(sidebarCollapsed))
  }, [sidebarCollapsed])

  return (
    <div className="min-h-screen app-grid-bg bg-slate-50 transition-colors dark:bg-slate-950">
      <div className="flex min-h-screen">
        <Sidebar collapsed={sidebarCollapsed} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed(current => !current)} />
          <main className="flex-1"><Outlet /></main>
        </div>
      </div>
    </div>
  )
}

function PublicRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Loading Tricard...</div>
  return user ? <Navigate to="/" replace /> : <Navigate to="/login" replace />
}

export default function App() {
  useEffect(() => {
    if (!localStorage.getItem('tricard-theme')) localStorage.setItem('tricard-theme', 'light')
  }, [])

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route element={<ProtectedRoute><ShellLayout /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/companies/:id" element={<CompanyDetail />} />
          <Route path="/matrix" element={<MatrixPage />} />
          <Route path="/dividends" element={<DividendsPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/portfolio-optimizer" element={<PortfolioOptimizerPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/screener" element={<StockScreenerPage />} />
          <Route path="/ai-trade-desk" element={<AITradeDeskPage />} />
        </Route>
        <Route path="*" element={<PublicRedirect />} />
      </Routes>
    </HashRouter>
  )
}
