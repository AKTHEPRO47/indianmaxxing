import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Bot, BrainCircuit, CandlestickChart, ChevronRight, CircleAlert, Cpu, Gauge, Radar, ShieldAlert, Sparkles, Target, TrendingDown, TrendingUp, Waves } from 'lucide-react'
import { askLiveCopilot, getLiveCompanyQuantAnalytics, getLiveMatrix, scanLiveTechnicalAnalysis } from '../api/client'
import CompanyLogo from '../components/CompanyLogo'
import { ClassificationBadge, InvestorSignalBadge } from '../components/InvestorSignalBadge'
import type { Company, CompanyQuantAnalytics, TechnicalScanResult } from '../types'
import { clsx } from 'clsx'

type DeskState = {
  company: Company
  technical: TechnicalScanResult
  quant: CompanyQuantAnalytics
  brief: string
}

function formatNumber(value: number | null | undefined, digits = 1) {
  return value == null || Number.isNaN(value) ? '---' : value.toFixed(digits)
}

function factorScore(company: Company | null | undefined, technical: TechnicalScanResult | null, quant: CompanyQuantAnalytics | null) {
  if (!company || !quant) return 0
  const score = company.latest_score
  const indicators = technical?.indicators
  if (!score) return 0
  const trend = indicators?.sma20 != null && indicators?.sma50 != null ? (indicators.sma20 > indicators.sma50 ? 15 : -15) : 0
  const rsi = indicators?.rsi14 == null ? 0 : indicators.rsi14 >= 45 && indicators.rsi14 <= 70 ? 8 : indicators.rsi14 > 75 ? -8 : 2
  return Math.round(Math.max(0, Math.min(100, 50 + score.momentum_score * 1.2 + (70 - score.controversy_risk) * 0.25 + (quant.signal_quality_score - 50) * 0.35 + trend + rsi)))
}

