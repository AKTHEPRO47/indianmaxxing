import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { StockPricePoint } from '../types'
import { clsx } from 'clsx'

type Strategy = 'buy_hold' | 'trend_follow' | 'mean_reversion'

interface Props {
  history: StockPricePoint[]
  companyName: string
  ticker?: string | null
}

interface BacktestPoint {
  timestamp: string
  price: number
  strategy_equity: number
  benchmark_equity: number
}

interface TradeRecord {
  entryPrice: number
  exitPrice: number
  pnl: number
}

interface SimulationResult {
  points: BacktestPoint[]
  finalValue: number
  benchmarkFinal: number
  totalReturnPct: number
  benchmarkReturnPct: number
  maxDrawdownPct: number
  benchmarkDrawdownPct: number
  trades: TradeRecord[]
}

const STRATEGY_LABELS: Record<Strategy, string> = {
  buy_hold: 'Buy & Hold',
  trend_follow: 'Trend Follow',
  mean_reversion: 'Mean Reversion',
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value)
}

function formatPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function calculateDrawdown(points: BacktestPoint[], key: 'strategy_equity' | 'benchmark_equity') {
  let peak = points[0]?.[key] ?? 0
  let maxDrawdown = 0
  for (const point of points) {
    peak = Math.max(peak, point[key])
    if (peak > 0) {
      const drawdown = ((peak - point[key]) / peak) * 100
      maxDrawdown = Math.max(maxDrawdown, drawdown)
    }
  }
  return maxDrawdown
}

function runBacktest(
  history: StockPricePoint[],
  strategy: Strategy,
  initialCapital: number,
  positionPct: number,
  lookback: number,
  holdDays: number,
): SimulationResult | null {
  const points = [...history]
    .filter(point => typeof point.close === 'number' && point.close !== null)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  if (points.length < 2) return null

  const benchmarkShares = initialCapital / (points[0].close ?? 1)
  let cash = initialCapital
  let shares = 0
  let inPosition = false
  let entryIndex = -1
  let entryPrice = 0
  const trades: TradeRecord[] = []
  const curve: BacktestPoint[] = []

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]
    const price = current.close ?? 0
    const windowStart = Math.max(0, index - lookback)
    const trailingWindow = points.slice(windowStart, index + 1).map(point => point.close ?? 0).filter(Boolean)
    const movingAverage = average(trailingWindow)
    const lookbackPrice = index >= lookback ? (points[index - lookback].close ?? null) : null
    const trailingChange = lookbackPrice ? ((price - lookbackPrice) / lookbackPrice) * 100 : 0
    const daysHeld = inPosition ? index - entryIndex : 0
    const isLastPoint = index === points.length - 1

    const enterPosition = () => {
      const investAmount = cash * (positionPct / 100)
      if (investAmount <= 0 || price <= 0) return
      shares = investAmount / price
      cash -= investAmount
      inPosition = true
      entryIndex = index
      entryPrice = price
    }

    const exitPosition = () => {
      if (!inPosition || shares <= 0) return
      cash += shares * price
      trades.push({
        entryPrice,
        exitPrice: price,
        pnl: shares * (price - entryPrice),
      })
      shares = 0
      inPosition = false
      entryIndex = -1
      entryPrice = 0
    }

    if (strategy === 'buy_hold') {
      if (index === 0 && !inPosition) enterPosition()
      if (isLastPoint && inPosition) exitPosition()
    }

    if (strategy === 'trend_follow') {
      if (!inPosition && index >= lookback && trailingChange >= 2 && price >= movingAverage) enterPosition()
      if (inPosition && (daysHeld >= holdDays || trailingChange <= -1.5 || price < movingAverage)) exitPosition()
    }

    if (strategy === 'mean_reversion') {
      if (!inPosition && index >= lookback && trailingChange <= -3 && price < movingAverage) enterPosition()
      if (inPosition && (daysHeld >= holdDays || trailingChange >= 0 || price >= movingAverage)) exitPosition()
    }

    const strategyEquity = cash + shares * price
    const benchmarkEquity = benchmarkShares * price

    curve.push({
      timestamp: current.timestamp,
      price,
      strategy_equity: strategyEquity,
      benchmark_equity: benchmarkEquity,
    })

    if (isLastPoint && inPosition) {
      exitPosition()
      curve[curve.length - 1].strategy_equity = cash
    }
  }

  const finalValue = curve[curve.length - 1]?.strategy_equity ?? initialCapital
  const benchmarkFinal = curve[curve.length - 1]?.benchmark_equity ?? initialCapital
  const totalReturnPct = ((finalValue - initialCapital) / initialCapital) * 100
  const benchmarkReturnPct = ((benchmarkFinal - initialCapital) / initialCapital) * 100

  return {
    points: curve,
    finalValue,
    benchmarkFinal,
    totalReturnPct,
    benchmarkReturnPct,
    maxDrawdownPct: calculateDrawdown(curve, 'strategy_equity'),
    benchmarkDrawdownPct: calculateDrawdown(curve, 'benchmark_equity'),
    trades,
  }
}

