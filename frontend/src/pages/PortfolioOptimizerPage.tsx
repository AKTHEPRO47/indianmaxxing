import { useState, useCallback, useMemo } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell, Legend,
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts'
import { Plus, X, Sparkles, TrendingUp, BarChart3, ShieldCheck, DollarSign, TrendingDown } from 'lucide-react'
import { clsx } from 'clsx'
import { searchCompanies, getScoreHistory } from '../api/client'
import type { Company, ScoreSnapshot } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortfolioHolding {
  company: Company
  score: ScoreSnapshot | null
  amount: number // dollar amount invested
}

interface FrontierPoint {
  risk: number
  esgAlpha: number
  label?: string
  isCurrent?: boolean
  isOptimal?: boolean
  isBenchmark?: boolean
}

// ─── S&P 500 Benchmark ───────────────────────────────────────────────────────

const SP500: { esgAlpha: number; risk: number; momentum: number; controversy: number; annualReturn: number; sharpe: number } = {
  esgAlpha: 52,
  risk: 17.5,
  momentum: 9.8,
  controversy: 18,
  annualReturn: 10.2,
  sharpe: 0.62,
}

// ─── Math helpers ─────────────────────────────────────────────────────────────

function calcMetrics(holdings: PortfolioHolding[]) {
  const total = holdings.reduce((s, h) => s + h.amount, 0) || 1
  let esgAlpha = 0, momentum = 0, controversy = 0, variance = 0
  for (const h of holdings) {
    const w = h.amount / total
    const esg = h.score?.current_esg_score ?? 50
    const mom = h.score?.momentum_score ?? 0
    const risk = h.score?.controversy_risk ?? 50
    esgAlpha += w * esg
    momentum += w * mom
    controversy += w * risk
    variance += w * w * (risk * 0.6 + (100 - esg) * 0.4)
  }
  const risk = Math.sqrt(variance) * 2.5
  const sharpeProxy = risk > 0 ? (esgAlpha - 40) / risk : 0
  const estReturn = 4.5 + momentum * 0.55 + (esgAlpha - 50) * 0.12
  return { esgAlpha, risk, momentum, controversy, sharpeProxy, estReturn }
}

function frontier(holdings: PortfolioHolding[]): FrontierPoint[] {
  if (holdings.length < 2) return []
  return Array.from({ length: 300 }, () => {
    const raw = holdings.map(() => Math.random())
    const sum = raw.reduce((a, b) => a + b, 0)
    const sim = holdings.map((h, i) => ({ ...h, amount: (raw[i] / sum) * 1000 }))
    const m = calcMetrics(sim)
    return { risk: +m.risk.toFixed(2), esgAlpha: +m.esgAlpha.toFixed(2) }
  })
}

function optimal(pts: FrontierPoint[]): FrontierPoint | null {
  return pts.reduce<FrontierPoint | null>((best, p) => {
    const s = p.risk > 0 ? (p.esgAlpha - 40) / p.risk : 0
    const bs = best && best.risk > 0 ? (best.esgAlpha - 40) / best.risk : -Infinity
    return s > bs ? p : best
  }, null)
}

const fmt$ = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000 ? `$${(n / 1_000).toFixed(1)}K`
  : `$${n.toFixed(0)}`

// ─── Sub-components ──────────────────────────────────────────────────────────

const COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899','#0ea5e9','#8b5cf6','#f97316','#14b8a6','#ef4444','#a3e635']