export default function AITradeDeskPage() {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<Company[]>([])
  const [companyId, setCompanyId] = useState<number | null>(null)
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [running, setRunning] = useState(false)
  const [desk, setDesk] = useState<DeskState | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getLiveMatrix()
      .then(data => {
        const available = data.entries.map(entry => ({
          ...entry.company,
          latest_score: entry.company.latest_score ?? {
            id: 0,
            company_id: entry.company.id,
            current_esg_score: entry.current_esg_score,
            momentum_score: entry.momentum_score,
            ai_adoption_score: entry.ai_adoption_score ?? 0,
            controversy_risk: entry.controversy_risk ?? 0,
            confidence_score: 0.8,
            environmental_score: null,
            social_score: null,
            governance_score: null,
            classification: entry.classification,
            investor_signal: entry.investor_signal,
            created_at: null,
          },
        }))
        setCompanies(available)
        setCompanyId(available[0]?.id ?? null)
      })
      .catch(() => setError('Live research data is unavailable. Connect the production API and try again.'))
      .finally(() => setLoadingCompanies(false))
  }, [])

  const selected = useMemo(() => companies.find(company => company.id === companyId) ?? null, [companies, companyId])

  const runDesk = async () => {
    if (!selected) return
    setRunning(true)
    setError(null)
    try {
      const [technical, quant] = await Promise.all([
        scanLiveTechnicalAnalysis(selected.id),
        getLiveCompanyQuantAnalytics(selected.id),
      ])
      const brief = await askLiveCopilot(selected.id, [
        'Write a concise institutional trade brief using the stored ESG signals and current score context.',
        'Use exactly these labeled sections: Thesis, Catalysts, Risks, Invalidation, and Tactical Setup.',
        'Do not invent price targets or data. Distinguish facts from interpretation.',
      ].join(' '))
      setDesk({ company: selected, technical, quant, brief: brief.answer })
    } catch {
      setDesk(null)
      setError('Live AI research is unavailable. No static or mock thesis has been shown. Check the API, market-data access, and OpenAI configuration.')
    } finally {
      setRunning(false)
    }
  }

  const conviction = factorScore(desk?.company ?? selected ?? companies[0], desk?.technical ?? null, desk?.quant ?? null)
  const indicators = desk?.technical.indicators
  const score = desk?.company.latest_score ?? selected?.latest_score
  const trendUp = indicators?.sma20 != null && indicators?.sma50 != null && indicators.sma20 > indicators.sma50
  const rsiRisk = indicators?.rsi14 != null && (indicators.rsi14 > 70 || indicators.rsi14 < 30)

  if (loadingCompanies) return <div className="min-h-[50vh] flex items-center justify-center text-sm text-slate-500">Loading research universe...</div>

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="grid gap-5 border-b border-slate-200 pb-6 dark:border-slate-800 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="section-label flex items-center gap-2"><BrainCircuit className="h-3.5 w-3.5" /> Research command center</div>
          <h1 className="mt-1 text-3xl font-bold text-slate-950 dark:text-slate-100">AI Trade Desk</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">A single research pass combines live technical triggers, ESG momentum, controversy pressure, and an AI-generated institutional brief.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500"><span className="live-dot h-2 w-2 rounded-full bg-emerald-500" />Live market data when available</div>
      </header>

      {error && <div role="alert" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}

      <section className="grid gap-3 border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[1fr_auto] md:items-end">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300"><span className="mb-1.5 block">Research target</span><select value={companyId ?? ''} onChange={event => { setCompanyId(Number(event.target.value)); setDesk(null) }} className="input-field w-full">{companies.map(company => <option key={company.id} value={company.id}>{company.ticker ?? 'Private'} · {company.name}</option>)}</select></label>
        <button onClick={() => void runDesk()} disabled={!selected || running} className="btn-primary h-11 justify-center gap-2 disabled:opacity-60"><Sparkles className="h-4 w-4" />{running ? 'Building research brief...' : 'Generate AI Thesis'}</button>
      </section>

      {!desk ? <EmptyDesk /> : <>
        <section className="grid gap-px overflow-hidden border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Conviction" value={`${conviction}/100`} icon={<Target className="h-4 w-4" />} tone={conviction >= 65 ? 'text-emerald-600' : conviction >= 45 ? 'text-amber-600' : 'text-rose-600'} />
          <Metric label="Technical regime" value={trendUp ? 'Constructive' : 'Defensive'} icon={trendUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />} tone={trendUp ? 'text-emerald-600' : 'text-rose-600'} />
          <Metric label="RSI (14)" value={formatNumber(indicators?.rsi14)} icon={<Gauge className="h-4 w-4" />} tone={rsiRisk ? 'text-amber-600' : 'text-sky-600'} />
          <Metric label="Signal quality" value={`${formatNumber(desk.quant.signal_quality_score, 0)}/100`} icon={<Radar className="h-4 w-4" />} tone="text-violet-600" />
          <Metric label="Controversy risk" value={`${formatNumber(score?.controversy_risk, 0)}/100`} icon={<ShieldAlert className="h-4 w-4" />} tone={(score?.controversy_risk ?? 0) >= 60 ? 'text-rose-600' : 'text-slate-700'} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><CompanyLogo ticker={desk.company.ticker} name={desk.company.name} logoUrl={desk.company.logo_url} size="lg" /><div className="min-w-0"><h2 className="truncate text-lg font-semibold text-slate-950 dark:text-slate-100">{desk.company.name}</h2><p className="text-xs text-slate-500">{desk.company.ticker} · {desk.company.industry ?? 'Unclassified'} · {desk.company.exchange ?? 'Unlisted'}</p></div></div><button onClick={() => navigate(`/companies/${desk.company.id}`)} className="icon-button shrink-0" aria-label={`Open ${desk.company.name}`} title="Open company analysis"><ChevronRight className="h-4 w-4" /></button></div>
            <div className="mt-5 grid grid-cols-2 gap-px border border-slate-100 bg-slate-100 dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-4"><Factor label="ESG score" value={formatNumber(score?.current_esg_score)} /><Factor label="Momentum" value={`${(score?.momentum_score ?? 0) >= 0 ? '+' : ''}${formatNumber(score?.momentum_score)}`} /><Factor label="AI adoption" value={formatNumber(score?.ai_adoption_score)} /><Factor label="Risk adj. mom." value={formatNumber(desk.quant.risk_adjusted_momentum)} /></div>
            <div className="mt-5 flex flex-wrap gap-2">{score && <ClassificationBadge classification={score.classification} />}{score && <InvestorSignalBadge signal={score.investor_signal} />}{desk.technical.created_signals.length > 0 ? desk.technical.created_signals.map(signal => <span key={signal.id} className="badge-green">New: {signal.title}</span>) : <span className="badge-slate">No new technical trigger</span>}</div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2"><Indicator label="Last price" value={formatNumber(indicators?.last_price, 2)} icon={<CandlestickChart className="h-4 w-4" />} /><Indicator label="SMA 20 / 50" value={`${formatNumber(indicators?.sma20, 2)} / ${formatNumber(indicators?.sma50, 2)}`} icon={<Activity className="h-4 w-4" />} /><Indicator label="MACD / signal" value={`${formatNumber(indicators?.macd, 2)} / ${formatNumber(indicators?.macd_signal, 2)}`} icon={<Waves className="h-4 w-4" />} /><Indicator label="Volume ratio" value={indicators?.latest_volume != null && indicators.average_volume20 ? `${(indicators.latest_volume / indicators.average_volume20).toFixed(2)}x` : '---'} icon={<Cpu className="h-4 w-4" />} /></div>
          </div>

          <div className="border border-slate-900 bg-slate-950 p-5 text-slate-100 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300"><Bot className="h-4 w-4" /> AI investment brief</div>
            <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-200">{desk.brief}</div>
            <div className="mt-5 flex items-center gap-2 border-t border-slate-800 pt-4 text-xs text-slate-400"><CircleAlert className="h-4 w-4 text-amber-400" />Decision support only. Validate against your mandate and risk limits.</div>
          </div>
        </section>
      </>}
    </div>
  )
}

function EmptyDesk() {
  return <section className="grid min-h-80 place-items-center border border-dashed border-slate-300 bg-white px-6 text-center dark:border-slate-700 dark:bg-slate-900"><div><div className="mx-auto flex h-12 w-12 items-center justify-center bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><BrainCircuit className="h-6 w-6" /></div><h2 className="mt-4 text-lg font-semibold text-slate-950 dark:text-slate-100">One command. Full research pass.</h2><p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">Select a company and generate a thesis to merge technical events with the platform&apos;s ESG and risk signals.</p></div></section>
}

function Metric({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: string }) {
  return <div className="bg-white p-4 dark:bg-slate-900"><div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">{icon}{label}</div><div className={clsx('mt-2 text-xl font-semibold tabular-nums', tone)}>{value}</div></div>
}

function Factor({ label, value }: { label: string; value: string }) {
  return <div className="bg-white px-3 py-3 dark:bg-slate-900"><div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div><div className="mt-1 text-sm font-semibold tabular-nums text-slate-950 dark:text-slate-100">{value}</div></div>
}

function Indicator({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="flex items-center gap-3 border border-slate-200 p-3 dark:border-slate-800"><span className="text-emerald-600">{icon}</span><div><div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div><div className="mt-0.5 text-sm font-semibold tabular-nums text-slate-950 dark:text-slate-100">{value}</div></div></div>
}