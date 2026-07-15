import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, AlertTriangle, Eye, ArrowRight, Zap, Gem, ShieldAlert, Newspaper, Sparkles, Leaf, Gauge, Building2, Landmark } from 'lucide-react'
import { addFavoriteItem, addWatchlistItem, getDashboard, getFavorites, getStockData, getWatchlist, removeFavoriteItem, removeWatchlistItem, searchCompanies } from '../api/client'
import type { DashboardData } from '../types'
import CompanySearchBar from '../components/CompanySearchBar'
import CompanyLogo from '../components/CompanyLogo'
import WatchlistTable from '../components/WatchlistTable'
import ControversyTimeline from '../components/ControversyTimeline'
import NewsCombiner from '../components/NewsCombiner'
import { ClassificationBadge, InvestorSignalBadge } from '../components/InvestorSignalBadge'
import { momentumColor, momentumArrow, esgScoreColor, fmt0 } from '../utils/helpers'
import { clsx } from 'clsx'

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [savedWatchlistIds, setSavedWatchlistIds] = useState<number[]>([])
  const [favoriteIds, setFavoriteIds] = useState<number[]>([])
  const [singaporeStocks, setSingaporeStocks] = useState<any[]>([])
  const [singaporeQuoteMap, setSingaporeQuoteMap] = useState<Record<number, { last_price: number | null; change_percent: number | null; currency: string | null }>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [exchangeFilter, setExchangeFilter] = useState('ALL')
  const [countryFilter, setCountryFilter] = useState('ALL')
  const [industryFilter, setIndustryFilter] = useState('ALL')
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([getDashboard(), getWatchlist(), getFavorites()])
      .then(([dashboardData, watchlistData, favoritesData]) => {
        setData(dashboardData)
        setSavedWatchlistIds(watchlistData.map(company => company.id))
        setFavoriteIds(favoritesData.map(company => company.id))
        return searchCompanies({ country: 'Singapore' })
      })
      .then((sgxData) => {
        setSingaporeStocks(sgxData)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (singaporeStocks.length === 0) {
      setSingaporeQuoteMap({})
      return
    }

    let cancelled = false
    Promise.allSettled(
      singaporeStocks.map(async company => {
        const data = await getStockData(company.id, '1d')
        return [company.id, {
          last_price: data?.quote.last_price ?? null,
          change_percent: data?.quote.change_percent ?? null,
          currency: data?.quote.currency ?? null,
        }] as const
      }),
    ).then(results => {
      if (cancelled) return
      const next: Record<number, { last_price: number | null; change_percent: number | null; currency: string | null }> = {}
      for (const result of results) {
        if (result.status !== 'fulfilled') continue
        const [companyId, quote] = result.value
        next[companyId] = quote
      }
      setSingaporeQuoteMap(next)
    })

    return () => {
      cancelled = true
    }
  }, [singaporeStocks])

  const toggleWatchlist = async (company: { id: number }, saved: boolean) => {
    setSavingId(company.id)
    try {
      if (saved) {
        await removeWatchlistItem(company.id)
        setSavedWatchlistIds(current => current.filter(id => id !== company.id))
        setData(current => current ? { ...current, watchlist: current.watchlist.filter(item => item.id !== company.id) } : current)
      } else {
        await addWatchlistItem(company.id)
        setSavedWatchlistIds(current => [...current, company.id])
        const updatedWatchlist = await getWatchlist()
        setData(current => current ? { ...current, watchlist: updatedWatchlist } : current)
      }
    } finally {
      setSavingId(null)
    }
  }

  const toggleFavorite = async (company: { id: number }, saved: boolean) => {
    setSavingId(company.id)
    try {
      if (saved) {
        await removeFavoriteItem(company.id)
        setFavoriteIds(current => current.filter(id => id !== company.id))
      } else {
        await addFavoriteItem(company.id)
        setFavoriteIds(current => [...current, company.id])
      }
    } finally {
      setSavingId(null)
    }
  }

  if (loading) return <LoadingScreen />

  const watchlist = data?.watchlist ?? []
  const exchangeOptions = ['ALL', ...Array.from(new Set(watchlist.map(c => c.exchange).filter(Boolean) as string[])).sort()]
  const countryOptions = ['ALL', ...Array.from(new Set(watchlist.map(c => c.country).filter(Boolean) as string[])).sort()]
  const industryOptions = ['ALL', ...Array.from(new Set(watchlist.map(c => c.industry).filter(Boolean) as string[])).sort()]

  const filteredWatchlist = watchlist.filter(c => (
    (exchangeFilter === 'ALL' || c.exchange === exchangeFilter)
    && (countryFilter === 'ALL' || c.country === countryFilter)
    && (industryFilter === 'ALL' || c.industry === industryFilter)
  ))

  const avgMomentum = watchlist.length
    ? watchlist.reduce((acc, c) => acc + (c.latest_score?.momentum_score ?? 0), 0) / watchlist.length
    : 0
  const avgESG = watchlist.length
    ? watchlist.reduce((acc, c) => acc + (c.latest_score?.current_esg_score ?? 0), 0) / watchlist.length
    : 0
  const nasdaqCount = watchlist.filter(c => c.exchange === 'NASDAQ').length
  const nyseCount = watchlist.filter(c => c.exchange === 'NYSE').length

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Hero search */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-slate-50 to-blue-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border border-slate-200/70 dark:border-slate-800 text-center py-12 px-4 shadow-sm">
        {/* Floating background orbs */}
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-blue-500 opacity-[0.07] blur-3xl orb-1 pointer-events-none" />
        <div className="absolute -top-10 right-10 w-64 h-64 rounded-full bg-red-900 opacity-[0.08] blur-3xl orb-2 pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-48 h-48 rounded-full bg-blue-600 opacity-[0.06] blur-3xl orb-3 pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight animate-fade-up delay-75">
            <span className="text-slate-900 dark:text-slate-100">Tri</span>
            <span className="gradient-text">card</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base max-w-xl mx-auto animate-fade-up delay-150">
            A creative investing cockpit for momentum, backtests, dividends, and signal-led research.
          </p>
          <div className="max-w-2xl mx-auto animate-fade-up delay-225">
            <CompanySearchBar size="lg" />
          </div>
        </div>
      </div>

      {/* AI Market Summary */}
      {data?.market_summary && (
        <div className="card p-4 flex items-start gap-3 border-l-4 border-l-emerald-500">
          <Zap className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <div className="section-label mb-1">AI Market Pulse</div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{data.market_summary}</p>
          </div>
        </div>
      )}

      <div className="card p-4 border-l-4 border-l-red-900">
        <div className="section-label mb-2">AI Workbench</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <button onClick={() => navigate('/upload')} className="btn-secondary justify-center">AI PDF Extractor</button>
          <button onClick={() => navigate('/matrix')} className="btn-secondary justify-center">Momentum Matrix AI</button>
          <button onClick={() => navigate('/companies/2')} className="btn-secondary justify-center">Copilot Q&A</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Average ESG"
          value={avgESG.toFixed(1)}
          valueClass="text-emerald-600"
          description="Across tracked companies"
          icon={<Leaf className="h-4 w-4" />}
          accentClass="from-emerald-50 to-teal-50"
          badgeClass="bg-emerald-100 text-emerald-700"
        />
        <MetricCard
          label="Average Momentum"
          value={`${avgMomentum > 0 ? '+' : ''}${avgMomentum.toFixed(1)}`}
          valueClass={clsx(momentumColor(avgMomentum))}
          description="Direction of ESG change"
          icon={<Gauge className="h-4 w-4" />}
          accentClass="from-blue-50 to-cyan-50"
          badgeClass="bg-blue-100 text-blue-700"
        />
        <MetricCard
          label="NASDAQ Coverage"
          value={String(nasdaqCount)}
          valueClass="text-blue-600"
          description="Companies from NASDAQ"
          icon={<Building2 className="h-4 w-4" />}
          accentClass="from-indigo-50 to-blue-50"
          badgeClass="bg-blue-100 text-blue-700"
        />
        <MetricCard
          label="NYSE Coverage"
          value={String(nyseCount)}
          valueClass="text-red-600"
          description="Companies from NYSE"
          icon={<Landmark className="h-4 w-4" />}
          accentClass="from-rose-50 to-red-50"
          badgeClass="bg-red-100 text-red-700"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-emerald-600" />
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Singapore Stocks</h2>
          </div>
          <button onClick={() => navigate('/matrix')} className="text-xs font-medium text-emerald-700 hover:text-emerald-800">Open matrix</button>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          {singaporeStocks.map(company => (
            <button key={company.id} onClick={() => navigate(`/companies/${company.id}`)} className="w-full px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">{company.name}</div>
                <div className="text-xs text-slate-500">{company.ticker} · {company.industry}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-semibold text-emerald-700">{company.exchange}</div>
                <div className="text-[11px] text-slate-500">
                  {singaporeQuoteMap[company.id]?.last_price === null || singaporeQuoteMap[company.id]?.last_price === undefined
                    ? 'Live price loading'
                    : `${singaporeQuoteMap[company.id]?.currency ?? 'SGD'} ${singaporeQuoteMap[company.id]!.last_price!.toFixed(2)}${typeof singaporeQuoteMap[company.id]?.change_percent === 'number' ? ` (${singaporeQuoteMap[company.id]!.change_percent! > 0 ? '+' : ''}${singaporeQuoteMap[company.id]!.change_percent!.toFixed(2)}%)` : ''}`}
                </div>
              </div>
            </button>
          ))}
          {singaporeStocks.length === 0 && <EmptyRow label="No Singapore stocks found" />}
        </div>
      </div>

      {/* Top panels row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hidden Winners */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-1.5"><Gem className="w-3.5 h-3.5" />Top Hidden Winners</h2>
            </div>
            <span className="badge-blue text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
              Improving Fast
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {data?.hidden_winners?.length === 0 && <EmptyRow label="No Hidden Winners yet" />}
            {data?.hidden_winners?.map(c => (
              <CompanyRow key={c.id} company={c} onClick={() => navigate(`/companies/${c.id}`)} />
            ))}
          </div>
        </div>

        {/* Overrated Leaders */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-amber-500" />
              <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" />Overrated Leaders</h2>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
              Watch Carefully
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {data?.overrated_leaders?.length === 0 && <EmptyRow label="No Overrated Leaders yet" />}
            {data?.overrated_leaders?.map(c => (
              <CompanyRow key={c.id} company={c} onClick={() => navigate(`/companies/${c.id}`)} />
            ))}
          </div>
        </div>
      </div>

      {/* Full Watchlist */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-slate-500" />
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">ESG Watchlist</h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <select value={exchangeFilter} onChange={e => setExchangeFilter(e.target.value)} className="input-base py-1.5 px-2 text-xs min-w-24">
              {exchangeOptions.map(o => <option key={o}>{o}</option>)}
            </select>
            <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)} className="input-base py-1.5 px-2 text-xs min-w-24">
              {countryOptions.map(o => <option key={o}>{o}</option>)}
            </select>
            <select value={industryFilter} onChange={e => setIndustryFilter(e.target.value)} className="input-base py-1.5 px-2 text-xs min-w-28">
              {industryOptions.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
        {filteredWatchlist.length > 0 ? (
          <WatchlistTable
            companies={filteredWatchlist}
            savedCompanyIds={savedWatchlistIds}
            favoriteCompanyIds={favoriteIds}
            busyCompanyId={savingId}
            onToggleWatchlist={toggleWatchlist}
            onToggleFavorite={toggleFavorite}
          />
        ) : (
          <EmptyRow label="No companies match current filters" />
        )}
      </div>

      {/* Recent Controversies */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-red-900" />
            <h2 className="font-semibold text-slate-900 text-sm">Market News & Signals</h2>
          </div>
          <span className="text-[10px] text-slate-400">Click a source to open it</span>
        </div>
        <div className="p-5">
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-blue-500" />
              News Combiner
            </div>
            {data?.recent_controversies && data.recent_controversies.length > 0 ? (
              <NewsCombiner signals={data.recent_controversies} />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-400">
                No combined news available yet.
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Newspaper className="h-3.5 w-3.5 text-red-900" />
              Source timeline
            </div>
            {data?.recent_controversies && data.recent_controversies.length > 0 ? (
              <ControversyTimeline signals={data.recent_controversies} />
            ) : (
              <div className="text-sm text-slate-400 text-center py-4">No recent controversies detected</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CompanyRow({ company, onClick }: { company: any; onClick: () => void }) {
  const s = company.latest_score
  return (
    <button
      onClick={onClick}
      title={`Open report for ${company.name}`}
      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left group"
    >
      <CompanyLogo ticker={company.ticker} name={company.name} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-900 text-sm">{company.name}</div>
        <div className="text-xs text-slate-400">{company.industry} · {company.country}</div>
      </div>
      {s && (
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            <div className={clsx('text-sm font-bold tabular-nums', esgScoreColor(s.current_esg_score))}>
              {fmt0(s.current_esg_score)}
            </div>
            <div className="text-[10px] text-slate-400">ESG</div>
          </div>
          <div className="text-right">
            <div className={clsx('text-sm font-bold tabular-nums', momentumColor(s.momentum_score))}>
              {momentumArrow(s.momentum_score)} {s.momentum_score > 0 ? '+' : ''}{fmt0(s.momentum_score)}
            </div>
            <div className="text-[10px] text-slate-400">Momentum</div>
          </div>
          <ClassificationBadge classification={s.classification} showIcon={false} />
        </div>
      )}
      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
    </button>
  )
}

function EmptyRow({ label }: { label: string }) {
  return <div className="px-5 py-6 text-sm text-slate-400 text-center">{label}</div>
}

function LoadingScreen() {
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-16 flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500 text-sm">Loading Tricard intelligence...</p>
    </div>
  )
}

function MetricCard({
  label,
  value,
  valueClass,
  description,
  icon,
  accentClass,
  badgeClass,
}: {
  label: string
  value: string
  valueClass: string
  description: string
  icon: React.ReactNode
  accentClass: string
  badgeClass: string
}) {
  return (
    <div className={clsx('card overflow-hidden border-slate-200/80 bg-gradient-to-br shadow-sm rounded-xl min-h-[150px]', accentClass)}>
      <div className="h-1.5 bg-gradient-to-r from-slate-900/10 via-slate-900/5 to-transparent" />
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="section-label mb-2">{label}</div>
            <div className={clsx('text-3xl font-black tracking-tight tabular-nums', valueClass)}>{value}</div>
          </div>
          <div className={clsx('flex h-10 w-10 items-center justify-center rounded-2xl shadow-sm ring-1 ring-white/70', badgeClass)}>
            {icon}
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500">{description}</div>
      </div>
    </div>
  )
}
