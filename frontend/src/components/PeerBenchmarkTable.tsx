import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'
import type { Company } from '../types'
import { esgScoreColor, fmt0 } from '../utils/helpers'
import { clsx } from 'clsx'

interface Props {
  companies: Company[]
  highlight?: number // company id to highlight
}

export default function PeerBenchmarkTable({ companies, highlight }: Props) {
  const withScores = companies.filter(c => c.latest_score)

  const radarData = [
    { metric: 'ESG', ...Object.fromEntries(withScores.map(c => [c.ticker ?? c.name.slice(0, 4), c.latest_score!.current_esg_score])) },
    { metric: 'Momentum', ...Object.fromEntries(withScores.map(c => [c.ticker ?? c.name.slice(0, 4), Math.max(0, c.latest_score!.momentum_score + 100) / 2])) },
    { metric: 'AI', ...Object.fromEntries(withScores.map(c => [c.ticker ?? c.name.slice(0, 4), c.latest_score!.ai_adoption_score])) },
    { metric: 'Environmental', ...Object.fromEntries(withScores.map(c => [c.ticker ?? c.name.slice(0, 4), c.latest_score!.environmental_score ?? 50])) },
    { metric: 'Social', ...Object.fromEntries(withScores.map(c => [c.ticker ?? c.name.slice(0, 4), c.latest_score!.social_score ?? 50])) },
    { metric: 'Governance', ...Object.fromEntries(withScores.map(c => [c.ticker ?? c.name.slice(0, 4), c.latest_score!.governance_score ?? 50])) },
  ]

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <div className="space-y-6">
      {/* Radar chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
            <PolarGrid stroke="#f1f5f9" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip
              contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
              itemStyle={{ padding: '1px 0' }}
            />
            {withScores.map((c, i) => (
              <Radar
                key={c.id}
                name={c.ticker ?? c.name.slice(0, 6)}
                dataKey={c.ticker ?? c.name.slice(0, 4)}
                stroke={COLORS[i % COLORS.length]}
                fill={COLORS[i % COLORS.length]}
                fillOpacity={c.id === highlight ? 0.2 : 0.05}
                strokeWidth={c.id === highlight ? 2.5 : 1.5}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-2 px-2 section-label">Company</th>
              <th className="text-right py-2 px-2 section-label">ESG</th>
              <th className="text-right py-2 px-2 section-label">E</th>
              <th className="text-right py-2 px-2 section-label">S</th>
              <th className="text-right py-2 px-2 section-label">G</th>
              <th className="text-right py-2 px-2 section-label">Momentum</th>
              <th className="text-right py-2 px-2 section-label">AI</th>
            </tr>
          </thead>
          <tbody>
            {withScores.map((c, i) => {
              const s = c.latest_score!
              const isHighlighted = c.id === highlight
              return (
                <tr key={c.id} className={clsx('border-b border-slate-50', isHighlighted && 'bg-blue-50/60')}>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <div>
                        <div className={clsx('font-medium', isHighlighted ? 'text-blue-700' : 'text-slate-700')}>{c.ticker}</div>
                        <div className="text-slate-400 text-[10px] truncate max-w-[80px]">{c.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span className={clsx('font-bold tabular-nums', esgScoreColor(s.current_esg_score))}>{fmt0(s.current_esg_score)}</span>
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums text-slate-600">{fmt0(s.environmental_score ?? 0)}</td>
                  <td className="py-2 px-2 text-right tabular-nums text-slate-600">{fmt0(s.social_score ?? 0)}</td>
                  <td className="py-2 px-2 text-right tabular-nums text-slate-600">{fmt0(s.governance_score ?? 0)}</td>
                  <td className={clsx('py-2 px-2 text-right tabular-nums font-semibold', s.momentum_score > 20 ? 'text-emerald-600' : s.momentum_score < -20 ? 'text-red-500' : 'text-amber-600')}>
                    {s.momentum_score > 0 ? '+' : ''}{fmt0(s.momentum_score)}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums text-purple-600 font-medium">{fmt0(s.ai_adoption_score)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
