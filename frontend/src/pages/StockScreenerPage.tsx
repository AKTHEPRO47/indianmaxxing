import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Filter, Medal, ShieldCheck, SlidersHorizontal, TrendingUp } from 'lucide-react'
import { getMatrix } from '../api/client'
import CompanyLogo from '../components/CompanyLogo'
import type { MatrixEntry } from '../types'
import { clsx } from 'clsx'

type MarketCapBand = 'ALL' | 'SMALL' | 'MID' | 'LARGE' | 'MEGA'
type DividendBand = 'ALL' | 'NONE' | 'INCOME' | 'HIGH_INCOME'

function marketCapInBillions(value?: string | null) {
  const match = value?.replace(/[$,\s]/g, '').toUpperCase().match(/^([0-9]*\.?[0-9]+)([TBMK])?$/)
  if (!match) return null
  const amount = Number(match[1])
  const multiplier = match[2] === 'T' ? 1_000 : match[2] === 'M' ? 0.001 : match[2] === 'K' ? 0.000001 : 1
  return amount * multiplier
}

function marketCapBand(value?: string | null): Exclude<MarketCapBand, 'ALL'> | 'UNKNOWN' {
  const billions = marketCapInBillions(value)
  if (billions === null) return 'UNKNOWN'
  if (billions < 10) return 'SMALL'
  if (billions < 50) return 'MID'
  if (billions < 200) return 'LARGE'
  return 'MEGA'
}

function dividendBand(value?: number | null): Exclude<DividendBand, 'ALL'> {
  if (!value || value <= 0) return 'NONE'
  if (value < 3) return 'INCOME'
  return 'HIGH_INCOME'
}

