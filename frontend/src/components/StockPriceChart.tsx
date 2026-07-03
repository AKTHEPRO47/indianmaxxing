import { format } from 'date-fns'
import {
  ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine,
  AreaChart, Area,
} from 'recharts'
import type { StockData, StockRange } from '../types'
import { clsx } from 'clsx'

interface Props {
  data: StockData | null
  loading?: boolean
  selectedRange: StockRange
  onRangeChange: (range: StockRange) => void
}

const RANGE_OPTIONS: Array<{ value: StockRange; label: string }> = [
  { value: '1m', label: '1m' },
  { value: '2m', label: '2m' },
  { value: '5m', label: '5m' },
  { value: '1d', label: '1D' },
  { value: '2d', label: '2D' },
  { value: '1w', label: '1W' },
  { value: '1mo', label: '1M' },
  { value: '1y', label: '1Y' },
  { value: 'max', label: 'MAX' },
]

const currencyFormatter = (currency: string | null | undefined, value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const resolvedCurrency = currency || 'USD'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: resolvedCurrency,
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value)
}

const compactFormatter = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

const formatChange = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`
}

const formatTimestamp = (timestamp: string, range: StockRange) => {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return timestamp
  if (range === '1m' || range === '2m' || range === '5m') {
    return format(date, 'HH:mm')
  }
  if (range === 'max') {
    return format(date, 'MMM yy')
  }
  return format(date, 'MMM d')
}

const CustomTooltip = ({ active, payload, label, currency }: any) => {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-xs min-w-44">
      <div className="font-semibold text-slate-900 mb-2">{label}</div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Close</span>
          <span className="font-semibold text-slate-900">{currencyFormatter(currency, point?.close)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Open</span>
          <span className="font-semibold text-slate-900">{currencyFormatter(currency, point?.open)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">High / Low</span>
          <span className="font-semibold text-slate-900">{currencyFormatter(currency, point?.high)} / {currencyFormatter(currency, point?.low)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Volume</span>
          <span className="font-semibold text-slate-900">{compactFormatter(point?.volume)}</span>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">{label}</div>
      <div className="text-sm font-semibold text-slate-900">{value}</div>
      {subValue && <div className="text-xs text-slate-500 mt-1">{subValue}</div>}
    </div>
  )
}

export default function StockPriceChart({ data, loading = false, selectedRange, onRangeChange }: Props) {
  const history = [...(data?.history ?? [])].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  const currency = data?.quote.currency ?? 'USD'
  const quote = data?.quote
  const lineColor = (quote?.change ?? 0) >= 0 ? '#10b981' : '#ef4444'
  const fillColor = (quote?.change ?? 0) >= 0 ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)'
  const dayRange = quote ? `${currencyFormatter(currency, quote.day_low)} - ${currencyFormatter(currency, quote.day_high)}` : '—'
  const yearRange = quote ? `${currencyFormatter(currency, quote.year_low)} - ${currencyFormatter(currency, quote.year_high)}` : '—'
  const currentChange = quote ? formatChange(quote.change) : '—'
  const currentChangePercent = quote?.change_percent === null || quote?.change_percent === undefined
    ? '—'
    : `${quote.change_percent > 0 ? '+' : ''}${quote.change_percent.toFixed(2)}%`

  return (
    <div className="card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="section-label mb-1">Live market data</div>
          <h2 className="font-semibold text-slate-900 text-sm">Stock price chart</h2>
          <p className="text-xs text-slate-400">Live quote metadata and selectable history ranges.</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-slate-900">
            {quote ? currencyFormatter(currency, quote.last_price) : '—'}
          </div>
          <div className={clsx('text-xs font-semibold', (quote?.change ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500')}>
            {currentChange} ({currentChangePercent})
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {quote?.as_of ? `As of ${format(new Date(quote.as_of), 'MMM d, HH:mm')}` : 'No live quote available'}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mr-1">Range</span>
        {RANGE_OPTIONS.map(option => (
          <button
            key={option.value}
            onClick={() => onRangeChange(option.value)}
            className={clsx(
              'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
              selectedRange === option.value
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.95fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white/70 p-3">
          {loading ? (
            <div className="flex h-72 items-center justify-center text-sm text-slate-400">Loading live market data…</div>
          ) : history.length === 0 ? (
            <div className="flex h-72 items-center justify-center text-sm text-slate-400">No live market data available for this range.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={history} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="stockArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={lineColor} stopOpacity={0.22} />
                    <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(value) => formatTimestamp(value, selectedRange)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => currencyFormatter(currency, value)}
                />
                <Tooltip content={(props) => <CustomTooltip {...props} currency={currency} />} />
                <ReferenceLine y={quote?.previous_close ?? undefined} stroke="#cbd5e1" strokeDasharray="4 4" />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={lineColor}
                  strokeWidth={2.5}
                  fill="url(#stockArea)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Previous close" value={quote ? currencyFormatter(currency, quote.previous_close) : '—'} />
            <StatCard label="Day range" value={dayRange} />
            <StatCard label="52-week range" value={yearRange} />
            <StatCard label="Volume" value={quote ? compactFormatter(quote.volume) : '—'} />
            <StatCard label="Avg volume" value={quote ? compactFormatter(quote.average_volume) : '—'} />
            <StatCard label="Market cap" value={quote ? compactFormatter(quote.market_cap) : '—'} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Quote details</div>
            <div className="text-sm font-semibold text-slate-900">{quote?.exchange ?? 'Unknown exchange'}</div>
            <div className="text-xs text-slate-500">{quote?.quote_type ?? 'Unknown quote type'}</div>
            <div className="pt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
              <div>Open: <span className="font-semibold text-slate-900">{quote ? currencyFormatter(currency, quote.open) : '—'}</span></div>
              <div>Last: <span className="font-semibold text-slate-900">{quote ? currencyFormatter(currency, quote.last_price) : '—'}</span></div>
              <div>1D low: <span className="font-semibold text-slate-900">{quote ? currencyFormatter(currency, quote.day_low) : '—'}</span></div>
              <div>1D high: <span className="font-semibold text-slate-900">{quote ? currencyFormatter(currency, quote.day_high) : '—'}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
