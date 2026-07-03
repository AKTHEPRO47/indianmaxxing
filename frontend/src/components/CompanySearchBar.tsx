import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Mic, MicOff } from 'lucide-react'
import { searchCompanies } from '../api/client'
import type { Company } from '../types'
import { momentumArrow, momentumColor } from '../utils/helpers'
import CompanyLogo from './CompanyLogo'
import { ClassificationIcon } from './InvestorSignalBadge'
import { useSpeechToText } from '../hooks/useSpeechToText'

interface Props {
  size?: 'sm' | 'lg'
  placeholder?: string
}

export default function CompanySearchBar({ size = 'lg', placeholder = 'Search companies by name or ticker...' }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { supported: voiceSupported, listening, toggle } = useSpeechToText({
    onText: (text) => {
      setQuery(text)
      setOpen(true)
    },
  })

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchCompanies(query)
        setResults(data.slice(0, 8))
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 280)
    return () => clearTimeout(timer)
  }, [query])

  const select = (company: Company) => {
    setQuery('')
    setOpen(false)
    navigate(`/companies/${company.id}`)
  }

  const isLg = size === 'lg'

  return (
    <div ref={ref} className="relative w-full">
      <div className={`relative flex items-center bg-white border ${isLg ? 'border-slate-300 rounded-2xl shadow-md' : 'border-slate-200 rounded-xl shadow-card'} transition-shadow focus-within:shadow-card-hover focus-within:border-emerald-400`}>
        <Search className={`absolute left-4 text-slate-400 shrink-0 ${isLg ? 'w-5 h-5' : 'w-4 h-4'}`} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query && setOpen(true)}
          placeholder={placeholder}
          className={`w-full bg-transparent outline-none text-slate-900 placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500 ${isLg ? 'pl-12 pr-20 py-4 text-lg' : 'pl-10 pr-16 py-2.5 text-sm'}`}
        />
        {voiceSupported && (
          <button
            onClick={toggle}
            className={`absolute ${query ? 'right-10' : 'right-4'} text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300`}
            title={listening ? 'Stop voice input' : 'Start voice input'}
          >
            {listening ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4" />}
          </button>
        )}
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); setOpen(false) }} className="absolute right-4 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {loading && (
            <div className="px-4 py-3 text-sm text-slate-500 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              Searching...
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-500">No companies found</div>
          )}
          {results.map(c => (
            <button
              key={c.id}
              onClick={() => select(c)}
              title={`Open report for ${c.name}`}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-0"
            >
              <CompanyLogo ticker={c.ticker} name={c.name} logoUrl={c.logo_url} size="md" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 text-sm truncate">{c.name}</div>
                <div className="text-xs text-slate-500 truncate">{c.ticker} · {c.industry} · {c.country}</div>
              </div>
              {c.latest_score && (
                <div className="flex flex-col items-end shrink-0">
                  <div className="text-xs font-semibold text-slate-900">ESG {c.latest_score.current_esg_score.toFixed(0)}</div>
                  <div className={`text-xs font-medium ${momentumColor(c.latest_score.momentum_score)}`}>
                    {momentumArrow(c.latest_score.momentum_score)} {c.latest_score.momentum_score > 0 ? '+' : ''}{c.latest_score.momentum_score.toFixed(0)}
                  </div>
                </div>
              )}
              {c.latest_score && (
                <div className="text-slate-400">
                  <ClassificationIcon classification={c.latest_score.classification} className="w-4 h-4" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
