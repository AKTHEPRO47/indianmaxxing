import { Activity, ShieldAlert, Sigma, TrendingUp, Zap } from 'lucide-react'
import type { CompanyQuantAnalytics } from '../types'
import MetricCard from './MetricCard'
import { fmt1 } from '../utils/helpers'

interface QuantAnalyticsPanelProps {
  analytics: CompanyQuantAnalytics | null
}

const regimeTone = (regime: string): 'green' | 'amber' | 'red' | 'blue' | 'default' => {
  if (regime === 'Compounding Upside') return 'green'
  if (regime === 'De-Rating Risk') return 'red'
  if (regime === 'Range-Bound') return 'amber'
  if (regime === 'Transition') return 'blue'
  return 'default'
}

export default function QuantAnalyticsPanel({ analytics }: QuantAnalyticsPanelProps) {
  if (!analytics) {
    return (
      <div className="card p-5">
        <h2 className="font-semibold text-slate-900 text-sm">Quant Analytics</h2>
        <p className="text-xs text-slate-400 mt-1">No quantitative analytics available yet.</p>
      </div>
    )
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900 text-sm">Investor Quant Analytics</h2>
          <p className="text-xs text-slate-400">
            Risk-adjusted diagnostics built from score trajectory, signal quality, and evidence depth.
          </p>
        </div>
        <span className="text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-600">
          Lookback: {analytics.lookback_points} points
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <MetricCard
          label="Risk-Adjusted Momentum"
          value={fmt1(analytics.risk_adjusted_momentum)}
          color={analytics.risk_adjusted_momentum >= 0 ? 'green' : 'red'}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <MetricCard
          label="Momentum Acceleration"
          value={fmt1(analytics.momentum_acceleration)}
          color={analytics.momentum_acceleration >= 0 ? 'blue' : 'amber'}
          icon={<Zap className="w-4 h-4" />}
        />
        <MetricCard
          label="ESG Trend Slope"
          value={fmt1(analytics.esg_trend_slope)}
          color={analytics.esg_trend_slope >= 0 ? 'green' : 'red'}
          icon={<Sigma className="w-4 h-4" />}
        />
        <MetricCard
          label="Max ESG Drawdown"
          value={`${fmt1(analytics.max_esg_drawdown_pct)}%`}
          color={analytics.max_esg_drawdown_pct <= 8 ? 'green' : analytics.max_esg_drawdown_pct <= 15 ? 'amber' : 'red'}
          icon={<ShieldAlert className="w-4 h-4" />}
          bar={Math.min(100, analytics.max_esg_drawdown_pct)}
        />
        <MetricCard
          label="Signal Quality"
          value={`${fmt1(analytics.signal_quality_score)}`}
          sub={`Positive ratio ${fmt1(analytics.positive_signal_ratio)}%`}
          color={analytics.signal_quality_score >= 60 ? 'green' : analytics.signal_quality_score >= 45 ? 'amber' : 'red'}
          icon={<Activity className="w-4 h-4" />}
          bar={analytics.signal_quality_score}
        />
        <MetricCard
          label="Evidence Coverage"
          value={`${fmt1(analytics.evidence_coverage_ratio)}%`}
          sub={analytics.data_freshness_days === null ? 'Freshness unknown' : `${analytics.data_freshness_days} days since latest snapshot`}
          color={analytics.evidence_coverage_ratio >= 65 ? 'blue' : 'amber'}
          bar={analytics.evidence_coverage_ratio}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500 uppercase tracking-wider">Current regime</span>
        <span className={`text-xs font-semibold ${
          regimeTone(analytics.regime) === 'green' ? 'text-emerald-700' :
          regimeTone(analytics.regime) === 'red' ? 'text-red-700' :
          regimeTone(analytics.regime) === 'amber' ? 'text-amber-700' :
          regimeTone(analytics.regime) === 'blue' ? 'text-blue-700' :
          'text-slate-700'
        }`}>
          {analytics.regime}
        </span>
      </div>
    </div>
  )
}
