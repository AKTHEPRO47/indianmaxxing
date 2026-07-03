import {
  ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, Area, AreaChart, Brush,
} from 'recharts'
import type { ScoreSnapshot } from '../types'
import { format } from 'date-fns'

interface Props {
  snapshots: ScoreSnapshot[]
  height?: number
  showMomentum?: boolean
  focusMetric?: 'all' | 'esg' | 'momentum' | 'ai' | 'risk'
  zoomWindow?: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <div className="font-semibold text-slate-700 mb-2">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-600">{p.name}</span>
          </div>
          <span className="font-semibold" style={{ color: p.color }}>
            {typeof p.value === 'number' ? (p.value > 0 && p.name === 'Momentum' ? '+' : '') + p.value.toFixed(1) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function MomentumChart({
  snapshots,
  height = 260,
  showMomentum = true,
  focusMetric = 'all',
  zoomWindow,
}: Props) {
  const data = [...snapshots]
    .sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime())
    .map(s => ({
      date: s.created_at ? format(new Date(s.created_at), 'MMM yy') : '—',
      'ESG Score': s.current_esg_score,
      'Momentum': s.momentum_score,
      'AI Adoption': s.ai_adoption_score,
      'Controversy Risk': s.controversy_risk,
    }))

  const zoomedData = typeof zoomWindow === 'number' && zoomWindow > 0
    ? data.slice(Math.max(0, data.length - zoomWindow))
    : data

  const resolvedData = focusMetric === 'all'
    ? zoomedData
    : zoomedData.map(point => {
        if (focusMetric === 'esg') return { ...point, Momentum: undefined, 'AI Adoption': undefined, 'Controversy Risk': undefined }
        if (focusMetric === 'momentum') return { ...point, 'ESG Score': undefined, 'AI Adoption': undefined, 'Controversy Risk': undefined }
        if (focusMetric === 'ai') return { ...point, 'ESG Score': undefined, Momentum: undefined, 'Controversy Risk': undefined }
        if (focusMetric === 'risk') return { ...point, 'ESG Score': undefined, Momentum: undefined, 'AI Adoption': undefined }
        return point
      })

  if (resolvedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
        No historical data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={resolvedData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="esgGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="momGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.12} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          domain={showMomentum ? [-100, 100] : [0, 100]}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={7}
          wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
        />
        {showMomentum && <ReferenceLine y={0} stroke="#e2e8f0" strokeDasharray="3 3" />}
        {(focusMetric === 'all' || focusMetric === 'esg') && (
          <Area
            type="monotone"
            dataKey="ESG Score"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#esgGrad)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        )}
        {showMomentum && (focusMetric === 'all' || focusMetric === 'momentum') && (
          <Area
            type="monotone"
            dataKey="Momentum"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#momGrad)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        )}
        {(focusMetric === 'all' || focusMetric === 'ai') && (
          <Area
            type="monotone"
            dataKey="AI Adoption"
            stroke="#8b5cf6"
            strokeWidth={2}
            fillOpacity={0}
            dot={false}
            activeDot={{ r: 4 }}
          />
        )}
        {(focusMetric === 'all' || focusMetric === 'risk') && (
          <Area
            type="monotone"
            dataKey="Controversy Risk"
            stroke="#ef4444"
            strokeWidth={2}
            fillOpacity={0}
            dot={false}
            activeDot={{ r: 4 }}
          />
        )}
        {zoomedData.length > 3 && (
          <Brush
            data={resolvedData}
            dataKey="date"
            height={18}
            stroke="#cbd5e1"
            travellerWidth={8}
            tickFormatter={() => ''}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  )
}
