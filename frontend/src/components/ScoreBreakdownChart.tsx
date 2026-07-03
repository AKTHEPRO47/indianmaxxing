import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'

interface Props {
  scores: {
    label: string
    value: number
    color: string
  }[]
  height?: number
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <div className="font-semibold text-slate-800 mb-1">{item.payload.label}</div>
      <div className="text-slate-500">Score</div>
      <div className="font-bold" style={{ color: item.fill }}>{item.value.toFixed(1)}</div>
    </div>
  )
}

export default function ScoreBreakdownChart({ scores, height = 220 }: Props) {
  if (scores.length === 0) {
    return <div className="flex items-center justify-center h-32 text-slate-400 text-sm">No score breakdown available</div>
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={scores} margin={{ top: 6, right: 4, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
          {scores.map((item, index) => (
            <Cell key={item.label} fill={item.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}