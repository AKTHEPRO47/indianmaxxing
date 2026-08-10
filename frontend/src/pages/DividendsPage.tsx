import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Coins, RefreshCw } from 'lucide-react'
import { getAllDividends } from '../api/client'
import type { DividendSummary } from '../types'

const currencyFmt = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export default function DividendsPage() {
  const [rows, setRows] = useState<DividendSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [showZero, setShowZero] = useState(true)
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    getAllDividends(showZero, 500)
      .then(setRows)
      .finally(() => setLoading(false))
  }, [showZero])

  const refresh = () => {
    setRefreshing(true)
    getAllDividends(showZero, 500, true)
      .then(setRows)
      .finally(() => setRefreshing(false))
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(row =>
      row.ticker.toLowerCase().includes(q)
      || row.company_name.toLowerCase().includes(q)
      || (row.exchange ?? '').toLowerCase().includes(q)
      || (row.country ?? '').toLowerCase().includes(q),
    )
  }, [rows, search])

  const withDividend = filtered.filter(row => (row.annual_dividend ?? 0) > 0)
  const averageYield = withDividend.length > 0
    ? withDividend.reduce((acc, row) => acc + (row.dividend_yield ?? 0), 0) / withDividend.length
    : 0

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-600" />
              All Company Dividends
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Live dividend summary across all tracked companies.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button onClick={refresh} disabled={refreshing} className="btn-secondary px-3 py-2 text-xs disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />{refreshing ? 'Refreshing' : 'Refresh live data'}</button>
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-slate-600">
              <input
                type="checkbox"
                checked={showZero}
                onChange={(event) => setShowZero(event.target.checked)}
              />
              Include zero/no-dividend
            </label>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">Rows</div>
            <div className="text-lg font-semibold text-slate-900">{filtered.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">Dividend Payers</div>
            <div className="text-lg font-semibold text-emerald-700">{withDividend.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">Average Yield</div>
            <div className="text-lg font-semibold text-blue-700">{averageYield.toFixed(2)}%</div>
          </div>
        </div>

        <div className="mt-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search ticker, company, exchange, country"
            className="input-base w-full"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading dividends...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-3">Ticker</th>
                  <th className="text-left py-2 px-3">Company</th>
                  <th className="text-left py-2 px-3 hidden md:table-cell">Exchange</th>
                  <th className="text-left py-2 px-3 hidden lg:table-cell">Country</th>
                  <th className="text-right py-2 px-3">Annual Dividend</th>
                  <th className="text-right py-2 px-3">Yield</th>
                  <th className="text-right py-2 px-3 hidden md:table-cell">Payouts</th>
                  <th className="text-right py-2 px-3 hidden lg:table-cell">Last Dividend</th>
                  <th className="text-right py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr
                    key={row.company_id}
                    onClick={() => navigate(`/companies/${row.company_id}`)}
                    className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-700">{row.ticker}</td>
                    <td className="py-2.5 px-3 text-slate-900 font-medium">{row.company_name}</td>
                    <td className="py-2.5 px-3 hidden md:table-cell text-slate-500">{row.exchange ?? '—'}</td>
                    <td className="py-2.5 px-3 hidden lg:table-cell text-slate-500">{row.country ?? '—'}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{row.annual_dividend === null ? '—' : currencyFmt.format(row.annual_dividend)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{row.dividend_yield === null ? '—' : `${row.dividend_yield.toFixed(2)}%`}</td>
                    <td className="py-2.5 px-3 text-right hidden md:table-cell">{row.payout_count}</td>
                    <td className="py-2.5 px-3 text-right hidden lg:table-cell">{row.last_dividend_date ? new Date(row.last_dividend_date).toLocaleDateString() : '—'}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${row.status === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                        {row.status.startsWith('error') ? 'error' : row.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 px-3 text-center text-slate-400">No rows match your filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
