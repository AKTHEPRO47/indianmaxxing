import { useMemo, useState, useEffect } from 'react'
import { getMatrix } from '../api/client'
import type { MatrixData, MatrixEntry } from '../types'
import ESGMatrix from '../components/ESGMatrix'
import WatchlistTable from '../components/WatchlistTable'
import { Info, Gem, Rocket, TrendingDown, ShieldAlert, Filter, ZoomIn, ZoomOut, BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Cell } from 'recharts'
import { clsx } from 'clsx'

const QUADRANT_DESC = [
  {
    icon: 'hidden',
    title: 'Hidden Winner',
    esg: 'ESG Score < 60',
    mom: 'Momentum > +20',
    desc: 'Undervalued ESG performers with rapid improvement. Strong forward-looking signal. Buy / Watchlist.',
    color: 'border-blue-300 bg-blue-50',
    textColor: 'text-blue-700',
  },
  {
    icon: 'future',
    title: 'Future Leader',
    esg: 'ESG Score ≥ 60',
    mom: 'Momentum > +20',
    desc: 'Strong ESG position and improving fast. Market leaders in sustainability transformation.',
    color: 'border-emerald-300 bg-emerald-50',
    textColor: 'text-emerald-700',
  },
  {
    icon: 'trap',
    title: 'Value Trap',
    esg: 'ESG Score < 60',
    mom: 'Momentum < −20',
    desc: 'Weak ESG score and declining. High reputational and transition risk. Avoid.',
    color: 'border-red-300 bg-red-50',
    textColor: 'text-red-700',
  },
  {
    icon: 'overrated',
    title: 'Overrated Leader',
    esg: 'ESG Score ≥ 60',
    mom: 'Momentum < −20',
    desc: 'High historical ESG rating but deteriorating. Traditional scores may be lagging reality.',
    color: 'border-amber-300 bg-amber-50',
    textColor: 'text-amber-700',
  },
]

const DRILLDOWN_COLORS: Record<string, string> = {
  'Future Leader': '#10b981',
  'Hidden Winner': '#3b82f6',
  'Overrated Leader': '#f59e0b',
  'Value Trap': '#ef4444',
  'Watchlist': '#94a3b8',
  'Risk Alert': '#dc2626',
}

function normalizeIndustry(industry?: string | null) {
  if (!industry) return 'Unknown'
  return industry.toLowerCase().includes('semiconductor') ? 'Semiconductors' : industry
}

