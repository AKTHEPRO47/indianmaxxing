import { Link, useLocation } from 'react-router-dom'
import {
  BarChart2,
  Grid2x2,
  Coins,
  Upload,
  UserRound,
  ChevronRight,
  Sparkles,
  Newspaper,
  BookmarkCheck,
} from 'lucide-react'
import { clsx } from 'clsx'
import CompanyLogo from './CompanyLogo'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: <BarChart2 className="h-4 w-4" /> },
  { to: '/matrix', label: 'ESG Matrix', icon: <Grid2x2 className="h-4 w-4" /> },
  { to: '/portfolio-optimizer', label: 'Portfolio Optimizer', icon: <Sparkles className="h-4 w-4" />, badge: 'NEW' },
  { to: '/news', label: 'News & Alerts', icon: <Newspaper className="h-4 w-4" />, badge: 'LIVE' },
  { to: '/watchlist', label: 'Watchlist', icon: <BookmarkCheck className="h-4 w-4" /> },
  { to: '/dividends', label: 'Dividends', icon: <Coins className="h-4 w-4" /> },
  { to: '/upload', label: 'Upload Report', icon: <Upload className="h-4 w-4" /> },
  { to: '/account', label: 'Account', icon: <UserRound className="h-4 w-4" /> },
]

const WATCHLIST = [
  { ticker: 'TSLA', name: 'Tesla' },
  { ticker: 'MSFT', name: 'Microsoft' },
  { ticker: 'AAPL', name: 'Apple' },
  { ticker: 'NVDA', name: 'NVIDIA' },
  { ticker: 'AMZN', name: 'Amazon' },
  { ticker: 'SHEL', name: 'Shell' },
]

interface Props {
  collapsed: boolean
}

export default function Sidebar({ collapsed }: Props) {
  const { pathname } = useLocation()
  const { user } = useAuth()

  return (
    <aside className={clsx(
      'sticky top-0 hidden h-screen shrink-0 border-r border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 lg:flex lg:flex-col transition-all duration-200',
      collapsed ? 'w-20' : 'w-72'
    )}>
      <div className={clsx('flex h-16 items-center border-b border-slate-200/80 dark:border-slate-800', collapsed ? 'justify-center px-3' : 'gap-3 px-5')}>
        <img src="/image.png" alt="Tricard logo" className="h-10 w-10 rounded-2xl object-cover shadow-sm ring-1 ring-slate-200 dark:ring-slate-700" />
        {!collapsed && (
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tricard</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Investing intelligence studio</div>
            {user && <div className="mt-1 text-[10px] uppercase tracking-wider text-emerald-600">Signed in · {user.email}</div>}
          </div>
        )}
      </div>

      <div className={clsx('flex-1 overflow-y-auto', collapsed ? 'space-y-4 p-3' : 'space-y-5 p-4')}>
        <nav className="space-y-1.5">
          {!collapsed && <div className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Navigation</div>}
          {NAV_ITEMS.map(item => {
            const active = pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                className={clsx(
                  'group flex items-center rounded-2xl text-sm font-medium transition-all',
                  collapsed ? 'justify-center px-3 py-3' : 'gap-3 px-3 py-3',
                  active
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                )}
                title={collapsed ? item.label : undefined}
              >
                <span className={clsx('rounded-xl p-2 transition-colors', active ? 'bg-white/10' : 'bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700')}>
                  {item.icon}
                </span>
                {!collapsed && <span className="flex-1">{item.label}</span>}
                {!collapsed && 'badge' in item && item.badge && (
                  <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">{item.badge}</span>
                )}
                {!collapsed && <ChevronRight className={clsx('h-4 w-4 transition-transform', active ? 'text-white/70' : 'text-slate-300 group-hover:translate-x-0.5 group-hover:text-slate-500')} />}
              </Link>
            )
          })}
        </nav>

        {!collapsed ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:shadow-none">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Watchlist</div>
                <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">Logo view</div>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">6 names</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-slate-200 p-px dark:bg-slate-700">
              {WATCHLIST.map(item => (
                <div
                  key={item.ticker}
                  className="group flex flex-col items-center gap-2 bg-slate-50 px-2 py-4 text-center transition-colors hover:bg-white dark:bg-slate-950 dark:hover:bg-slate-800"
                  title={item.name}
                >
                  <CompanyLogo ticker={item.ticker} name={item.name} size="sm" />
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-black/60 group-hover:text-black dark:text-slate-400 dark:group-hover:text-slate-100">
                    {item.ticker}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {WATCHLIST.map(item => (
              <div key={item.ticker} className="flex justify-center" title={item.name}>
                <CompanyLogo ticker={item.ticker} name={item.name} size="xs" />
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}