import { useMemo, type ReactNode } from 'react'
import { Bot, Sparkles, ShieldAlert, Newspaper, Activity, Target, BrainCircuit } from 'lucide-react'
import type { Company, ScoreSnapshot, Signal, StockData } from '../types'
import { clsx } from 'clsx'
import { fmt0 } from '../utils/helpers'
import BacktestSimulator from './BacktestSimulator'

interface Props {
  company: Company
  latest: ScoreSnapshot | null
  previousScore: ScoreSnapshot | null
  signals: Signal[]
  stockData: StockData | null
  onOpenCopilot: () => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value)
}

export default function AILabPanel({ company, latest, previousScore, signals, stockData, onOpenCopilot }: Props) {
  const latestPrice = stockData?.quote.last_price ?? null
  const signalNames = useMemo(() => signals.slice(0, 3).map(signal => signal.title), [signals])
  const scoreDelta = latest && previousScore ? latest.current_esg_score - previousScore.current_esg_score : null
  const momentumDelta = latest && previousScore ? latest.momentum_score - previousScore.momentum_score : null
  const aiDelta = latest && previousScore ? latest.ai_adoption_score - previousScore.ai_adoption_score : null
  const riskDelta = latest && previousScore ? latest.controversy_risk - previousScore.controversy_risk : null

  const thesisSpark = latest
    ? `${company.name} is ${latest.classification.toLowerCase()} territory with ${latest.investor_signal.toLowerCase()} behavior, ${latest.ai_adoption_score >= 70 ? 'strong' : 'still-building'} AI adoption, and ${scoreDelta !== null ? `${scoreDelta >= 0 ? '+' : ''}${fmt0(scoreDelta)} ESG drift versus the prior snapshot` : 'no prior score drift to compare'}.`
    : `No live score yet for ${company.name}.`

  const signalTranslator = latest
    ? `${latest.investor_signal === 'Buy / Watchlist' ? 'Accumulation phase' : latest.investor_signal === 'Hold' ? 'Observation only' : latest.investor_signal === 'Avoid' ? 'Avoid new exposure' : 'Risk intervention required'} with ${momentumDelta !== null ? `${momentumDelta >= 0 ? '+' : ''}${fmt0(momentumDelta)} momentum shift` : 'no momentum delta available'}.`
    : 'Signal translation unavailable until a score exists.'

  const catalystWatch = signalNames.length > 0
    ? `${signalNames.join(' · ')}${aiDelta !== null ? ` · AI change ${aiDelta >= 0 ? '+' : ''}${fmt0(aiDelta)}` : ''}`
    : 'No recent catalysts captured yet.'

  const riskRadar = latest
    ? `${latest.controversy_risk > 75 ? 'High alert' : latest.controversy_risk > 40 ? 'Monitor' : 'Contained'} risk with ${fmt0(latest.controversy_risk)}/100 controversy pressure${riskDelta !== null ? ` and ${riskDelta >= 0 ? '+' : ''}${fmt0(riskDelta)} change vs prior score` : ''}.`
    : 'Risk radar unavailable.'

  const scenarioLens = latestPrice
    ? {
      bear: latestPrice * (1 - clamp((latest?.controversy_risk ?? 40) / 260, 0.03, 0.3)),
      base: latestPrice,
      bull: latestPrice * (1 + clamp(((latest?.momentum_score ?? 0) + 18) / 220, 0.05, 0.45)),
    }
    : null

  return (
    <div className="space-y-5">
      <div className="card p-5 border-l-4 border-l-violet-500 overflow-hidden relative">
        <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="section-label mb-1">AI Lab</div>
            <h2 className="text-xl font-bold text-slate-900">Seven tools, one research cockpit</h2>
            <p className="text-sm text-slate-500 max-w-2xl mt-1">Four small diagnostic tools, two medium workhorses, and the industry-standard Copilot for evidence-backed Q&A.</p>
          </div>
          <button onClick={onOpenCopilot} className="btn-primary text-xs">
            <Bot className="h-4 w-4" />Open Copilot
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MiniFeature
          icon={<Sparkles className="h-4 w-4" />}
          title="Thesis Spark"
          tone="violet"
          content={thesisSpark}
        />
        <MiniFeature
          icon={<BrainCircuit className="h-4 w-4" />}
          title="Signal Translator"
          tone="blue"
          content={signalTranslator}
        />
        <MiniFeature
          icon={<Newspaper className="h-4 w-4" />}
          title="Catalyst Watch"
          tone="emerald"
          content={catalystWatch}
        />
        <MiniFeature
          icon={<ShieldAlert className="h-4 w-4" />}
          title="Risk Radar"
          tone="rose"
          content={riskRadar}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="section-label mb-1">Medium tool</div>
              <h3 className="font-semibold text-slate-900">Scenario Lens</h3>
            </div>
            <Target className="h-4 w-4 text-amber-600" />
          </div>
          {scenarioLens ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
                <div className="text-[10px] uppercase tracking-wider text-rose-500">Bear</div>
                <div className="mt-1 text-lg font-bold text-rose-700">{formatMoney(scenarioLens.bear)}</div>
                <div className="text-xs text-rose-600">Risk-heavy compression case</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Base</div>
                <div className="mt-1 text-lg font-bold text-slate-900">{formatMoney(scenarioLens.base)}</div>
                <div className="text-xs text-slate-500">Current live price anchor</div>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="text-[10px] uppercase tracking-wider text-emerald-600">Bull</div>
                <div className="mt-1 text-lg font-bold text-emerald-700">{formatMoney(scenarioLens.bull)}</div>
                <div className="text-xs text-emerald-600">Momentum and AI tailwind case</div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Live market data is required to generate scenario bands.</div>
          )}
        </div>

        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="section-label mb-1">Medium tool</div>
              <h3 className="font-semibold text-slate-900">Backtest Simulator</h3>
            </div>
            <Activity className="h-4 w-4 text-blue-600" />
          </div>
          <BacktestSimulator
            history={stockData?.history ?? []}
            companyName={company.name}
            ticker={company.ticker}
          />
        </div>
      </div>

      <div className="card p-5 border-l-4 border-l-slate-900 bg-slate-950 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="section-label mb-1 text-slate-300">Industry standard</div>
            <h3 className="font-semibold">Evidence-backed Copilot</h3>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">Ask natural-language questions and get cited answers from reports, extracted evidence, and news signals.</p>
          </div>
          <button onClick={onOpenCopilot} className="btn-secondary text-xs bg-white text-slate-900 hover:bg-slate-100">
            <Bot className="h-4 w-4" />Open Copilot
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            'What changed since last quarter?',
            'Show AI adoption evidence.',
            'What are the main controversy risks?',
          ].map(prompt => (
            <button key={prompt} onClick={onOpenCopilot} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/90 transition hover:bg-white/10">
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function MiniFeature({ icon, title, tone, content }: { icon: ReactNode; title: string; tone: 'violet' | 'blue' | 'emerald' | 'rose'; content: string }) {
  const toneClasses: Record<'violet' | 'blue' | 'emerald' | 'rose', string> = {
    violet: 'from-violet-50 to-fuchsia-50 border-violet-200 text-violet-700',
    blue: 'from-blue-50 to-cyan-50 border-blue-200 text-blue-700',
    emerald: 'from-emerald-50 to-teal-50 border-emerald-200 text-emerald-700',
    rose: 'from-rose-50 to-orange-50 border-rose-200 text-rose-700',
  }

  return (
    <div className={clsx('rounded-2xl border bg-gradient-to-br p-4 shadow-sm', toneClasses[tone])}>
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 text-slate-900 shadow-sm">{icon}</span>
        {title}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{content}</p>
    </div>
  )
}