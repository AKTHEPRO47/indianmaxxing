import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, CheckCircle2, Filter, Medal, RotateCcw, Search, ShieldCheck, SlidersHorizontal, Sparkles, TrendingDown, TrendingUp, WalletCards } from 'lucide-react'
import { getMatrix } from '../api/client'
import CompanyLogo from '../components/CompanyLogo'
import { ClassificationBadge, InvestorSignalBadge } from '../components/InvestorSignalBadge'
import type { MatrixEntry } from '../types'
import { clsx } from 'clsx'

type MarketCapBand = 'ALL' | 'SMALL' | 'MID' | 'LARGE' | 'MEGA'
type DividendBand = 'ALL' | 'NONE' | 'INCOME' | 'HIGH_INCOME'
type SortMode = 'conviction' | 'esg' | 'momentum' | 'ai' | 'risk'
type Preset = 'CUSTOM' | 'BALANCED' | 'MOMENTUM' | 'DEFENSIVE' | 'INCOME'
type RankedEntry = MatrixEntry & { conviction: number; fit: string }

const PRESETS: Array<{ id: Exclude<Preset, 'CUSTOM'>; label: string; description: string; icon: React.ReactNode }> = [
  { id: 'BALANCED', label: 'Quality compounders', description: 'Durable ESG quality with improving signals', icon: <CheckCircle2 className="h-4 w-4" /> },
  { id: 'MOMENTUM', label: 'Momentum leaders', description: 'Accelerating change with controlled risk', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'DEFENSIVE', label: 'Risk disciplined', description: 'Lower controversy exposure and quality floor', icon: <ShieldCheck className="h-4 w-4" /> },
  { id: 'INCOME', label: 'Income focus', description: 'Dividend profile without abandoning quality', icon: <WalletCards className="h-4 w-4" /> },
]

function marketCapInBillions(value?: string | null) {
  const match = value?.replace(/[$,\s]/g, '').toUpperCase().match(/^([0-9]*\.?[0-9]+)([TBMK])?$/)
  if (!match) return null
  const amount = Number(match[1])
  return amount * (match[2] === 'T' ? 1_000 : match[2] === 'M' ? 0.001 : match[2] === 'K' ? 0.000001 : 1)
}

function marketCapBand(value?: string | null): Exclude<MarketCapBand, 'ALL'> | 'UNKNOWN' {
  const billions = marketCapInBillions(value)
  if (billions === null) return 'UNKNOWN'
  if (billions < 10) return 'SMALL'
  if (billions < 50) return 'MID'
  if (billions < 200) return 'LARGE'
  return 'MEGA'
}

function dividendBand(value?: number | null): Exclude<DividendBand, 'ALL'> { return !value || value <= 0 ? 'NONE' : value < 3 ? 'INCOME' : 'HIGH_INCOME' }
function clamp(value: number) { return Math.max(0, Math.min(100, value)) }
function display(value: number | null | undefined) { return value == null ? '---' : value.toFixed(0) }