export default function StockScreenerPage() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<MatrixEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [industry, setIndustry] = useState('ALL')
  const [size, setSize] = useState<MarketCapBand>('ALL')
  const [dividends, setDividends] = useState<DividendBand>('ALL')
  const [minimumEsg, setMinimumEsg] = useState(55)
  const [minimumMomentum, setMinimumMomentum] = useState(0)
  const [maximumRisk, setMaximumRisk] = useState(50)

  useEffect(() => {
    getMatrix()
      .then(data => setEntries(data.entries))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const industries = useMemo(() => ['ALL', ...Array.from(new Set(entries.map(entry => entry.company.industry).filter(Boolean) as string[])).sort()], [entries])
  const candidates = useMemo(() => entries
    .filter(entry => industry === 'ALL' || entry.company.industry === industry)
    .filter(entry => size === 'ALL' || marketCapBand(entry.company.market_cap) === size)
    .filter(entry => dividends === 'ALL' || dividendBand(entry.company.dividend_yield) === dividends)
    .filter(entry => entry.current_esg_score >= minimumEsg)
    .filter(entry => entry.momentum_score >= minimumMomentum)
    .filter(entry => (entry.controversy_risk ?? 100) <= maximumRisk)
    .map(entry => ({ ...entry, screenerScore: entry.current_esg_score * 0.5 + entry.momentum_score * 1.5 + (entry.ai_adoption_score ?? 0) * 0.15 - (entry.controversy_risk ?? 100) * 0.55 }))
    .sort((left, right) => right.screenerScore - left.screenerScore), [entries, industry, size, dividends, minimumEsg, minimumMomentum, maximumRisk])

  const shortlist = candidates.slice(0, 3)
  const resetFilters = () => {
    setIndustry('ALL')
    setSize('ALL')
    setDividends('ALL')
    setMinimumEsg(55)
    setMinimumMomentum(0)
    setMaximumRisk(50)
  }

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center text-sm text-slate-500">Loading screener data...</div>

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-6 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="section-label flex items-center gap-2"><SlidersHorizontal className="h-3.5 w-3.5" /> Stock discovery</div>
          <h1 className="mt-1 text-3xl font-bold text-slate-950 dark:text-slate-100">Top 3 Stock Screener</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Match company size, dividends, and sustainability signals to discover the strongest names in an industry.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><ShieldCheck className="h-4 w-4 text-emerald-600" />{candidates.length} qualifying companies</div>
      </header>

      <section className="border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100"><Filter className="h-4 w-4 text-emerald-600" />Screen criteria</div>
          <button onClick={resetFilters} className="text-xs font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">Reset</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Industry"><select value={industry} onChange={event => setIndustry(event.target.value)} className="input-field w-full"><option value="ALL">All industries</option>{industries.slice(1).map(value => <option key={value} value={value}>{value}</option>)}</select></Field>
          <Field label="Company size"><select value={size} onChange={event => setSize(event.target.value as MarketCapBand)} className="input-field w-full"><option value="ALL">Any market cap</option><option value="SMALL">Small: under $10B</option><option value="MID">Mid: $10B to $50B</option><option value="LARGE">Large: $50B to $200B</option><option value="MEGA">Mega: $200B+</option></select></Field>
          <Field label="Dividend yield"><select value={dividends} onChange={event => setDividends(event.target.value as DividendBand)} className="input-field w-full"><option value="ALL">Any dividend profile</option><option value="NONE">No dividend</option><option value="INCOME">Income: under 3%</option><option value="HIGH_INCOME">High income: 3%+</option></select></Field>
          <RangeField label={`Minimum ESG: ${minimumEsg}`} value={minimumEsg} min={0} max={100} onChange={setMinimumEsg} />
          <RangeField label={`Minimum momentum: ${minimumMomentum >= 0 ? '+' : ''}${minimumMomentum}`} value={minimumMomentum} min={-30} max={40} onChange={setMinimumMomentum} />
          <RangeField label={`Maximum controversy risk: ${maximumRisk}`} value={maximumRisk} min={0} max={100} onChange={setMaximumRisk} />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Your top three</h2><span className="text-xs text-slate-500">Ranked by ESG quality, momentum, AI adoption, and risk</span></div>
        {shortlist.length ? <div className="grid gap-3 lg:grid-cols-3">{shortlist.map((entry, index) => {
          const company = entry.company
          return <article key={company.id} className="border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3 min-w-0"><span className={clsx('flex h-8 w-8 shrink-0 items-center justify-center text-sm font-bold', index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}><Medal className="h-4 w-4" /></span><CompanyLogo ticker={company.ticker} name={company.name} logoUrl={company.logo_url} size="md" /><div className="min-w-0"><div className="truncate font-semibold text-slate-950 dark:text-slate-100">{company.name}</div><div className="text-xs text-slate-500">{company.ticker ?? 'Private'} · #{index + 1}</div></div></div><div className="text-right"><div className="text-xs text-slate-500">Screen score</div><div className="font-semibold text-emerald-700">{entry.screenerScore.toFixed(1)}</div></div></div>
            <div className="mt-5 grid grid-cols-3 divide-x divide-slate-100 border-y border-slate-100 py-3 text-center dark:divide-slate-800 dark:border-slate-800"><Stat label="ESG" value={entry.current_esg_score.toFixed(0)} tone="text-emerald-600" /><Stat label="Momentum" value={`${entry.momentum_score >= 0 ? '+' : ''}${entry.momentum_score.toFixed(0)}`} tone={entry.momentum_score >= 0 ? 'text-sky-600' : 'text-rose-600'} /><Stat label="Risk" value={entry.controversy_risk?.toFixed(0) ?? '---'} tone={(entry.controversy_risk ?? 0) > 50 ? 'text-amber-600' : 'text-slate-700'} /></div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span className="truncate pr-3">{company.industry ?? 'Unclassified'} · {company.market_cap ?? 'Size unavailable'}</span><button onClick={() => navigate(`/companies/${company.id}`)} className="inline-flex shrink-0 items-center gap-1 font-semibold text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">Research <TrendingUp className="h-3.5 w-3.5" /></button></div>
          </article>
        })}</div> : <div className="border border-dashed border-slate-300 px-6 py-16 text-center text-sm text-slate-500 dark:border-slate-700">No companies match this screen. Broaden a criterion to see a ranked shortlist.</div>}
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-slate-600 dark:text-slate-300"><span className="mb-1.5 block">{label}</span>{children}</label>
}

function RangeField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <label className="block text-xs font-medium text-slate-600 dark:text-slate-300"><span className="mb-2 block">{label}</span><input type="range" value={value} min={min} max={max} onChange={event => onChange(Number(event.target.value))} className="w-full accent-emerald-600" /></label>
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div><div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div><div className={clsx('mt-1 text-sm font-semibold tabular-nums', tone)}>{value}</div></div>
}