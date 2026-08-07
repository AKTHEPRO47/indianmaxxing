import { useEffect, useState } from 'react'
import { ExternalLink, Newspaper, RefreshCw, ShieldAlert } from 'lucide-react'
import { getNews, refreshNews } from '../api/client'
import type { NewsSignal, SignalCategory } from '../types'
import CompanyLogo from '../components/CompanyLogo'
import { buildNewsLink } from '../utils/links'
import { clsx } from 'clsx'

const FILTERS: Array<{ label: string; value: '' | SignalCategory }> = [
  { label: 'All coverage', value: '' },
  { label: 'Controversy', value: 'controversy' },
  { label: 'Environmental', value: 'environmental' },
  { label: 'Social', value: 'social' },
  { label: 'Governance', value: 'governance' },
  { label: 'AI adoption', value: 'ai_adoption' },
]

export default function NewsPage() {
  const [items, setItems] = useState<NewsSignal[]>([])
  const [filter, setFilter] = useState<'' | SignalCategory>('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const load = async () => {
    try {
      setItems(await getNews(80, filter || undefined))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    void load()
    const interval = window.setInterval(() => void load(), 60_000)
    return () => window.clearInterval(interval)
  }, [filter])

  const handleRefresh = async () => {
    setRefreshing(true)
    setMessage(null)
    try {
      const result = await refreshNews()
      setMessage(result.skipped ? 'A refresh is already in progress.' : `${result.new_signals} new headlines added from ${result.refreshed_companies} companies.`)
      await load()
    } catch {
      setMessage('Could not refresh the news feed. Existing coverage remains available.')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="mx-auto max-w-screen-xl space-y-6 px-4 py-8 sm:px-6">
      <section className="border-b-4 border-slate-900 bg-white px-5 py-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center bg-red-700 text-white"><Newspaper className="h-6 w-6" /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-700">Live intelligence feed</p>
              <h1 className="text-2xl font-bold text-slate-950">News & Alerts</h1>
              <p className="mt-1 text-sm text-slate-600">Fresh company coverage is ingested every 15 minutes. This view checks for updates every minute.</p>
            </div>
          </div>
          <button onClick={() => void handleRefresh()} disabled={refreshing} className="btn-primary shrink-0">
            <RefreshCw className={clsx('h-4 w-4', refreshing && 'animate-spin')} />
            {refreshing ? 'Refreshing' : 'Refresh feed'}
          </button>
        </div>
        {message && <p className="mt-4 text-sm text-slate-600">{message}</p>}
      </section>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(option => <button key={option.label} onClick={() => setFilter(option.value)} className={clsx('rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors', filter === option.value ? 'border-red-700 bg-red-700 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400')}>{option.label}</button>)}
      </div>

      {loading ? <div className="py-16 text-center text-sm text-slate-500">Loading market coverage...</div> : (
        <div className="grid gap-3">
          {items.map(item => {
            const highRisk = item.category === 'controversy' || item.severity >= 5
            return <article key={item.id} className="border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex gap-3">
                <CompanyLogo ticker={item.company.ticker} name={item.company.name} logoUrl={item.company.logo_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-500">{item.company.name} {item.company.ticker ? `(${item.company.ticker})` : ''}</p>
                    <span className={clsx('inline-flex items-center gap-1 text-xs font-semibold', highRisk ? 'text-red-700' : 'text-slate-500')}>
                      {highRisk && <ShieldAlert className="h-3.5 w-3.5" />}{item.category.replace('_', ' ')}
                    </span>
                  </div>
                  <h2 className="mt-1 text-base font-semibold text-slate-950">{item.title}</h2>
                  {item.explanation && <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.explanation}</p>}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>{item.source ?? 'Market feed'} · {item.date ? new Date(item.date).toLocaleString() : 'Recent'}</span>
                    <a href={buildNewsLink(`${item.company.name} ${item.title}`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-red-700 hover:text-red-800">Read coverage <ExternalLink className="h-3.5 w-3.5" /></a>
                  </div>
                </div>
              </div>
            </article>
          })}
          {items.length === 0 && <div className="border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">No headlines match this filter yet.</div>}
        </div>
      )}
    </div>
  )
}