const Tile = ({ label, value, sub, color = 'text-slate-900' }: { label: string; value: string; sub?: string; color?: string }) => (
  <div className="card p-4 text-center">
    <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">{label}</div>
    <div className={clsx('text-2xl font-bold', color)}>{value}</div>
    {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
  </div>
)

const FrontierTip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload as FrontierPoint
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-xs">
      <div className="font-semibold text-slate-700 mb-1">
        {p.isCurrent ? '⭐ Your Portfolio' : p.isOptimal ? '▲ Optimal' : p.isBenchmark ? '● S&P 500' : 'Simulated'}
      </div>
      <div>ESG Alpha: <strong>{p.esgAlpha.toFixed(1)}</strong></div>
      <div>Risk: <strong>{p.risk.toFixed(1)}</strong></div>
      {(p.isCurrent || p.isOptimal || p.isBenchmark) && (
        <div>Sharpe: <strong>{p.risk > 0 ? ((p.esgAlpha - 40) / p.risk).toFixed(2) : '—'}</strong></div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PortfolioOptimizerPage() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [optimized, setOptimized] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [showBenchmark, setShowBenchmark] = useState(true)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    try { setResults((await searchCompanies(q)).filter(c => !holdings.find(h => h.company.id === c.id)).slice(0, 6)) }
    catch { setResults([]) }
  }, [holdings])

  const addHolding = async (company: Company) => {
    setQuery(''); setResults([]); setLoading(true)
    try {
      const snaps = await getScoreHistory(company.id)
      const latest = snaps.length > 0 ? snaps[snaps.length - 1] : null
      setHoldings(prev => [...prev, { company, score: latest, amount: 10000 }])
      setOptimized(false)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const remove = (id: number) => { setHoldings(prev => prev.filter(h => h.company.id !== id)); setOptimized(false) }
  const setAmount = (id: number, v: number) => { setHoldings(prev => prev.map(h => h.company.id === id ? { ...h, amount: v } : h)); setOptimized(false) }

  const totalInvested = holdings.reduce((s, h) => s + h.amount, 0)
  const metrics = useMemo(() => calcMetrics(holdings), [holdings])
  const pts = useMemo(() => frontier(holdings), [holdings])
  const optPt = useMemo(() => optimal(pts), [pts])

  const currentPt: FrontierPoint | null = holdings.length > 0
    ? { risk: metrics.risk, esgAlpha: metrics.esgAlpha, isCurrent: true }
    : null
  const benchPt: FrontierPoint = { risk: SP500.risk, esgAlpha: SP500.esgAlpha, isBenchmark: true }

  const optimize = async () => {
    if (holdings.length < 2) return
    setOptimizing(true)
    await new Promise(r => setTimeout(r, 800))
    let best = -Infinity; let bestW: number[] = holdings.map(() => 1 / holdings.length)
    for (let i = 0; i < 10_000; i++) {
      const raw = holdings.map(() => Math.random())
      const s = raw.reduce((a, b) => a + b, 0)
      const w = raw.map(v => v / s)
      const m = calcMetrics(holdings.map((h, j) => ({ ...h, amount: w[j] * 1000 })))
      const sh = m.risk > 0 ? (m.esgAlpha - 40) / m.risk : 0
      if (sh > best) { best = sh; bestW = w }
    }
    setHoldings(prev => prev.map((h, i) => ({ ...h, amount: Math.round(bestW[i] * totalInvested) })))
    setOptimized(true); setOptimizing(false)
  }

  const pieData = holdings.map((h, i) => ({
    name: h.company.ticker ?? h.company.name,
    value: totalInvested > 0 ? +((h.amount / totalInvested) * 100).toFixed(1) : 0,
    fill: COLORS[i % COLORS.length],
  }))

  const tableRows = [
    { label: 'ESG Score',    port: metrics.esgAlpha.toFixed(1), bench: SP500.esgAlpha.toFixed(1), delta: metrics.esgAlpha - SP500.esgAlpha },
    { label: 'Est. Return',  port: `${metrics.estReturn.toFixed(1)}%`, bench: `${SP500.annualReturn}%`, delta: metrics.estReturn - SP500.annualReturn },
    { label: 'Momentum',     port: metrics.momentum.toFixed(1), bench: SP500.momentum.toFixed(1), delta: metrics.momentum - SP500.momentum },
    { label: 'Risk Score',   port: metrics.risk.toFixed(1), bench: SP500.risk.toFixed(1), delta: SP500.risk - metrics.risk },
    { label: 'Controversy',  port: metrics.controversy.toFixed(1), bench: `${SP500.controversy}`, delta: SP500.controversy - metrics.controversy },
    { label: 'Sharpe',       port: metrics.sharpeProxy.toFixed(2), bench: SP500.sharpe.toFixed(2), delta: metrics.sharpeProxy - SP500.sharpe },
  ]

  const barData = [
    { metric: 'ESG Score',   portfolio: +metrics.esgAlpha.toFixed(1),  benchmark: SP500.esgAlpha },
    { metric: 'Momentum',    portfolio: +Math.max(0, metrics.momentum + 15).toFixed(1), benchmark: SP500.momentum + 15 },
    { metric: 'Est Return%', portfolio: +Math.max(0, metrics.estReturn + 5).toFixed(1), benchmark: SP500.annualReturn + 5 },
    { metric: 'Sharpe×10',   portfolio: +Math.max(0, metrics.sharpeProxy * 10).toFixed(1), benchmark: SP500.sharpe * 10 },
    { metric: 'Low Risk',    portfolio: +Math.max(0, 100 - metrics.risk).toFixed(1), benchmark: +(100 - SP500.risk).toFixed(1) },
  ]

  const radarData = [
    { axis: 'ESG',      portfolio: metrics.esgAlpha,          benchmark: SP500.esgAlpha },
    { axis: 'Return',   portfolio: Math.max(0, metrics.estReturn + 10), benchmark: SP500.annualReturn + 10 },
    { axis: 'Momentum', portfolio: Math.max(0, metrics.momentum + 20),  benchmark: SP500.momentum + 20 },
    { axis: 'Low Risk', portfolio: Math.max(0, 100 - metrics.risk),     benchmark: 100 - SP500.risk },
    { axis: 'Sharpe',   portfolio: Math.max(0, metrics.sharpeProxy * 15), benchmark: SP500.sharpe * 15 },
  ]

  const esgColor = metrics.esgAlpha >= 70 ? 'text-emerald-600' : metrics.esgAlpha >= 50 ? 'text-yellow-600' : 'text-red-500'
  const retColor = metrics.estReturn >= SP500.annualReturn ? 'text-emerald-600' : 'text-orange-500'

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-violet-600" /> ESG Portfolio Optimizer
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enter dollar amounts — no 100% cap. Compare against the S&amp;P 500 benchmark.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
            <input type="checkbox" checked={showBenchmark} onChange={e => setShowBenchmark(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600" />
            S&amp;P 500 benchmark
          </label>
          {holdings.length >= 2 && (
            <button onClick={() => void optimize()} disabled={optimizing} className="btn-primary gap-2">
              <Sparkles className="h-4 w-4" />
              {optimizing ? 'Optimizing…' : 'Auto-Optimize'}
            </button>
          )}
        </div>
      </div>

      {optimized && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <span className="font-semibold text-emerald-900 text-sm">Portfolio optimized! </span>
            <span className="text-xs text-emerald-700">Dollar amounts redistributed to maximise ESG-adjusted Sharpe. Total investment kept the same.</span>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <Plus className="h-4 w-4 text-slate-400 shrink-0" />
              <input className="flex-1 text-sm outline-none bg-transparent placeholder:text-slate-400"
                placeholder="Search: SPY, QQQ, WDC, AAPL, SSNLF, MU, TLT…"
                value={query}
                onChange={e => { setQuery(e.target.value); void search(e.target.value) }} />
              {loading && <span className="text-xs text-slate-400">Loading…</span>}
            </div>
            {results.length > 0 && (
              <div className="absolute top-full mt-1 w-full rounded-2xl border border-slate-200 bg-white shadow-xl z-10 overflow-hidden">
                {results.map(c => (
                  <button key={c.id} onClick={() => void addHolding(c)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors border-b border-slate-100 last:border-b-0">
                    <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">{c.ticker?.slice(0, 2)}</div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{c.name}</div>
                      <div className="text-xs text-slate-400">{c.ticker} · {c.industry ?? 'N/A'}</div>
                    </div>
                    <div className="ml-auto text-xs text-slate-400">ESG {c.latest_score?.current_esg_score?.toFixed(0) ?? '—'}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Holdings */}
          {holdings.length === 0 ? (
            <div className="card p-10 text-center text-slate-400">
              <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Your portfolio is empty</p>
              <p className="text-xs mt-1">Try: SPY, QQQ, AAPL, WDC, SSNLF, MU, HXSCL, TLT</p>
            </div>
          ) : (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Holdings</span>
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" /> Total invested: {fmt$(totalInvested)}
                </span>
              </div>
              {holdings.map((h, i) => {
                const pct = totalInvested > 0 ? (h.amount / totalInvested) * 100 : 0
                return (
                  <div key={h.company.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{h.company.name}</div>
                      <div className="text-xs text-slate-400">{h.company.ticker} · ESG {h.score?.current_esg_score?.toFixed(1) ?? '—'} · {pct.toFixed(1)}%</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 text-sm font-medium">$</span>
                      <input type="number" min={0} step={500} value={h.amount}
                        onChange={e => setAmount(h.company.id, Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-bold text-slate-900 text-right outline-none focus:border-indigo-400" />
                    </div>
                    <button onClick={() => remove(h.company.id)} className="p-1 rounded-lg hover:bg-slate-200 transition-colors">
                      <X className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Metrics */}
          {holdings.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Tile label="ESG Alpha" value={metrics.esgAlpha.toFixed(1)} sub="Portfolio avg" color={esgColor} />
              <Tile label="Est. Return" value={`${metrics.estReturn >= 0 ? '+' : ''}${metrics.estReturn.toFixed(1)}%`} sub="Annualised proxy" color={retColor} />
              <Tile label="Momentum" value={(metrics.momentum > 0 ? '+' : '') + metrics.momentum.toFixed(1)} sub="Weighted avg" color={metrics.momentum >= 0 ? 'text-emerald-600' : 'text-red-500'} />
              <Tile label="Sharpe Proxy" value={metrics.sharpeProxy.toFixed(2)} sub="ESG alpha / risk" color={metrics.sharpeProxy >= 1 ? 'text-emerald-600' : 'text-slate-900'} />
            </div>
          )}
        </div>

        {/* Right: pie */}
        {holdings.length > 0 && (
          <div className="card p-5">
            <div className="section-label mb-1">Allocation</div>
            <h2 className="font-semibold text-slate-900 text-sm mb-3">Portfolio by value — {fmt$(totalInvested)} total</h2>
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value"
                  label={({ name, value }) => `${name} ${value}%`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend formatter={(v: string) => <span className="text-xs text-slate-600">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ─── S&P 500 Benchmark Comparison ─────────────────────────────────── */}
      {showBenchmark && holdings.length > 0 && (
        <div className="card p-5 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="section-label mb-1">Benchmark</div>
              <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" /> Your Portfolio vs S&amp;P 500
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">ESG, return, momentum and risk vs S&amp;P 500 historical averages (10yr).</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {metrics.estReturn > SP500.annualReturn ? (
                <span className="rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +{(metrics.estReturn - SP500.annualReturn).toFixed(1)}% vs S&P
                </span>
              ) : (
                <span className="rounded-full bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" /> {(metrics.estReturn - SP500.annualReturn).toFixed(1)}% vs S&P
                </span>
              )}
              {metrics.esgAlpha > SP500.esgAlpha && (
                <span className="rounded-full bg-violet-100 text-violet-700 text-xs font-semibold px-3 py-1">
                  ESG +{(metrics.esgAlpha - SP500.esgAlpha).toFixed(1)} alpha
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Table */}
            <div className="overflow-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">Metric</th>
                    <th className="text-right px-3 py-2 text-indigo-600 font-semibold">Portfolio</th>
                    <th className="text-right px-3 py-2 text-slate-500 font-medium">S&amp;P 500</th>
                    <th className="text-right px-3 py-2 text-slate-400 font-medium">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map(row => (
                    <tr key={row.label} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-600">{row.label}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">{row.port}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{row.bench}</td>
                      <td className={clsx('px-3 py-2 text-right font-semibold',
                        row.delta > 0.05 ? 'text-emerald-600' : row.delta < -0.05 ? 'text-red-500' : 'text-slate-400')}>
                        {row.delta > 0 ? '+' : ''}{row.delta.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bar chart */}
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="metric" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="portfolio" name="Your Portfolio" fill="#6366f1" radius={[4,4,0,0]} />
                <Bar dataKey="benchmark" name="S&P 500" fill="#94a3b8" radius={[4,4,0,0]} />
                <Legend formatter={(v: string) => <span className="text-xs text-slate-600">{v}</span>} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar */}
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} margin={{ top: 8, right: 30, bottom: 8, left: 30 }}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: '#64748b' }} />
              <Radar name="Your Portfolio" dataKey="portfolio" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
              <Radar name="S&P 500" dataKey="benchmark" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.12} strokeWidth={1.5} strokeDasharray="4 4" />
              <Legend formatter={(v: string) => <span className="text-xs text-slate-600">{v}</span>} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ─── ESG Efficient Frontier ─────────────────────────────────────────── */}
      {holdings.length >= 2 && pts.length > 0 && (
        <div className="card p-5">
          <div className="mb-4">
            <div className="section-label mb-1">The wow feature</div>
            <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-violet-600" /> ESG Efficient Frontier
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
              300 Monte Carlo simulations of your holdings. ★ = your allocation · ▲ = optimal Sharpe · ● = S&P 500 benchmark.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart margin={{ top: 16, right: 24, bottom: 24, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="risk" name="Risk" type="number" domain={['auto','auto']}
                tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                label={{ value: 'Portfolio Risk →', position: 'insideBottom', offset: -16, fontSize: 11, fill: '#94a3b8' }} />
              <YAxis dataKey="esgAlpha" name="ESG Alpha" type="number" domain={['auto','auto']}
                tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                label={{ value: 'ESG Alpha ↑', angle: -90, position: 'insideLeft', offset: 12, fontSize: 11, fill: '#94a3b8' }} />
              <RTooltip content={<FrontierTip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={pts} fill="#a5b4fc" fillOpacity={0.4} r={3} name="Simulated" />
              {showBenchmark && (
                <Scatter data={[benchPt]} fill="#3b82f6" r={9} name="S&P 500"
                  shape={(props: any) => {
                    const { cx, cy } = props
                    return <circle cx={cx} cy={cy} r={8} fill="#3b82f6" stroke="#fff" strokeWidth={2} />
                  }} />
              )}
              {currentPt && (
                <Scatter data={[currentPt]} fill="#f59e0b" r={10} name="Current"
                  shape={(props: any) => {
                    const { cx, cy } = props
                    return <text x={cx} y={cy + 5} textAnchor="middle" fontSize={18} fill="#f59e0b">★</text>
                  }} />
              )}
              {optPt && (
                <Scatter data={[{ ...optPt, isOptimal: true }]} fill="#10b981" r={10} name="Optimal"
                  shape={(props: any) => {
                    const { cx, cy } = props
                    return <polygon points={`${cx},${cy-10} ${cx+9},${cy+5} ${cx-9},${cy+5}`} fill="#10b981" stroke="#fff" strokeWidth={1.5} />
                  }} />
              )}
              <ReferenceLine y={50} stroke="#cbd5e1" strokeDasharray="4 4"
                label={{ value: 'ESG 50', fontSize: 10, fill: '#94a3b8', position: 'right' }} />
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap items-center gap-5 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-300" /> Simulated portfolios</span>
            <span className="flex items-center gap-1.5"><span className="text-amber-500 text-base leading-none">★</span> Your allocation</span>
            <span className="flex items-center gap-1.5"><span className="text-emerald-500 text-sm leading-none">▲</span> Optimal (max Sharpe)</span>
            {showBenchmark && <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" /> S&P 500</span>}
          </div>
        </div>
      )}

      {holdings.length === 1 && (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400">
          <p className="text-sm">Add at least 2 holdings to see the ESG Efficient Frontier &amp; comparison</p>
        </div>
      )}
    </div>
  )
}
