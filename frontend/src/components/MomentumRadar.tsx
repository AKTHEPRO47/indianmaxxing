import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import type { ScoreSnapshot } from '../types'
import { clsx } from 'clsx'

interface Props {
  latest: ScoreSnapshot | null
  previous?: ScoreSnapshot | null
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const item = payload[0]?.payload
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-xs min-w-36">
      <div className="font-semibold text-slate-700 mb-1">{item?.metric}</div>
      <div className="text-slate-900 font-bold">{item?.value?.toFixed(1) ?? '—'}</div>
      {item?.delta != null && (
        <div className={clsx('mt-0.5', item.delta >= 0 ? 'text-emerald-600' : 'text-red-500')}>
          {item.delta > 0 ? '+' : ''}{item.delta.toFixed(1)} vs prior
        </div>
      )}
    </div>
  )
}

export default function MomentumRadar({ latest, previous }: Props) {
  if (!latest) {
    return (
      <div className="card p-5 flex items-center justify-center h-48">
        <p className="text-sm text-slate-400">No score data available</p>
      </div>
    )
  }

  const metrics = [
    { metric: 'ESG Score',   key: 'current_esg_score' as const,   max: 100, color: '#10b981' },
    { metric: 'Momentum',    key: 'momentum_score' as const,       max: 100, color: '#6366f1' },
    { metric: 'AI Adoption', key: 'ai_adoption_score' as const,    max: 100, color: '#0ea5e9' },
    { metric: 'Governance',  key: 'governance_score' as const,     max: 100, color: '#8b5cf6' },
    { metric: 'Social',      key: 'social_score' as const,         max: 100, color: '#ec4899' },
    { metric: 'Low Risk',    key: 'controversy_risk' as const,     max: 100, color: '#f97316', invert: true },
  ] as const

  const data = metrics.map(m => {
    const raw = latest[m.key] as number | null
    const value = raw == null ? 0 : ('invert' in m && m.invert ? 100 - raw : raw)
    const prevRaw = previous ? (previous[m.key] as number | null) : null
    const prevValue = prevRaw == null ? null : ('invert' in m && m.invert ? 100 - prevRaw : prevRaw)
    const delta = prevValue != null ? value - prevValue : null
    return { metric: m.metric, value, delta }
  })

  const avgScore = data.reduce((sum, d) => sum + d.value, 0) / data.length

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="section-label mb-1">Multi-dimensional</div>
          <h2 className="font-semibold text-slate-900 text-sm">Momentum radar</h2>
          <p className="text-xs text-slate-400">6-axis normalized score overview</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-slate-900">{avgScore.toFixed(0)}</div>
          <div className="text-[10px] text-slate-400">Avg score</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data} margin={{ top: 4, right: 20, bottom: 4, left: 20 }}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#64748b' }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Radar
            dataKey="value"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.18}
            strokeWidth={2}
            dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
          />
        </RadarChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-3 gap-2 mt-2">
        {data.map(d => (
          <div key={d.metric} className="rounded-lg bg-slate-50 border border-slate-200 px-2 py-1.5 text-center">
            <div className="text-xs font-bold text-slate-900">{d.value.toFixed(0)}</div>
            <div className="text-[10px] text-slate-400 truncate">{d.metric}</div>
            {d.delta != null && (
              <div className={clsx('text-[10px] font-semibold', d.delta >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                {d.delta > 0 ? '+' : ''}{d.delta.toFixed(1)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
