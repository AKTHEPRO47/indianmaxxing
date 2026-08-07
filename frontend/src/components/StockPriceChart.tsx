import React, { useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine,
  ComposedChart, Area, Bar, Line,
} from 'recharts'
import { RefreshCw, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import type { StockData, StockRange } from '../types'
import { clsx } from 'clsx'

function ema(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN)
  if (values.length < period) return out
  let sum = 0
  for (let i = 0; i < period; i++) sum += values[i]
  out[period - 1] = sum / period
  const k = 2 / (period + 1)
  for (let i = period; i < values.length; i++) out[i] = values[i] * k + out[i - 1] * (1 - k)
  return out
}

function computeRSI(closes: number[], period = 14): number[] {
  const rsi = new Array<number>(closes.length).fill(NaN)
  if (closes.length <= period) return rsi
  let ag = 0, al = 0
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1]
    if (d > 0) ag += d; else al -= d
  }
  ag /= period; al /= period
  rsi[period] = al === 0 ? 100 : 100 - 100 / (1 + ag / al)
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    ag = (ag * (period - 1) + Math.max(d, 0)) / period
    al = (al * (period - 1) + Math.max(-d, 0)) / period
    rsi[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al)
  }
  return rsi
}

function computeMACD(closes: number[]) {
  const e12 = ema(closes, 12)
  const e26 = ema(closes, 26)
  const macd = e12.map((v, i) => isNaN(v) || isNaN(e26[i]) ? NaN : v - e26[i])
  const validForSig = macd.map(v => isNaN(v) ? 0 : v)
  const sig = ema(validForSig, 9)
  const hist = macd.map((v, i) => isNaN(v) || isNaN(sig[i]) ? NaN : v - sig[i])
  return { macd, sig, hist }
}

type Signal = { idx: number; type: 'buy' | 'sell'; reason: string }

function detectSignals(rsi: number[], macdHist: number[]): Signal[] {
  const signals: Signal[] = []
  const seen = new Set<number>()
  for (let i = 1; i < rsi.length; i++) {
    if (isNaN(rsi[i]) || isNaN(rsi[i - 1])) continue
    // RSI buy: exits oversold zone (widened to 38 for better sensitivity)
    if (!seen.has(i) && rsi[i - 1] < 38 && rsi[i] >= 38) {
      signals.push({ idx: i, type: 'buy', reason: 'RSI Oversold Recovery' }); seen.add(i)
    }
    // RSI sell: exits overbought zone (tightened to 62)
    if (!seen.has(i) && rsi[i - 1] > 62 && rsi[i] <= 62) {
      signals.push({ idx: i, type: 'sell', reason: 'RSI Overbought Reversal' }); seen.add(i)
    }
    if (!isNaN(macdHist[i]) && !isNaN(macdHist[i - 1])) {
      if (!seen.has(i) && macdHist[i - 1] < 0 && macdHist[i] > 0 && rsi[i] < 55) {
        signals.push({ idx: i, type: 'buy', reason: 'MACD Bullish Cross' }); seen.add(i)
      }
      if (!seen.has(i) && macdHist[i - 1] > 0 && macdHist[i] < 0 && rsi[i] > 45) {
        signals.push({ idx: i, type: 'sell', reason: 'MACD Bearish Cross' }); seen.add(i)
      }
    }
  }
  return signals
}

const RANGE_OPTIONS: Array<{ value: StockRange; label: string }> = [
  { value: '1m', label: '1m' }, { value: '2m', label: '2m' }, { value: '5m', label: '5m' },
  { value: '1d', label: '1D' }, { value: '2d', label: '2D' }, { value: '1w', label: '1W' },
  { value: '1mo', label: '1M' }, { value: '1y', label: '1Y' }, { value: 'max', label: 'MAX' },
]

const fmt = (currency: string | null | undefined, value: number | null | undefined) => {
  if (value == null || isNaN(value)) return '---'
  const c = currency || 'USD'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: value >= 100 ? 0 : 2 }).format(value)
}
const compact = (v: number | null | undefined) =>
  v == null ? '---' : new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
