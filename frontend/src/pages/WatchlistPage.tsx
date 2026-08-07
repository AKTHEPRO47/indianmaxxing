import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, BookmarkCheck, ChevronRight, Eye, Gauge, Search, ShieldAlert, TrendingDown, TrendingUp } from 'lucide-react'
import { getCompany, getStockData, getWatchlist, removeWatchlistItem } from '../api/client'
import CompanyLogo from '../components/CompanyLogo'
import type { Company, StockQuote } from '../types'
import { clsx } from 'clsx'

type SortKey = 'momentum' | 'esg' | 'risk' | 'move' | 'name'

type QuoteMap = Record<number, StockQuote | null>

export default function WatchlistPage() {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<Company[]>([])
  const [quotes, setQuotes] = useState<QuoteMap>({})
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [industry, setIndustry] = useState('All sectors')
  const [sortKey, setSortKey] = useState<SortKey>('momentum')
  const [removingId, setRemovingId] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      try {
        const watchlist = await getWatchlist()
        if (!active) return
        const results = await Promise.allSettled(watchlist.map(async company => {
          const [details, stockData] = await Promise.all([getCompany(company.id), getStockData(company.id, '1d')])
          return { company: details, quote: stockData?.quote ?? null }
        }))
        if (!active) return
        const nextQuotes: QuoteMap = {}
        const enrichedCompanies = watchlist.map((company, index) => {
          const result = results[index]
          if (result?.status !== 'fulfilled') return company
          nextQuotes[result.value.company.id] = result.value.quote
          return result.value.company
        })
        setCompanies(enrichedCompanies)
        setQuotes(nextQuotes)
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  const industries = useMemo(() => ['All sectors', ...Array.from(new Set(companies.map(company => company.industry).filter(Boolean) as string[])).sort()], [companies])
  const visibleCompanies = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const scoreFor = (company: Company) => {
      const score = company.latest_score
      const quote = quotes[company.id]
      if (sortKey === 'esg') return score?.current_esg_score ?? -Infinity
      if (sortKey === 'risk') return score?.controversy_risk ?? -Infinity
      if (sortKey === 'move') return quote?.change_percent ?? -Infinity
      if (sortKey === 'name') return company.name.toLowerCase()
      return score?.momentum_score ?? -Infinity
    }
    return companies
      .filter(company => industry === 'All sectors' || company.industry === industry)
      .filter(company => !normalized || [company.name, company.ticker, company.industry].some(value => value?.toLowerCase().includes(normalized)))
      .sort((left, right) => typeof scoreFor(left) === 'string'
        ? String(scoreFor(left)).localeCompare(String(scoreFor(right)))
        : Number(scoreFor(right)) - Number(scoreFor(left)))
  }, [companies, industry, query, quotes, sortKey])

  const analytics = useMemo(() => {
    const scores = companies.map(company => company.latest_score).filter(Boolean)
    const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
    const moves = Object.values(quotes).map(quote => quote?.change_percent).filter((value): value is number => value != null)
    return {
      averageEsg: average(scores.map(score => score!.current_esg_score)),
      averageMomentum: average(scores.map(score => score!.momentum_score)),
      averageMove: average(moves),
      risks: scores.filter(score => score!.controversy_risk >= 60).length,
    }
  }, [companies, quotes])

  const removeCompany = async (companyId: number) => {
    setRemovingId(companyId)
    try {
      await removeWatchlistItem(companyId)
      setCompanies(current => current.filter(company => company.id !== companyId))
      setQuotes(current => {
        const next = { ...current }
        delete next[companyId]
        return next
      })
    } finally {
      setRemovingId(null)
    }
  }

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center text-sm text-slate-500">Loading watchlist analytics...</div>

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-slate-800 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="section-label">Personal research board</div>
          <h1 className="mt-1 text-3xl font-bold text-slate-950 dark:text-slate-100">Watchlist</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Prices, ESG direction, controversy exposure, and conviction signals in one place.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><BookmarkCheck className="h-4 w-4 text-emerald-600" />{companies.length} tracked companies</div>
      </header>

      <section className="grid grid-cols-2 gap-px overflow-hidden border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800 lg:grid-cols-4">
        <Metric label="Average ESG" value={analytics.averageEsg.toFixed(1)} tone="text-emerald-600" icon={<Eye className="h-4 w-4" />} />
        <Metric label="Momentum" value={`${analytics.averageMomentum >= 0 ? '+' : ''}${analytics.averageMomentum.toFixed(1)}`} tone={analytics.averageMomentum >= 0 ? 'text-sky-600' : 'text-rose-600'} icon={<Gauge className="h-4 w-4" />} />
        <Metric label="Session move" value={`${analytics.averageMove >= 0 ? '+' : ''}${analytics.averageMove.toFixed(2)}%`} tone={analytics.averageMove >= 0 ? 'text-emerald-600' : 'text-rose-600'} icon={analytics.averageMove >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />} />
        <Metric label="Risk flags" value={String(analytics.risks)} tone={analytics.risks ? 'text-amber-600' : 'text-slate-700'} icon={<ShieldAlert className="h-4 w-4" />} />
      </section>

      <section className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tracked companies" className="input-field w-full pl-10" /></label>
        <select value={industry} onChange={event => setIndustry(event.target.value)} className="input-field min-w-40"><option value="All sectors">All sectors</option>{industries.slice(1).map(value => <option key={value}>{value}</option>)}</select>
        <select value={sortKey} onChange={event => setSortKey(event.target.value as SortKey)} className="input-field min-w-44"><option value="momentum">Sort: momentum</option><option value="esg">Sort: ESG score</option><option value="risk">Sort: controversy risk</option><option value="move">Sort: price move</option><option value="name">Sort: name</option></select>
      </section>

      {visibleCompanies.length ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleCompanies.map(company => {
            const score = company.latest_score
            const quote = quotes[company.id]
            const move = quote?.change_percent ?? null
            const risk = score?.controversy_risk ?? 0
            return (
              <article key={company.id} className="group border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => navigate(`/companies/${company.id}`)} className="flex min-w-0 items-center gap-3 text-left"><CompanyLogo ticker={company.ticker} name={company.name} logoUrl={company.logo_url} size="md" /><span className="min-w-0"><span className="block truncate font-semibold text-slate-950 dark:text-slate-100">{company.name}</span><span className="block text-xs text-slate-500">{company.ticker ?? 'Private'} · {company.exchange ?? 'Unlisted'}</span></span></button>
                  <button onClick={() => void removeCompany(company.id)} disabled={removingId === company.id} className="icon-button shrink-0" aria-label={`Remove ${company.name} from watchlist`} title="Remove from watchlist"><BookmarkCheck className="h-4 w-4 text-emerald-600" /></button>
                </div>
                <div className="mt-5 flex items-end justify-between"><div><div className="text-xs text-slate-500">Last price</div><div className="mt-1 text-xl font-semibold tabular-nums text-slate-950 dark:text-slate-100">{quote?.last_price != null ? `${quote.currency ?? ''} ${quote.last_price.toFixed(2)}` : 'Unavailable'}</div></div><div className={clsx('text-sm font-semibold tabular-nums', move == null ? 'text-slate-400' : move >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{move == null ? '---' : `${move >= 0 ? '+' : ''}${move.toFixed(2)}%`}</div></div>
                <div className="mt-5 grid grid-cols-3 divide-x divide-slate-100 border-y border-slate-100 py-3 text-center dark:divide-slate-800 dark:border-slate-800"><ScoreStat label="ESG" value={score?.current_esg_score} tone="text-emerald-600" /><ScoreStat label="Momentum" value={score?.momentum_score} tone={score?.momentum_score && score.momentum_score >= 0 ? 'text-sky-600' : 'text-rose-600'} signed /><ScoreStat label="Risk" value={risk} tone={risk >= 60 ? 'text-amber-600' : 'text-slate-700'} /></div>
                <div className="mt-4 flex items-center justify-between"><span className="text-xs text-slate-500">{company.industry ?? 'Unclassified'}</span><button onClick={() => navigate(`/companies/${company.id}`)} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">Open analysis <ChevronRight className="h-3.5 w-3.5" /></button></div>
              </article>
            )
          })}
        </section>
      ) : <div className="border border-dashed border-slate-300 px-6 py-16 text-center text-sm text-slate-500 dark:border-slate-700">No tracked companies match these filters.</div>}
    </div>
  )
}

function Metric({ label, value, tone, icon }: { label: string; value: string; tone: string; icon: React.ReactNode }) {
  return <div className="bg-white p-4 dark:bg-slate-900"><div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500">{icon}{label}</div><div className={clsx('mt-3 text-2xl font-semibold tabular-nums', tone)}>{value}</div></div>
}

function ScoreStat({ label, value, tone, signed = false }: { label: string; value: number | undefined; tone: string; signed?: boolean }) {
  return <div><div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div><div className={clsx('mt-1 text-sm font-semibold tabular-nums', tone)}>{value == null ? '---' : `${signed && value >= 0 ? '+' : ''}${value.toFixed(1)}`}</div></div>
}