export default function BacktestSimulator({ history, companyName, ticker }: Props) {
  const [strategy, setStrategy] = useState<Strategy>('trend_follow')
  const [initialCapital, setInitialCapital] = useState(10000)
  const [positionPct, setPositionPct] = useState(60)
  const [lookback, setLookback] = useState(5)
  const [holdDays, setHoldDays] = useState(8)

  const result = useMemo(
    () => runBacktest(history, strategy, initialCapital, positionPct, lookback, holdDays),
    [history, strategy, initialCapital, positionPct, lookback, holdDays],
  )

  const winRate = result && result.trades.length > 0
    ? (result.trades.filter(trade => trade.pnl > 0).length / result.trades.length) * 100
    : 0

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs">
          <span className="mb-1 block uppercase tracking-wider text-slate-500">Strategy</span>
          <select value={strategy} onChange={e => setStrategy(e.target.value as Strategy)} className="input-base w-full">
            {Object.entries(STRATEGY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs">
          <span className="mb-1 block uppercase tracking-wider text-slate-500">Initial capital</span>
          <input type="number" min="1000" step="500" value={initialCapital} onChange={e => setInitialCapital(Number(e.target.value) || 10000)} className="input-base w-full" />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block uppercase tracking-wider text-slate-500">Position size</span>
          <input type="range" min="10" max="100" step="5" value={positionPct} onChange={e => setPositionPct(Number(e.target.value))} className="w-full" />
          <div className="mt-1 text-xs text-slate-500">{positionPct}% of available cash</div>
        </label>
        <label className="block text-xs">
          <span className="mb-1 block uppercase tracking-wider text-slate-500">Lookback / hold</span>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" min="3" max="30" step="1" value={lookback} onChange={e => setLookback(Number(e.target.value) || 5)} className="input-base w-full" />
            <input type="number" min="1" max="30" step="1" value={holdDays} onChange={e => setHoldDays(Number(e.target.value) || 8)} className="input-base w-full" />
          </div>
        </label>
      </div>

      {!result ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Backtest simulator needs live history data for {ticker ?? companyName}.
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Final value" value={formatMoney(result.finalValue)} subValue={`vs ${formatMoney(initialCapital)}`} />
            <Metric label="Strategy return" value={formatPercent(result.totalReturnPct)} subValue={`Benchmark ${formatPercent(result.benchmarkReturnPct)}`} />
            <Metric label="Max drawdown" value={formatPercent(-result.maxDrawdownPct)} subValue={`Benchmark ${formatPercent(-result.benchmarkDrawdownPct)}`} />
            <Metric label="Trades" value={String(result.trades.length)} subValue={`${winRate.toFixed(0)}% win rate`} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Equity curve</div>
                  <div className="text-sm font-semibold text-slate-900">{companyName} backtest vs buy & hold</div>
                </div>
                <div className="text-xs text-slate-500">{STRATEGY_LABELS[strategy]}</div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={result.points} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(value) => format(new Date(value), 'MMM d')} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(value) => formatMoney(value)} />
                  <Tooltip
                    formatter={(value: any, name: string) => [formatMoney(Number(value)), name === 'strategy_equity' ? 'Strategy' : name === 'benchmark_equity' ? 'Buy & Hold' : 'Price']}
                    labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
                  />
                  <Line type="monotone" dataKey="strategy_equity" stroke="#10b981" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="benchmark_equity" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Trade ledger</div>
                <div className="text-sm font-semibold text-slate-900">Recent simulated round trips</div>
              </div>
              <div className="space-y-2 max-h-[230px] overflow-auto pr-1">
                {result.trades.length > 0 ? result.trades.slice(-5).reverse().map((trade, index) => (
                  <div key={`${trade.entryPrice}-${trade.exitPrice}-${index}`} className={clsx('rounded-xl border px-3 py-2 text-xs', trade.pnl >= 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800')}>
                    <div className="font-semibold">{trade.pnl >= 0 ? 'Win' : 'Loss'} {formatMoney(Math.abs(trade.pnl))}</div>
                    <div className="mt-0.5 opacity-80">Entry {formatMoney(trade.entryPrice)} · Exit {formatMoney(trade.exitPrice)}</div>
                  </div>
                )) : (
                  <div className="text-sm text-slate-500">No completed trades for the current settings.</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Metric({ label, value, subValue }: { label: string; value: string; subValue: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{subValue}</div>
    </div>
  )
}