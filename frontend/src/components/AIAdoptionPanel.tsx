import { RadialBarChart, RadialBar, ResponsiveContainer, Cell } from 'recharts'
import { Zap, Brain, Code, Building2, Package } from 'lucide-react'

interface Props {
  score: number
  breakdown?: {
    ai_hiring: number
    ai_patents: number
    ai_partnerships: number
    ai_product: number
    ai_infrastructure: number
    automation: number
  }
  explanation?: string
  signalCount?: number
}

const BUCKETS = [
  { key: 'ai_hiring', label: 'AI Hiring', icon: <Zap className="w-3.5 h-3.5" /> },
  { key: 'ai_patents', label: 'AI Patents', icon: <Brain className="w-3.5 h-3.5" /> },
  { key: 'ai_partnerships', label: 'AI Partnerships', icon: <Building2 className="w-3.5 h-3.5" /> },
  { key: 'ai_product', label: 'AI Products', icon: <Package className="w-3.5 h-3.5" /> },
  { key: 'ai_infrastructure', label: 'Infrastructure', icon: <Code className="w-3.5 h-3.5" /> },
]

export default function AIAdoptionPanel({ score, breakdown, explanation, signalCount }: Props) {
  const scoreColor = score >= 70 ? '#8b5cf6' : score >= 40 ? '#3b82f6' : '#94a3b8'

  return (
    <div className="space-y-4">
      {/* Score gauge */}
      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="70%"
              outerRadius="100%"
              startAngle={180}
              endAngle={-180}
              data={[{ value: score }]}
            >
              <RadialBar dataKey="value" cornerRadius={4} background={{ fill: '#f1f5f9' }}>
                <Cell fill={scoreColor} />
              </RadialBar>
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-xl font-bold" style={{ color: scoreColor }}>{Math.round(score)}</div>
            <div className="text-[9px] text-slate-400 font-medium">/ 100</div>
          </div>
        </div>

        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-900">AI Adoption Score</div>
          {signalCount !== undefined && (
            <div className="text-xs text-slate-500 mt-0.5">{signalCount} signal{signalCount !== 1 ? 's' : ''} detected</div>
          )}
          <div className="mt-2">
            {score >= 70 && <span className="badge bg-purple-50 text-purple-700 border border-purple-200">Advanced</span>}
            {score >= 40 && score < 70 && <span className="badge bg-blue-50 text-blue-700 border border-blue-200">Moderate</span>}
            {score > 0 && score < 40 && <span className="badge bg-slate-100 text-slate-600 border border-slate-200">Early Stage</span>}
            {score === 0 && <span className="badge bg-slate-100 text-slate-500 border border-slate-200">No Signals</span>}
          </div>
        </div>
      </div>

      {/* Signal breakdown */}
      {breakdown && (
        <div className="space-y-2">
          {BUCKETS.map(b => {
            const val = (breakdown as any)[b.key] ?? 0
            return (
              <div key={b.key} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
                  {b.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-600 mb-0.5">{b.label}</div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, val)}%`,
                        background: val > 50 ? '#8b5cf6' : '#c4b5fd',
                      }}
                    />
                  </div>
                </div>
                <div className="text-xs font-semibold text-slate-700 tabular-nums w-8 text-right">{Math.round(val)}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Explanation */}
      {explanation && (
        <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-3">{explanation}</p>
      )}
    </div>
  )
}
