import { HashRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import CompanyDetail from './pages/CompanyDetail'
import MatrixPage from './pages/MatrixPage'
import UploadPage from './pages/UploadPage'
import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('esg-sidebar-collapsed') === 'true'
  })

  useEffect(() => {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('esg-theme', 'light')
  }, [])

  useEffect(() => {
    localStorage.setItem('esg-sidebar-collapsed', String(sidebarCollapsed))
  }, [sidebarCollapsed])

  return (
    <HashRouter>
      <div className="min-h-screen app-grid-bg bg-slate-50 transition-colors">
        <div className="flex min-h-screen">
          <Sidebar collapsed={sidebarCollapsed} />
          <div className="flex min-w-0 flex-1 flex-col">
            <Navbar
              sidebarCollapsed={sidebarCollapsed}
              onToggleSidebar={() => setSidebarCollapsed(current => !current)}
            />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/companies/:id" element={<CompanyDetail />} />
                <Route path="/matrix" element={<MatrixPage />} />
                <Route path="/upload" element={<UploadPage />} />
              </Routes>
            </main>
          </div>
        </div>
      </div>
    </HashRouter>
  )
}