export default function MatrixPage() {
  const [data, setData] = useState<MatrixData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exchangeFilter, setExchangeFilter] = useState('ALL')
  const [industryFilter, setIndustryFilter] = useState('ALL')
  const [countryFilter, setCountryFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [quadrantFocus, setQuadrantFocus] = useState<'ALL' | MatrixEntry['classification']>('ALL')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [chartZoom, setChartZoom] = useState(0)

  useEffect(() => {
    getMatrix()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const allEntries = data?.entries ?? []

  const exchangeOptions = ['ALL', ...Array.from(new Set(allEntries.map(e => e.company.exchange).filter(Boolean) as string[])).sort()]
  const industryOptions = ['ALL', ...Array.from(new Set(allEntries.map(e => normalizeIndustry(e.company.industry)))).sort()]
  const countryOptions = ['ALL', ...Array.from(new Set(allEntries.map(e => e.company.country).filter(Boolean) as string[])).sort()]
  const categoryOptions = ['ALL', ...Array.from(new Set(allEntries.map(e => e.classification))).sort()]

  const filteredEntries = useMemo(() => {
    return allEntries.filter(entry => (
      (exchangeFilter === 'ALL' || entry.company.exchange === exchangeFilter)
      && (industryFilter === 'ALL' || normalizeIndustry(entry.company.industry) === industryFilter)
      && (countryFilter === 'ALL' || entry.company.country === countryFilter)
      && (categoryFilter === 'ALL' || entry.classification === categoryFilter)
    ))
  }, [allEntries, exchangeFilter, industryFilter, countryFilter, categoryFilter])

  useEffect(() => {
    setChartZoom(0)
  }, [exchangeFilter, industryFilter, countryFilter, categoryFilter])

  useEffect(() => {
    if (filteredEntries.length === 0) {
      setSelectedId(null)
      return
    }
    if (!filteredEntries.some(entry => entry.company.id === selectedId)) {
      setSelectedId(filteredEntries[0].company.id)
    }
  }, [filteredEntries, selectedId])

  const selectedEntry = filteredEntries.find(entry => entry.company.id === selectedId) ?? filteredEntries[0] ?? null

  const matrixCompanies = filteredEntries.map(e => ({
    ...e.company,
    latest_score: {
      id: 0,
      company_id: e.company.id,
      current_esg_score: e.current_esg_score,
      momentum_score: e.momentum_score,
      ai_adoption_score: 0,
      controversy_risk: 0,
      confidence_score: 0.8,
      environmental_score: null,
      social_score: null,
      governance_score: null,
      classification: e.classification,
      investor_signal: e.investor_signal,
      created_at: null,
    },
  }))

  const quadrantCounts = [
    { label: 'Hidden Winner', value: filteredEntries.filter(e => e.classification === 'Hidden Winner').length, color: '#3b82f6' },
    { label: 'Future Leader', value: filteredEntries.filter(e => e.classification === 'Future Leader').length, color: '#10b981' },
    { label: 'Value Trap', value: filteredEntries.filter(e => e.classification === 'Value Trap').length, color: '#ef4444' },
    { label: 'Overrated', value: filteredEntries.filter(e => e.classification === 'Overrated Leader').length, color: '#f59e0b' },
  ]

  const exchangeCounts = Array.from(new Map(filteredEntries.map(entry => [entry.company.exchange ?? 'Unknown', 0])).entries()).map(([label]) => ({
    label,
    value: filteredEntries.filter(entry => (entry.company.exchange ?? 'Unknown') === label).length,
    color: label === 'NASDAQ' ? '#3b82f6' : label === 'NYSE' ? '#10b981' : '#94a3b8',
  }))

  const maxChartZoom = Math.max(0, Math.floor((filteredEntries.length - 6) / 2))
  const visibleCount = chartZoom > 0
    ? Math.max(6, filteredEntries.length - chartZoom * 2)
    : filteredEntries.length
  const visibleEntries = filteredEntries.slice(0, visibleCount)

  const quadrantFocusEntries = useMemo(() => {
    if (quadrantFocus === 'ALL') return filteredEntries
    return filteredEntries.filter(entry => entry.classification === quadrantFocus)
  }, [filteredEntries, quadrantFocus])

  const drilldownEntries = [...quadrantFocusEntries]
    .sort((a, b) => {
      if (quadrantFocus === 'Future Leader') return b.current_esg_score - a.current_esg_score
      if (quadrantFocus === 'Hidden Winner') return b.momentum_score - a.momentum_score
      if (quadrantFocus === 'Value Trap') return a.momentum_score - b.momentum_score
      if (quadrantFocus === 'Overrated Leader') return a.momentum_score - b.momentum_score
      return b.current_esg_score - a.current_esg_score
    })
    .slice(0, 8)

  const companies = data?.entries.map(e => ({
    ...e.company,
    latest_score: {
      id: 0,
      company_id: e.company.id,
      current_esg_score: e.current_esg_score,
      momentum_score: e.momentum_score,
      ai_adoption_score: 0,
      controversy_risk: 0,
      confidence_score: 0.8,
      environmental_score: null,
      social_score: null,
      governance_score: null,
      classification: e.classification,
      investor_signal: e.investor_signal,
      created_at: null,
    },
  })) ?? []

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ESG Momentum Matrix</h1>
        <p className="text-slate-500 text-sm mt-1">
          Visualise every company by current ESG score and rate of ESG momentum change.
        </p>
      </div>

      <div className="card p-4 sm:p-5 border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-blue-50/40">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="section-label mb-1 flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" /> Matrix filters</div>
            <div className="text-sm text-slate-500">Filter by exchange, category, industry, or country. Select a point to inspect it.</div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button onClick={() => setChartZoom(z => Math.max(0, z - 1))} disabled={chartZoom === 0} className="btn-secondary text-xs disabled:opacity-50 disabled:cursor-not-allowed">
              <ZoomOut className="w-3.5 h-3.5" />
              Zoom out
            </button>
            <button onClick={() => setChartZoom(z => Math.min(maxChartZoom, z + 1))} disabled={chartZoom >= maxChartZoom} className="btn-secondary text-xs disabled:opacity-50 disabled:cursor-not-allowed">
              <ZoomIn className="w-3.5 h-3.5" />
              Zoom in
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 xl:grid-cols-4 gap-3 text-xs">
          <select value={exchangeFilter} onChange={e => setExchangeFilter(e.target.value)} className="input-base py-2 px-3 text-xs">
            {exchangeOptions.map(option => <option key={option}>{option}</option>)}
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input-base py-2 px-3 text-xs">
            {categoryOptions.map(option => <option key={option}>{option}</option>)}
          </select>
          <select value={industryFilter} onChange={e => setIndustryFilter(e.target.value)} className="input-base py-2 px-3 text-xs">
            {industryOptions.map(option => <option key={option}>{option}</option>)}
          </select>
          <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)} className="input-base py-2 px-3 text-xs">
            {countryOptions.map(option => <option key={option}>{option}</option>)}
          </select>
        </div>
      </div>

      {/* Quadrant explanations */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {QUADRANT_DESC.map(q => (
          <div key={q.title} className={`card p-4 border ${q.color} transition-all rounded-xl`}>
            <button
              type="button"
              onClick={() => {
                setQuadrantFocus(q.title as MatrixEntry['classification'])
                setCategoryFilter(q.title)
              }}
              className={clsx(
                'w-full rounded-xl p-4 text-left transition-all',
                quadrantFocus === q.title ? 'bg-white/80 ring-2 ring-slate-900/10' : 'bg-white/40 hover:bg-white/70'
              )}
            >
              <div className={`flex items-center gap-2 mb-2 ${q.textColor}`}>
                {q.icon === 'hidden'    && <Gem       className="w-5 h-5" />}
                {q.icon === 'future'   && <Rocket     className="w-5 h-5" />}
                {q.icon === 'trap'     && <TrendingDown className="w-5 h-5" />}
                {q.icon === 'overrated'&& <ShieldAlert className="w-5 h-5" />}
                <div className={`font-semibold text-sm`}>{q.title}</div>
              </div>
              <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                <div>{q.esg}</div>
                <div>{q.mom}</div>
              </div>
              <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">{q.desc}</p>
              <div className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Click to zoom into this quadrant
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Matrix chart */}
      <div className="card p-5 border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-blue-50/30">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-slate-900">Scatter Plot</h2>
            <p className="text-xs text-slate-400">Click a company dot to view detail.</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Info className="w-3.5 h-3.5" />
            {filteredEntries.length} matching companies
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
            No companies match the current filters.
          </div>
        ) : (
          <ESGMatrix
            entries={visibleEntries}
            height={560}
            showTickerLabels={false}
            selectedId={selectedId}
            onPointClick={(entry) => setSelectedId(entry.company.id)}
          />
        )}
      </div>

      {selectedEntry && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card p-5 bg-gradient-to-br from-white via-slate-50 to-blue-50/30">
            <div className="section-label mb-2">Selected company</div>
            <div className="text-lg font-bold text-slate-900">{selectedEntry.company.name}</div>
            <div className="text-sm text-slate-500 mt-1">{selectedEntry.company.ticker} · {selectedEntry.company.exchange ?? 'Unknown exchange'}</div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-white/80 border border-slate-200 p-3">
                <div className="section-label mb-1">ESG</div>
                <div className="text-2xl font-bold text-blue-600">{selectedEntry.current_esg_score.toFixed(1)}</div>
              </div>
              <div className="rounded-xl bg-white/80 border border-slate-200 p-3">
                <div className="section-label mb-1">Momentum</div>
                <div className={clsx('text-2xl font-bold', selectedEntry.momentum_score > 0 ? 'text-emerald-600' : 'text-red-500')}>
                  {selectedEntry.momentum_score > 0 ? '+' : ''}{selectedEntry.momentum_score.toFixed(1)}
                </div>
              </div>
            </div>
            <button onClick={() => setSelectedId(selectedEntry.company.id)} className="mt-4 btn-secondary text-xs w-full justify-center">
              Focus point
            </button>
          </div>

          <div className="card p-5 bg-gradient-to-br from-white via-slate-50 to-emerald-50/30">
            <div className="section-label mb-2 flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Quadrant mix</div>
            <ExchangeMiniChart title="Quadrant mix" items={quadrantCounts} />
          </div>

          <div className="card p-5 bg-gradient-to-br from-white via-slate-50 to-blue-50/30">
            <div className="section-label mb-2 flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Exchange mix</div>
            <ExchangeMiniChart title="Exchange mix" items={exchangeCounts} />
          </div>
        </div>
      )}

      <div className="card p-5 border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-indigo-50/30">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">Quadrant Drilldown</h2>
            <p className="text-xs text-slate-400">
              {quadrantFocus === 'ALL' ? 'Showing the active matrix slice' : `Zoomed into ${quadrantFocus}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setQuadrantFocus('ALL')}
            className="btn-secondary text-xs"
          >
            Reset zoom
          </button>
        </div>

        {drilldownEntries.length === 0 ? (
          <div className="text-sm text-slate-400 py-8 text-center">No companies match the current quadrant focus.</div>
        ) : (
          <DrilldownChart entries={drilldownEntries} quadrant={quadrantFocus} />
        )}
      </div>

      {/* Table view */}
      {!loading && matrixCompanies.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-sm">All Companies — Matrix View</h2>
          </div>
          <WatchlistTable companies={matrixCompanies} />
        </div>
      )}

      {/* Scoring methodology note */}
      <div className="card p-5 border-slate-200">
        <h3 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400" />
          Scoring Methodology
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 leading-relaxed">
          <div>
            <div className="font-medium text-slate-700 mb-1">Current ESG Score (0–100)</div>
            <p>Weighted composite: Environmental 40%, Social 30%, Governance 30%. Blends metric data from reports (60%) with signal-based scoring (40%).</p>
          </div>
          <div>
            <div className="font-medium text-slate-700 mb-1">Momentum Score (−100 to +100)</div>
            <p>Year-over-year metric change + positive transition signals − controversy decay. Positive signals weighted by recency. Controversy severity penalised.</p>
          </div>
          <div>
            <div className="font-medium text-slate-700 mb-1">AI Adoption Score (0–100)</div>
            <p>Composite of AI hiring signals, patents, partnerships, product launches, infrastructure investment and automation projects.</p>
          </div>
          <div>
            <div className="font-medium text-slate-700 mb-1">Controversy Risk (0–100)</div>
            <p>Based on number, severity and recency of negative signals. Score above 75 overrides investor signal to Risk Alert regardless of ESG score.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ExchangeMiniChart({ items }: { title: string; items: { label: string; value: number; color: string }[] }) {
  if (items.length === 0) {
    return <div className="text-sm text-slate-400 py-4">No data</div>
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={items} margin={{ top: 6, right: 4, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <RechartsTooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
          {items.map(item => <Cell key={item.label} fill={item.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function DrilldownChart({
  entries,
  quadrant,
}: {
  entries: MatrixEntry[]
  quadrant: 'ALL' | MatrixEntry['classification']
}) {
  const chartData = entries.map(entry => ({
    label: entry.company.ticker ?? entry.company.name.slice(0, 6),
    value: quadrant === 'Future Leader' || quadrant === 'ALL' ? entry.current_esg_score : Math.abs(entry.momentum_score),
    classification: entry.classification,
    name: entry.company.name,
  }))

  const title = quadrant === 'Future Leader'
    ? 'ESG leaders by score'
    : quadrant === 'Value Trap'
      ? 'Downside momentum'
      : quadrant === 'Overrated Leader'
        ? 'Decay focus'
        : quadrant === 'Hidden Winner'
          ? 'Improvement velocity'
          : 'All matching companies'

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
      <div className="xl:col-span-2">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 24, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis dataKey="label" type="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={72} />
            <RechartsTooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
            <Bar dataKey="value" radius={[0, 8, 8, 0]}>
              {chartData.map(item => (
                <Cell key={item.label} fill={DRILLDOWN_COLORS[item.classification] ?? '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="section-label mb-2">Chart view</div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="text-xs text-slate-500 mt-1">
            {quadrant === 'ALL'
              ? 'This chart updates based on your current filters and shows the leading names in the active slice.'
              : 'Click another quadrant above to swap the drilldown chart and zoom into a different sub-category.'}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="section-label mb-2">Top entries</div>
          <div className="space-y-2">
            {chartData.slice(0, 5).map(item => (
              <div key={item.label} className="flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800 truncate">{item.label}</div>
                  <div className="text-slate-400 truncate">{item.name}</div>
                </div>
                <div className={clsx('font-bold tabular-nums', item.classification === 'Value Trap' ? 'text-red-500' : 'text-slate-900')}>
                  {item.value.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