export default function StockScreenerPage() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<MatrixEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [industry, setIndustry] = useState('ALL')
  const [country, setCountry] = useState('ALL')
  const [size, setSize] = useState<MarketCapBand>('ALL')
  const [dividends, setDividends] = useState<DividendBand>('ALL')
  const [minimumEsg, setMinimumEsg] = useState(65)
  const [minimumMomentum, setMinimumMomentum] = useState(5)
  const [minimumAi, setMinimumAi] = useState(40)
  const [maximumRisk, setMaximumRisk] = useState(40)
  const [sortMode, setSortMode] = useState<SortMode>('conviction')
  const [preset, setPreset] = useState<Preset>('BALANCED')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => { getMatrix().then(data => setEntries(data.entries)).catch(console.error).finally(() => setLoading(false)) }, [])
  const industries = useMemo(() => ['ALL', ...Array.from(new Set(entries.map(entry => entry.company.industry).filter(Boolean) as string[])).sort()], [entries])
  const countries = useMemo(() => ['ALL', ...Array.from(new Set(entries.map(entry => entry.company.country).filter(Boolean) as string[])).sort()], [entries])
  const candidates = useMemo(() => entries
    .filter(entry => !query || [entry.company.name, entry.company.ticker, entry.company.industry].filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase().trim()))
    .filter(entry => industry === 'ALL' || entry.company.industry === industry)
    .filter(entry => country === 'ALL' || entry.company.country === country)
    .filter(entry => size === 'ALL' || marketCapBand(entry.company.market_cap) === size)
    .filter(entry => dividends === 'ALL' || dividendBand(entry.company.dividend_yield) === dividends)
    .filter(entry => entry.current_esg_score >= minimumEsg && entry.momentum_score >= minimumMomentum && (entry.ai_adoption_score ?? 0) >= minimumAi && (entry.controversy_risk ?? 100) <= maximumRisk)
    .map(entry => {
      const conviction = Math.round(clamp(entry.current_esg_score) * 0.34 + clamp(50 + entry.momentum_score * 1.25) * 0.31 + clamp(entry.ai_adoption_score ?? 0) * 0.15 + clamp(100 - (entry.controversy_risk ?? 100)) * 0.16 + clamp((entry.company.dividend_yield ?? 0) * 20) * 0.04)
      const risk = entry.controversy_risk ?? 100
      const fit = entry.momentum_score >= 20 && risk <= 40 ? 'Trend strength with controlled risk' : entry.current_esg_score >= 70 && risk <= 30 ? 'High-quality, lower-risk profile' : (entry.company.dividend_yield ?? 0) >= 3 ? 'Income profile with quality support' : 'Mixed factor profile'
      return { ...entry, conviction, fit }
    }).sort((left, right) => sortMode === 'esg' ? right.current_esg_score - left.current_esg_score : sortMode === 'momentum' ? right.momentum_score - left.momentum_score : sortMode === 'ai' ? (right.ai_adoption_score ?? 0) - (left.ai_adoption_score ?? 0) : sortMode === 'risk' ? (left.controversy_risk ?? 100) - (right.controversy_risk ?? 100) : right.conviction - left.conviction), [entries, query, industry, country, size, dividends, minimumEsg, minimumMomentum, minimumAi, maximumRisk, sortMode])
  const shortlist = candidates.slice(0, 3)
  const custom = () => setPreset('CUSTOM')
  const applyPreset = (next: Exclude<Preset, 'CUSTOM'>) => {
    setPreset(next); setQuery(''); setCountry('ALL'); setSize('ALL'); setShowAll(false)
    if (next === 'BALANCED') { setDividends('ALL'); setMinimumEsg(65); setMinimumMomentum(5); setMinimumAi(40); setMaximumRisk(40); setSortMode('conviction') }
    if (next === 'MOMENTUM') { setDividends('ALL'); setMinimumEsg(50); setMinimumMomentum(20); setMinimumAi(50); setMaximumRisk(50); setSortMode('momentum') }
    if (next === 'DEFENSIVE') { setDividends('ALL'); setMinimumEsg(70); setMinimumMomentum(-5); setMinimumAi(0); setMaximumRisk(25); setSortMode('risk') }
    if (next === 'INCOME') { setDividends('INCOME'); setMinimumEsg(60); setMinimumMomentum(0); setMinimumAi(0); setMaximumRisk(40); setSortMode('conviction') }
  }
  const reset = () => { setPreset('CUSTOM'); setQuery(''); setIndustry('ALL'); setCountry('ALL'); setSize('ALL'); setDividends('ALL'); setMinimumEsg(0); setMinimumMomentum(-30); setMinimumAi(0); setMaximumRisk(100); setSortMode('conviction'); setShowAll(false) }
  if (loading) return <div className="min-h-[50vh] flex items-center justify-center text-sm text-slate-500">Loading investment universe...</div>

  return <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-6">
    <header className="flex flex-col gap-3 border-b border-slate-200 pb-6 dark:border-slate-800 lg:flex-row lg:items-end lg:justify-between"><div><div className="section-label flex items-center gap-2"><SlidersHorizontal className="h-3.5 w-3.5" /> Investment discovery</div><h1 className="mt-1 text-3xl font-bold text-slate-950 dark:text-slate-100">Stock Screener</h1><p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Find companies where sustainability quality, momentum, AI readiness, income, and controversy risk align with your mandate.</p></div><div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><ShieldCheck className="h-4 w-4 text-emerald-600" />{candidates.length} names pass the screen</div></header>
    <section className="border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5"><div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100"><Sparkles className="h-4 w-4 text-amber-500" />Start with a mandate</div><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">{PRESETS.map(item => <button key={item.id} onClick={() => applyPreset(item.id)} className={clsx('flex items-start gap-3 border p-3 text-left transition-colors', preset === item.id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600')}><span className={clsx('mt-0.5', preset === item.id ? 'text-emerald-600' : 'text-slate-400')}>{item.icon}</span><span><span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{item.label}</span><span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{item.description}</span></span></button>)}</div></section>
    <section className="border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100"><Filter className="h-4 w-4 text-emerald-600" />Screen controls</div><button onClick={reset} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"><RotateCcw className="h-3.5 w-3.5" />Reset</button></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Field label="Search"><div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={query} onChange={event => { setQuery(event.target.value); custom() }} placeholder="Ticker or company" className="input-field w-full pl-9" /></div></Field><Select label="Industry" value={industry} onChange={value => { setIndustry(value); custom() }} options={industries} /><Select label="Country" value={country} onChange={value => { setCountry(value); custom() }} options={countries} /><Select label="Company size" value={size} onChange={value => { setSize(value as MarketCapBand); custom() }} options={['ALL', 'SMALL', 'MID', 'LARGE', 'MEGA']} labels={['Any market cap', 'Small: under $10B', 'Mid: $10B to $50B', 'Large: $50B to $200B', 'Mega: $200B+']} /><Select label="Dividend yield" value={dividends} onChange={value => { setDividends(value as DividendBand); custom() }} options={['ALL', 'NONE', 'INCOME', 'HIGH_INCOME']} labels={['Any profile', 'No dividend', 'Income: under 3%', 'High income: 3%+']} /><Select label="Rank results" value={sortMode} onChange={value => setSortMode(value as SortMode)} options={['conviction', 'esg', 'momentum', 'ai', 'risk']} labels={['Composite conviction', 'ESG quality', 'Momentum', 'AI adoption', 'Lowest controversy risk']} /></div><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Range label={`Minimum ESG score: ${minimumEsg}`} value={minimumEsg} min={0} max={100} onChange={value => { setMinimumEsg(value); custom() }} /><Range label={`Minimum momentum: ${minimumMomentum >= 0 ? '+' : ''}${minimumMomentum}`} value={minimumMomentum} min={-30} max={40} onChange={value => { setMinimumMomentum(value); custom() }} /><Range label={`Minimum AI adoption: ${minimumAi}`} value={minimumAi} min={0} max={100} onChange={value => { setMinimumAi(value); custom() }} /><Range label={`Maximum controversy risk: ${maximumRisk}`} value={maximumRisk} min={0} max={100} onChange={value => { setMaximumRisk(value); custom() }} /></div></section>
    <section><div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Highest-conviction matches</h2><p className="text-xs text-slate-500">Composite: 34% ESG quality, 31% momentum, 15% AI adoption, 16% lower controversy risk, 4% dividend support.</p></div><span className="text-xs text-slate-500">Ranked by {sortMode === 'conviction' ? 'composite conviction' : sortMode}</span></div>{shortlist.length ? <div className="grid gap-3 lg:grid-cols-3">{shortlist.map((entry, index) => <ShortlistCard key={entry.company.id} entry={entry} rank={index + 1} onResearch={() => navigate(`/companies/${entry.company.id}`)} />)}</div> : <EmptyState onReset={reset} />}</section>
    {candidates.length > 3 && <section className="border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100"><BarChart3 className="h-4 w-4 text-emerald-600" />Full ranked universe</div><button onClick={() => setShowAll(current => !current)} className="btn-secondary px-3 py-1.5 text-xs">{showAll ? 'Show top 10' : `Show all ${candidates.length}`}</button></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-950/50"><tr><th className="px-4 py-3">Rank / company</th><th className="px-3 py-3 text-right">Conviction</th><th className="px-3 py-3 text-right">ESG</th><th className="px-3 py-3 text-right">Momentum</th><th className="px-3 py-3 text-right">AI</th><th className="px-3 py-3 text-right">Risk</th><th className="px-4 py-3">Signal</th></tr></thead><tbody>{candidates.slice(0, showAll ? candidates.length : 10).map((entry, index) => <tr key={entry.company.id} className="border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"><td className="px-4 py-3"><button onClick={() => navigate(`/companies/${entry.company.id}`)} className="flex items-center gap-3 text-left"><span className="w-5 text-xs tabular-nums text-slate-400">{index + 1}</span><CompanyLogo ticker={entry.company.ticker} name={entry.company.name} logoUrl={entry.company.logo_url} size="sm" /><span><span className="block font-semibold text-slate-900 dark:text-slate-100">{entry.company.name}</span><span className="block text-xs text-slate-500">{entry.company.ticker ?? 'Private'} · {entry.company.industry ?? 'Unclassified'}</span></span></button></td><td className="px-3 py-3 text-right font-semibold tabular-nums text-emerald-700">{entry.conviction}</td><td className="px-3 py-3 text-right tabular-nums">{display(entry.current_esg_score)}</td><td className={clsx('px-3 py-3 text-right tabular-nums', entry.momentum_score >= 0 ? 'text-sky-600' : 'text-rose-600')}>{entry.momentum_score >= 0 ? '+' : ''}{display(entry.momentum_score)}</td><td className="px-3 py-3 text-right tabular-nums">{display(entry.ai_adoption_score)}</td><td className="px-3 py-3 text-right tabular-nums">{display(entry.controversy_risk)}</td><td className="px-4 py-3"><InvestorSignalBadge signal={entry.investor_signal} /></td></tr>)}</tbody></table></div></section>}
  </div>
}

function ShortlistCard({ entry, rank, onResearch }: { entry: RankedEntry; rank: number; onResearch: () => void }) { const company = entry.company; return <article className="border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className={clsx('flex h-8 w-8 shrink-0 items-center justify-center text-sm font-bold', rank === 1 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}><Medal className="h-4 w-4" /></span><CompanyLogo ticker={company.ticker} name={company.name} logoUrl={company.logo_url} size="md" /><div className="min-w-0"><div className="truncate font-semibold text-slate-950 dark:text-slate-100">{company.name}</div><div className="text-xs text-slate-500">{company.ticker ?? 'Private'} · #{rank}</div></div></div><div className="text-right"><div className="text-[10px] uppercase tracking-wider text-slate-500">Conviction</div><div className="text-xl font-semibold tabular-nums text-emerald-700">{entry.conviction}</div></div></div><p className="mt-4 min-h-10 text-sm text-slate-600 dark:text-slate-300">{entry.fit}</p><div className="mt-4 grid grid-cols-4 divide-x divide-slate-100 border-y border-slate-100 py-3 text-center dark:divide-slate-800 dark:border-slate-800"><Stat label="ESG" value={display(entry.current_esg_score)} tone="text-emerald-600" /><Stat label="Momentum" value={`${entry.momentum_score >= 0 ? '+' : ''}${display(entry.momentum_score)}`} tone={entry.momentum_score >= 0 ? 'text-sky-600' : 'text-rose-600'} /><Stat label="AI" value={display(entry.ai_adoption_score)} tone="text-violet-600" /><Stat label="Risk" value={display(entry.controversy_risk)} tone={(entry.controversy_risk ?? 0) > 50 ? 'text-rose-600' : 'text-slate-700'} /></div><div className="mt-4 flex flex-wrap gap-2"><ClassificationBadge classification={entry.classification} /><InvestorSignalBadge signal={entry.investor_signal} /></div><div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800"><div className="flex justify-between gap-2 text-xs text-slate-500"><span className="truncate">{company.industry ?? 'Unclassified'}</span><span className="shrink-0">{company.market_cap ?? 'Size unavailable'}</span></div><button onClick={onResearch} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">Open company research <TrendingUp className="h-3.5 w-3.5" /></button></div></article> }
function EmptyState({ onReset }: { onReset: () => void }) { return <div className="border border-dashed border-slate-300 px-6 py-16 text-center dark:border-slate-700"><TrendingDown className="mx-auto h-6 w-6 text-slate-400" /><h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">No companies match this mandate</h3><p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Relax one of the quality gates or reset the screen to review the available universe.</p><button onClick={onReset} className="btn-secondary mt-4"><RotateCcw className="h-4 w-4" />Reset screen</button></div> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-medium text-slate-600 dark:text-slate-300"><span className="mb-1.5 block">{label}</span>{children}</label> }
function Select({ label, value, options, labels, onChange }: { label: string; value: string; options: string[]; labels?: string[]; onChange: (value: string) => void }) { return <Field label={label}><select value={value} onChange={event => onChange(event.target.value)} className="input-field w-full">{options.map((option, index) => <option key={option} value={option}>{labels?.[index] ?? option}</option>)}</select></Field> }
function Range({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) { return <label className="block text-xs font-medium text-slate-600 dark:text-slate-300"><span className="mb-2 block">{label}</span><input type="range" value={value} min={min} max={max} onChange={event => onChange(Number(event.target.value))} className="w-full accent-emerald-600" /></label> }
function Stat({ label, value, tone }: { label: string; value: string; tone: string }) { return <div><div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div><div className={clsx('mt-1 text-sm font-semibold tabular-nums', tone)}>{value}</div></div> }