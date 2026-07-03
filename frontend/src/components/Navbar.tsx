import { Link } from 'react-router-dom'
import { HeartPulse, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import CompanySearchBar from './CompanySearchBar'

interface Props {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}

export default function Navbar({ sidebarCollapsed, onToggleSidebar }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 lg:flex"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>

          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-rose-700 via-red-600 to-blue-600 shadow-sm ring-1 ring-slate-200">
              <HeartPulse className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">ESG Momentum</span>
          </Link>
        </div>

        <div className="flex-1 max-w-2xl hidden md:block">
          <CompanySearchBar size="sm" placeholder="Search companies..." />
        </div>

        <div className="hidden lg:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
          <span className="live-dot h-2 w-2 rounded-full bg-emerald-500" />
          Live workspace
        </div>
      </div>
    </header>
  )
}
