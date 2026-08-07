import { useState, useEffect } from 'react'
import { X, Search, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { clsx } from 'clsx'
import type { Company, ScoreSnapshot } from '../types'
import { searchCompanies, getScoreHistory } from '../api/client'
import { esgScoreColor, momentumColor } from '../utils/helpers'

interface Props {
  baseCompany: Company
  baseScore: ScoreSnapshot | null
  open: boolean
  onClose: () => void
}

interface Metric {
  label: string
  key: keyof ScoreSnapshot
  format: (v: number | null) => string
  colorFn?: (v: number) => string
  higherBetter?: boolean
}

const METRICS: Metric[] = [
  { label: 'ESG Score',      key: 'current_esg_score',  format: v => v != null ? v.toFixed(1) : '—', colorFn: esgScoreColor, higherBetter: true },
  { label: 'Momentum',       key: 'momentum_score',     format: v => v != null ? (v > 0 ? '+' : '') + v.toFixed(1) : '—', colorFn: momentumColor, higherBetter: true },
  { label: 'AI Adoption',    key: 'ai_adoption_score',  format: v => v != null ? v.toFixed(1) : '—', higherBetter: true },
  { label: 'Controversy',    key: 'controversy_risk',   format: v => v != null ? v.toFixed(1) : '—', higherBetter: false },
  { label: 'Confidence',     key: 'confidence_score',   format: v => v != null ? v.toFixed(1) : '—', higherBetter: true },
  { label: 'Environmental',  key: 'environmental_score',format: v => v != null ? v.toFixed(1) : '—', higherBetter: true },
  { label: 'Social',         key: 'social_score',       format: v => v != null ? v.toFixed(1) : '—', higherBetter: true },
  { label: 'Governance',     key: 'governance_score',   format: v => v != null ? v.toFixed(1) : '—', higherBetter: true },
]

function DeltaIcon({ delta, higherBetter = true }: { delta: number | null; higherBetter?: boolean }) {
  if (delta == null || Math.abs(delta) < 0.5) return <Minus className="h-3 w-3 text-slate-400" />
  const positive = higherBetter ? delta > 0 : delta < 0
  if (positive) return <TrendingUp className="h-3 w-3 text-emerald-500" />
  return <TrendingDown className="h-3 w-3 text-red-500" />
}

export default function CompanyComparisonPanel({ baseCompany, baseScore, open, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Company[]>([])
  const [peer, setPeer] = useState<Company | null>(null)
  const [peerScore, setPeerScore] = useState<ScoreSnapshot | null>(null)
  const [loadingPeer, setLoadingPeer] = useState(false)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      try {
        const list = await searchCompanies(query)
        setResults(list.filter(c => c.id !== baseCompany.id).slice(0, 6))
      } catch { setResults([]) }
    }, 300)
    return () => clearTimeout(t)
  }, [query, baseCompany.id])

  const selectPeer = async (company: Company) => {
    setPeer(company)
    setQuery('')
    setResults([])
    setLoadingPeer(true)
    try {
      const snapshots = await getScoreHistory(company.id)
      const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null
      setPeerScore(latest)
    } catch { setPeerScore(null) }
    finally { setLoadingPeer(false) }
  }

  if (!open) return null

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="section-label mb-1">Side-by-side</div>
          <h2 className="font-semibold text-slate-900 text-sm">Compare companies</h2>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 transition-colors">
          <X className="h-4 w-4 text-slate-500" />
        </button>
      </div>

      {!peer ? (
        <div className="relative">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <input
              className="flex-1 text-sm outline-none bg-transparent placeholder:text-slate-400"
              placeholder="Search a company to compare..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          {results.length > 0 && (
            <div className="absolute top-full mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl z-10 overflow-hidden">
              {results.map(c => (
                <button key={c.id} onClick={() => void selectPeer(c)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left transition-colors">
                  <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">{c.ticker?.slice(0, 2)}</div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{c.name}</div>
                    <div className="text-xs text-slate-400">{c.ticker} · {c.industry ?? ''}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 text-center">
            <div className="rounded-xl bg-slate-900 text-white px-3 py-2">
              <div className="font-bold text-sm">{baseCompany.name}</div>
              <div className="text-xs text-slate-400">{baseCompany.ticker}</div>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">vs</span>
            </div>
            <div className="rounded-xl bg-indigo-600 text-white px-3 py-2 relative">
              <div className="font-bold text-sm">{peer.name}</div>
              <div className="text-xs text-indigo-200">{peer.ticker}</div>
              <button onClick={() => { setPeer(null); setPeerScore(null) }}
                className="absolute top-1 right-1 p-0.5 rounded hover:bg-indigo-500 transition-colors">
                <X className="h-3 w-3 text-indigo-200" />
              </button>
            </div>
          </div>

          {/* Metric rows */}
          {loadingPeer ? (
            <div className="text-center text-sm text-slate-400 py-4">Loading comparison...</div>
          ) : (
            <div className="space-y-1.5">
              {METRICS.map(m => {
                const bVal = baseScore ? (baseScore[m.key] as number | null) : null
                const pVal = peerScore ? (peerScore[m.key] as number | null) : null
                const delta = bVal != null && pVal != null ? bVal - pVal : null
                const baseWins = delta != null && (m.higherBetter !== false ? delta > 0.5 : delta < -0.5)
                const peerWins = delta != null && (m.higherBetter !== false ? delta < -0.5 : delta > 0.5)

                return (
                  <div key={m.key as string} className="grid grid-cols-[1fr_auto_1fr] gap-1 items-center">
                    <div className={clsx('rounded-lg px-3 py-2 text-center border',
                      baseWins ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-slate-50')}>
                      <div className={clsx('text-sm font-bold', bVal != null && m.colorFn ? m.colorFn(bVal) : 'text-slate-900')}>
                        {m.format(bVal)}
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 px-1">
                      <div className="text-[9px] text-slate-400 text-center leading-none">{m.label}</div>
                      <DeltaIcon delta={delta} higherBetter={m.higherBetter} />
                    </div>
                    <div className={clsx('rounded-lg px-3 py-2 text-center border',
                      peerWins ? 'border-indigo-200 bg-indigo-50' : 'border-slate-100 bg-slate-50')}>
                      <div className={clsx('text-sm font-bold', pVal != null && m.colorFn ? m.colorFn(pVal) : 'text-slate-900')}>
                        {m.format(pVal)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Summary verdict */}
          {!loadingPeer && baseScore && peerScore && (() => {
            const basePoints = METRICS.filter(m => {
              const b = baseScore[m.key] as number | null
              const p = peerScore[m.key] as number | null
              if (b == null || p == null) return false
              return m.higherBetter !== false ? b > p : b < p
            }).length
            const peerPoints = METRICS.length - basePoints
            const winner = basePoints > peerPoints ? baseCompany.name : peer.name
            const margin = Math.abs(basePoints - peerPoints)
            return (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                <span className="text-xs font-semibold text-slate-900">{winner}</span>
                <span className="text-xs text-slate-500"> wins {basePoints > peerPoints ? basePoints : peerPoints}/{METRICS.length} metrics</span>
                {margin <= 1 && <span className="ml-2 badge badge-amber text-[10px]">Very close!</span>}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