const fmtChg = (v: number | null | undefined) => v == null ? '---' : (v > 0 ? '+' : '') + v.toFixed(2)
const fmtPct = (v: number | null | undefined) => v == null ? '---' : (v > 0 ? '+' : '') + v.toFixed(2) + '%'
const fmtTs = (ts: string, range: StockRange) => {
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ts
  if (['1m', '2m', '5m'].includes(range)) return format(d, 'HH:mm')
  if (range === 'max') return format(d, 'MMM yy')
  return format(d, 'MMM d')
}

const renderSignalDot = (props: any): React.ReactElement<SVGElement> => {
  const { cx, cy, payload } = props
  if (!payload) return <g />
  if (payload.buySignal != null) {
    return (
      <g key={'b' + cx + cy}>
        <circle cx={cx} cy={cy + 16} r={8} fill="#10b981" opacity={0.15} />
        <polygon points={cx + ',' + (cy + 7) + ' ' + (cx - 6) + ',' + (cy + 17) + ' ' + (cx + 6) + ',' + (cy + 17)} fill="#10b981" stroke="#fff" strokeWidth={1.5} />
      </g>
    )
  }
  if (payload.sellSignal != null) {
    return (
      <g key={'s' + cx + cy}>
        <circle cx={cx} cy={cy - 16} r={8} fill="#ef4444" opacity={0.15} />
        <polygon points={cx + ',' + (cy - 7) + ' ' + (cx - 6) + ',' + (cy - 17) + ' ' + (cx + 6) + ',' + (cy - 17)} fill="#ef4444" stroke="#fff" strokeWidth={1.5} />
      </g>
    )
  }
  return <g />
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-4">
    <span className="text-slate-400">{label}</span>
    <span className="font-semibold text-slate-900">{value}</span>
  </div>
)

const StatCard = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
    <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">{label}</div>
    <div className="text-sm font-semibold text-slate-900">{value}</div>
    {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
  </div>
)

const PriceTooltip = ({ active, payload, label, currency }: any) => {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-xs min-w-44">
      <div className="font-semibold text-slate-700 mb-2">{label}</div>
      <div className="space-y-1">
        {p?.close != null && <Row label="Close" value={fmt(currency, p.close)} />}
        {p?.open != null && <Row label="Open" value={fmt(currency, p.open)} />}
        {p?.high != null && <Row label="H / L" value={fmt(currency, p.high) + ' / ' + fmt(currency, p.low)} />}
        {p?.volume != null && <Row label="Volume" value={compact(p.volume)} />}
        {p?.rsi != null && <Row label="RSI" value={p.rsi.toFixed(1)} />}
        {p?.buySignal != null && <div className="mt-1.5 text-emerald-700 font-bold">BUY: {p.signalReason}</div>}
        {p?.sellSignal != null && <div className="mt-1.5 text-red-600 font-bold">SELL: {p.signalReason}</div>}
      </div>
    </div>
  )
}

const RSITooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const v = payload[0]?.value
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2 text-xs">
      <span className={clsx('font-bold', v > 62 ? 'text-red-500' : v < 38 ? 'text-emerald-600' : 'text-violet-600')}>
        RSI {isNaN(v) ? '---' : v.toFixed(1)}
      </span>
    </div>
  )
}

const MACDTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2 text-xs space-y-0.5">
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: {isNaN(p.value) ? '---' : p.value.toFixed(3)}</div>
      ))}
    </div>
  )
}

interface Props {
  data: StockData | null
  loading?: boolean
  selectedRange: StockRange
  onRangeChange: (r: StockRange) => void
  onRefresh?: () => void | Promise<void>
}

type Panel = 'rsi' | 'macd' | 'none'

