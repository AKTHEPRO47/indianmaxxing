import { useEffect, useRef, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { clsx } from 'clsx'
import { http } from '../api/client'

interface TickerQuote {
  ticker: string
  last_price: number | null
  change: number | null
  change_pct: number | null
  currency: string
}

const TICKERS = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META', 'NFLX', 'JPM', 'BRK-B']

export default function LiveTicker() {
  const [quotes, setQuotes] = useState<TickerQuote[]>([])
  const rafRef = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await http.get<Record<string, TickerQuote>>(
          `/market/batch-quotes?tickers=${TICKERS.join(',')}`
        )
        setQuotes(Object.values(res.data))
      } catch {
        // silently fail — ticker is decorative
      }
    }
    void load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!innerRef.current) return
    const el = innerRef.current
    const step = () => {
      offsetRef.current -= 0.5
      if (Math.abs(offsetRef.current) >= el.scrollWidth / 2) offsetRef.current = 0
      el.style.transform = `translateX(${offsetRef.current}px)`
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [quotes])

  if (quotes.length === 0) return null

  const items = [...quotes, ...quotes] // duplicate for seamless loop

  return (
    <div
      ref={containerRef}
      className="overflow-hidden bg-slate-950 border-b border-slate-800 h-7 flex items-center"
      aria-hidden="true"
    >
      <div ref={innerRef} className="flex items-center gap-0 whitespace-nowrap will-change-transform">
        {items.map((q, i) => {
          const isUp = (q.change ?? 0) >= 0
          return (
            <span
              key={i}
              className={clsx(
                'inline-flex items-center gap-1.5 px-4 text-[11px] font-medium border-r border-slate-800',
                isUp ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              <span className="text-slate-300 font-bold">{q.ticker}</span>
              {q.last_price != null && (
                <span>
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: q.currency || 'USD',
                    maximumFractionDigits: q.last_price >= 100 ? 0 : 2,
                  }).format(q.last_price)}
                </span>
              )}
              {q.change_pct != null && (
                <span className="flex items-center gap-0.5">
                  {isUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                  {isUp ? '+' : ''}{q.change_pct.toFixed(2)}%
                </span>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}
