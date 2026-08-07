import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell } from 'recharts'
import { useNavigate } from 'react-router-dom'
import type { MatrixEntry } from '../types'
import { clsx } from 'clsx'

interface Props {
  entries: MatrixEntry[]
  height?: number
  interactive?: boolean
  selectedId?: number | null
  showTickerLabels?: boolean
  zoomLevel?: number
  onPointClick?: (entry: MatrixEntry) => void
}

const classColor: Record<string, string> = {
  'Future Leader':    '#10b981',
  'Hidden Winner':    '#3b82f6',
  'Overrated Leader': '#f59e0b',
  'Value Trap':       '#ef4444',
  'Watchlist':        '#94a3b8',
  'Risk Alert':       '#dc2626',
}

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props
  const color = classColor[payload.classification] ?? '#94a3b8'
  const selected = payload.selected
  const outerR = selected ? 14 : 11
  const innerR = selected ? 10 : 8
  const logoSrc = payload.entry?.company?.logo_url
  const initials = (payload.ticker || payload.name || '?').slice(0, 3).toUpperCase()
  return (
    <g className={clsx('transition-all duration-150', selected && 'drop-shadow-md')}>
      {selected && <circle cx={cx} cy={cy} r={outerR + 4} fill={color} fillOpacity={0.08} />}
      <circle cx={cx} cy={cy} r={outerR} fill={color} fillOpacity={selected ? 0.18 : 0.10} />
      <circle cx={cx} cy={cy} r={innerR} fill="#ffffff" stroke={color} strokeWidth={selected ? 1.5 : 1} strokeOpacity={0.35} />
      {/* Ticker initials — always visible, hidden by logo image when it loads */}
      <text
        x={cx}
        y={cy + (selected ? 3.5 : 2.8)}
        textAnchor="middle"
        fontSize={selected ? 6 : 5}
        fontWeight="700"
        fill={color}
        letterSpacing="-0.3"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {initials.slice(0, 2)}
      </text>
      {/* Logo image — when loaded it covers the text */}
      {logoSrc && (
        <image
          href={logoSrc}
          x={cx - (selected ? 8 : 6.5)}
          y={cy - (selected ? 8 : 6.5)}
          width={selected ? 16 : 13}
          height={selected ? 16 : 13}
          preserveAspectRatio="xMidYMid meet"
        />
      )}
      <title>{payload.name} ({payload.ticker})</title>
    </g>
  )
}

const MatrixTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs z-50">
      <div className="font-semibold text-slate-800 mb-1">{d.name}</div>
      <div className="text-slate-500">{d.ticker}</div>
      <div className="mt-2 space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">ESG Score</span>
          <span className="font-semibold">{d.x.toFixed(1)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Momentum</span>
          <span className="font-semibold" style={{ color: d.y >= 0 ? '#10b981' : '#ef4444' }}>
            {d.y > 0 ? '+' : ''}{d.y.toFixed(1)}
          </span>
        </div>
        <div className="mt-1 pt-1 border-t border-slate-100">
          <span style={{ color: classColor[d.classification] ?? '#94a3b8' }} className="font-semibold">
            {d.classification}
          </span>
        </div>
      </div>
    </div>
  )
}

// Axis domain steps for each zoom level: [xMin, xMax, yMin, yMax]
const ZOOM_DOMAINS: [number, number, number, number][] = [
  [0, 100, -100, 100],
  [10, 90, -80, 80],
  [20, 80, -60, 60],
  [28, 72, -42, 42],
  [35, 65, -28, 28],
  [40, 60, -18, 18],
]

export default function ESGMatrix({
  entries,
  height = 420,
  interactive = true,
  selectedId = null,
  showTickerLabels = true,
  zoomLevel = 0,
  onPointClick,
}: Props) {
  const [xMin, xMax, yMin, yMax] = ZOOM_DOMAINS[Math.min(Math.max(0, zoomLevel), ZOOM_DOMAINS.length - 1)]
  const navigate = useNavigate()

  const data = entries.map(e => ({
    x: e.current_esg_score,
    y: e.momentum_score,
    name: e.company.name,
    ticker: e.company.ticker ?? '',
    id: e.company.id,
    classification: e.classification,
    selected: selectedId === e.company.id,
    entry: e,
  }))

  return (
    <div className="relative">
      {/* Quadrant background labels */}
      <div className="absolute inset-0 pointer-events-none z-10" style={{ top: 10, left: 40, right: 20, bottom: 30 }}>
        <div className="relative w-full h-full">
          <div className="absolute top-2 left-2 text-xs font-semibold text-blue-400 opacity-70 flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/></svg>
            Hidden Winner
          </div>
          <div className="absolute top-2 right-2 text-xs font-semibold text-emerald-500 opacity-70 flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9.5 2.5L3 15h4l-2 7 12-10h-5l3-9.5z"/></svg>
            Future Leader
          </div>
          <div className="absolute bottom-2 left-2 text-xs font-semibold text-red-400 opacity-70 flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
            Value Trap
          </div>
          <div className="absolute bottom-2 right-2 text-xs font-semibold text-amber-500 opacity-70 flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Overrated Leader
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            type="number"
            dataKey="x"
            name="ESG Score"
            domain={[xMin, xMax]}
            label={{ value: 'Current ESG Score →', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11 }}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Momentum"
            domain={[yMin, yMax]}
            label={{ value: 'ESG Momentum →', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11, offset: 10 }}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine x={60} stroke="#e2e8f0" strokeDasharray="4 4" />
          <ReferenceLine y={0} stroke="#e2e8f0" strokeDasharray="4 4" />
          <Tooltip content={<MatrixTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter
            data={data}
            shape={<CustomDot />}
            onClick={interactive ? (d: any) => {
              if (typeof (d?.entry?.company?.id ?? d?.id) === 'number' && onPointClick) {
                onPointClick(d.entry)
                return
              }
              navigate(`/companies/${d.id}`)
            } : undefined}
            style={interactive || onPointClick ? { cursor: 'pointer' } : {}}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={classColor[d.classification] ?? '#94a3b8'} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* Ticker labels */}
      {showTickerLabels && (
        <div className="absolute inset-0 pointer-events-none" style={{ top: 10, left: 60, right: 30, bottom: 50 }}>
          {data.map(d => {
          const xPct = ((d.x - xMin) / (xMax - xMin)) * 100
          const yPct = ((yMax - d.y) / (yMax - yMin)) * 100
          return (
            <div
              key={d.id}
              className={clsx('absolute text-[9px] font-semibold whitespace-nowrap', d.selected ? 'text-slate-900' : 'text-slate-600')}
              style={{
                left: `calc(${xPct}% + 8px)`,
                top: `calc(${yPct}% - 12px)`,
              }}
            >
              {d.ticker}
            </div>
          )
          })}
        </div>
      )}
    </div>
  )
}