export default function StockPriceChart({ data, loading = false, selectedRange, onRangeChange, onRefresh }: Props) {
  const [panel, setPanel] = useState<Panel>('rsi')

  const history = useMemo(
    () => [...(data?.history ?? [])].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [data?.history]
  )

  const enriched = useMemo(() => {
    const closes = history.map(p => p.close ?? 0)
    const rsi = computeRSI(closes)
    const { macd, sig, hist } = computeMACD(closes)
    const signals = detectSignals(rsi, hist)
    const sigMap = new Map(signals.map(s => [s.idx, s]))
    return history.map((p, i) => {
      const s = sigMap.get(i)
      return {
        ...p,
        rsi: isNaN(rsi[i]) ? null : parseFloat(rsi[i].toFixed(2)),
        macdLine: isNaN(macd[i]) ? null : parseFloat(macd[i].toFixed(3)),
        macdSig: isNaN(sig[i]) ? null : parseFloat(sig[i].toFixed(3)),
        macdHist: isNaN(hist[i]) ? null : parseFloat(hist[i].toFixed(3)),
        buySignal: s?.type === 'buy' ? p.close : undefined,
        sellSignal: s?.type === 'sell' ? p.close : undefined,
        signalReason: s?.reason,
      }
    })
  }, [history])

  const quote = data?.quote
  const currency = quote?.currency ?? 'USD'
  const isUp = (quote?.change ?? 0) >= 0
  const lineColor = isUp ? '#10b981' : '#ef4444'
  const fillId = isUp ? 'stockUp' : 'stockDown'
  const buyCount = enriched.filter(p => p.buySignal != null).length
  const sellCount = enriched.filter(p => p.sellSignal != null).length
  const lastRSI = [...enriched].reverse().find(p => p.rsi != null)?.rsi ?? null
  const rsiZone = lastRSI == null ? 'Neutral' : lastRSI > 62 ? 'Overbought' : lastRSI < 38 ? 'Oversold' : 'Neutral'

  return (
    <div className="card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="section-label mb-1">Live market data</div>
          <h2 className="font-semibold text-slate-900 text-sm">Stock price chart</h2>
          <p className="text-xs text-slate-400">RSI + MACD analytics with AI-derived buy/sell signals.</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-slate-900">{quote ? fmt(currency, quote.last_price) : '---'}</div>
          <div className={clsx('text-xs font-semibold', isUp ? 'text-emerald-600' : 'text-red-500')}>
            {fmtChg(quote?.change)} ({fmtPct(quote?.change_percent)})
          </div>
          {quote?.as_of && (
            <div className="text-[10px] text-slate-400 mt-1">
              As of {format(new Date(quote.as_of), 'MMM d, HH:mm')}
            </div>
          )}
        </div>
      </div>

      {enriched.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <TrendingUp className="h-3 w-3" /> {buyCount} Buy signal{buyCount !== 1 ? 's' : ''}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
            <TrendingDown className="h-3 w-3" /> {sellCount} Sell signal{sellCount !== 1 ? 's' : ''}
          </span>
          {lastRSI != null && (
            <span className={clsx(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
              rsiZone === 'Overbought' ? 'border-red-200 bg-red-50 text-red-600'
              : rsiZone === 'Oversold' ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-slate-50 text-slate-600'
            )}>
              <Activity className="h-3 w-3" /> RSI {lastRSI} - {rsiZone}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mr-1">Range</span>
        {RANGE_OPTIONS.map(o => (
          <button key={o.value} onClick={() => onRangeChange(o.value)}
            className={clsx('rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
              selectedRange === o.value
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
            {o.label}
          </button>
        ))}
        {onRefresh && (
          <button onClick={() => { void onRefresh() }} disabled={loading}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 disabled:opacity-60">
            <RefreshCw className={clsx('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
          </button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.95fr)]">
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-3">
            {loading ? (
              <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading...</div>
            ) : enriched.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-slate-400">No live market data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={enriched} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={lineColor} stopOpacity={0.22} />
                      <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={v => fmtTs(v, selectedRange)} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    domain={['auto', 'auto']} tickFormatter={v => fmt(currency, v)} width={72} />
                  <Tooltip content={<PriceTooltip currency={currency} />} />
                  {quote?.previous_close != null && (
                    <ReferenceLine y={quote.previous_close} stroke="#cbd5e1" strokeDasharray="4 4" />
                  )}
                  <Area type="monotone" dataKey="close" stroke={lineColor} strokeWidth={2}
                    fill={'url(#' + fillId + ')'} dot={renderSignalDot} activeDot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {enriched.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Indicator</span>
                {(['rsi', 'macd', 'none'] as Panel[]).map(p => (
                  <button key={p} onClick={() => setPanel(p)}
                    className={clsx('rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                      panel === p
                        ? 'border-violet-600 bg-violet-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
                    {p === 'none' ? 'Hide' : p.toUpperCase()}
                  </button>
                ))}
              </div>

              {panel === 'rsi' && (
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-600">RSI (14)</span>
                    <div className="flex gap-3 text-[10px] text-slate-400">
                      <span className="text-red-400">Overbought &gt;62</span>
                      <span className="text-emerald-500">Oversold &lt;38</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={100}>
                    <ComposedChart data={enriched} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="timestamp" hide />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} ticks={[0, 38, 50, 62, 100]} width={28} />
                      <Tooltip content={<RSITooltip />} />
                      <ReferenceLine y={62} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
                      <ReferenceLine y={38} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} />
                      <ReferenceLine y={50} stroke="#cbd5e1" strokeDasharray="2 2" strokeWidth={1} />
                      <Line type="monotone" dataKey="rsi" stroke="#6366f1" strokeWidth={1.5} dot={false} connectNulls />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {panel === 'macd' && (
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-600">MACD (12, 26, 9)</span>
                    <div className="flex gap-3 text-[10px]">
                      <span className="text-blue-500">MACD</span>
                      <span className="text-orange-400">Signal</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={100}>
                    <ComposedChart data={enriched} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="timestamp" hide />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={44} tickFormatter={v => v.toFixed(1)} />
                      <Tooltip content={<MACDTooltip />} />
                      <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1} />
                      <Bar dataKey="macdHist" fill="#a5b4fc" opacity={0.7} />
                      <Line type="monotone" dataKey="macdLine" stroke="#3b82f6" strokeWidth={1.5} dot={false} connectNulls name="MACD" />
                      <Line type="monotone" dataKey="macdSig" stroke="#f97316" strokeWidth={1.5} dot={false} connectNulls name="Signal" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Prev close" value={fmt(currency, quote?.previous_close)} />
            <StatCard label="Day range" value={quote ? fmt(currency, quote.day_low) + ' - ' + fmt(currency, quote.day_high) : '---'} />
            <StatCard label="52-wk range" value={quote ? fmt(currency, quote.year_low) + ' - ' + fmt(currency, quote.year_high) : '---'} />
            <StatCard label="Volume" value={compact(quote?.volume)} sub={'Avg: ' + compact(quote?.average_volume)} />
            <StatCard label="Market cap" value={compact(quote?.market_cap)} />
            <StatCard label="RSI (14)" value={lastRSI != null ? String(lastRSI) : '---'} sub={rsiZone} />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Signal legend</div>
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 12 12"><polygon points="6,0 0,12 12,12" fill="#10b981"/></svg>
                <span><strong className="text-emerald-700">Buy</strong> — RSI exits oversold (&lt;38) or MACD bullish cross</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 12 12"><polygon points="6,12 0,0 12,0" fill="#ef4444"/></svg>
                <span><strong className="text-red-600">Sell</strong> — RSI exits overbought (&gt;62) or MACD bearish cross</span>
              </div>
              <div className="pt-1 border-t border-slate-200 text-[10px] text-slate-400">Technical signals only. Not financial advice.</div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Quote details</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-600">
              <div>Exchange: <span className="font-semibold text-slate-900">{quote?.exchange ?? '---'}</span></div>
              <div>Open: <span className="font-semibold text-slate-900">{fmt(currency, quote?.open)}</span></div>
              <div>Currency: <span className="font-semibold text-slate-900">{currency}</span></div>
              <div>Last: <span className="font-semibold text-slate-900">{fmt(currency, quote?.last_price)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
