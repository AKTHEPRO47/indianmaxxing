import { Link } from 'react-router-dom'
import { Moon, PanelLeftClose, PanelLeftOpen, Sun, LogOut, UserRound } from 'lucide-react'
import CompanySearchBar from './CompanySearchBar'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'
import LiveTicker from './LiveTicker'

interface Props {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}

export default function Navbar({ sidebarCollapsed, onToggleSidebar }: Props) {
  const { user, logout, updatePreferences } = useAuth()
  const isDark = document.documentElement.classList.contains('dark')

  const toggleTheme = async () => {
    await updatePreferences({ theme_mode: isDark ? 'light' : 'dark' })
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
      <LiveTicker />
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 lg:flex"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>

          <Link to="/" className="flex items-center gap-2">
            <img src="/image.png" alt="Tricard logo" className="h-8 w-8 rounded-xl object-cover shadow-sm ring-1 ring-slate-200 dark:ring-slate-700" />
            <span className="font-bold text-slate-900 text-sm dark:text-slate-100">Tricard</span>
          </Link>
        </div>

        <div className="flex-1 max-w-2xl hidden md:block">
          <CompanySearchBar size="sm" placeholder="Search companies..." />
        </div>

        <div className="hidden lg:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <span className="live-dot h-2 w-2 rounded-full bg-emerald-500" />
          Signal workspace
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => void toggleTheme()}
                className="btn-secondary h-9 w-9 justify-center px-0"
                aria-label={isDark ? 'Use light theme' : 'Use dark theme'}
                title={isDark ? 'Use light theme' : 'Use dark theme'}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <NotificationBell />
              <Link to="/account" className="btn-secondary text-xs"><UserRound className="h-4 w-4" />{user.full_name ?? user.email}</Link>
              <button onClick={() => logout()} className="btn-secondary text-xs"><LogOut className="h-4 w-4" />Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary text-xs">Login</Link>
              <Link to="/register" className="btn-primary text-xs">Register</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
