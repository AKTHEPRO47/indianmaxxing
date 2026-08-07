import { useNavigate } from 'react-router-dom'
import type { Company } from '../types'
import { ClassificationBadge, InvestorSignalBadge } from './InvestorSignalBadge'
import { momentumArrow, momentumColor, esgScoreColor, fmt0, fmtPct } from '../utils/helpers'
import { Bookmark, BookmarkCheck, Heart, HeartOff, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { clsx } from 'clsx'
import CompanyLogo from './CompanyLogo'

interface Props {
  companies: Company[]
  caption?: string
  savedCompanyIds?: number[]
  favoriteCompanyIds?: number[]
  busyCompanyId?: number | null
  onToggleWatchlist?: (company: Company, saved: boolean) => void | Promise<void>
  onToggleFavorite?: (company: Company, saved: boolean) => void | Promise<void>
}

export default function WatchlistTable({
  companies,
  caption,
  savedCompanyIds = [],
  favoriteCompanyIds = [],
  busyCompanyId = null,
  onToggleWatchlist,
  onToggleFavorite,
}: Props) {
  const navigate = useNavigate()

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left py-2 px-3 section-label font-semibold">Company</th>
            <th className="text-right py-2 px-3 section-label font-semibold">ESG Score</th>
            <th className="text-right py-2 px-3 section-label font-semibold">Momentum</th>
            <th className="text-right py-2 px-3 section-label font-semibold hidden sm:table-cell">AI Adoption</th>
            <th className="text-right py-2 px-3 section-label font-semibold hidden md:table-cell">Controversy</th>
            <th className="text-right py-2 px-3 section-label font-semibold">Classification</th>
            <th className="text-right py-2 px-3 section-label font-semibold hidden lg:table-cell">Signal</th>
            <th className="text-right py-2 px-3 section-label font-semibold">Saved</th>
            <th className="text-right py-2 px-3 section-label font-semibold">Favorite</th>
          </tr>
        </thead>
        <tbody>
          {companies.map(c => {
            const s = c.latest_score
            const mom = s?.momentum_score ?? 0
            const MomIcon = mom > 5 ? TrendingUp : mom < -5 ? TrendingDown : Minus
            const saved = savedCompanyIds.includes(c.id)
            const favorited = favoriteCompanyIds.includes(c.id)
            const busy = busyCompanyId === c.id

            return (
              <tr
                key={c.id}
                onClick={() => navigate(`/companies/${c.id}`)}
                title={`Open report for ${c.name}`}
                className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors group"
              >
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2.5">
                    <CompanyLogo ticker={c.ticker} name={c.name} logoUrl={c.logo_url} size="sm" />
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">{c.name}</div>
                      <div className="text-xs text-slate-400 truncate">{c.industry} · {c.country}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-right">
                  {s ? (
                    <span className={clsx('font-bold tabular-nums', esgScoreColor(s.current_esg_score))}>
                      {fmt0(s.current_esg_score)}
                    </span>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="py-3 px-3 text-right">
                  {s ? (
                    <div className={clsx('flex items-center justify-end gap-1 font-semibold tabular-nums', momentumColor(s.momentum_score))}>
                      <MomIcon className="w-3.5 h-3.5" />
                      {fmtPct(s.momentum_score)}
                    </div>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="py-3 px-3 text-right hidden sm:table-cell">
                  {s ? (
                    <span className="font-medium text-purple-600 tabular-nums">{fmt0(s.ai_adoption_score)}</span>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="py-3 px-3 text-right hidden md:table-cell">
                  {s ? (
                    <span className={clsx(
                      'font-medium tabular-nums',
                      s.controversy_risk > 75 ? 'text-red-500' :
                      s.controversy_risk > 40 ? 'text-amber-600' : 'text-slate-600'
                    )}>
                      {fmt0(s.controversy_risk)}
                    </span>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="py-3 px-3 text-right">
                  {s ? <ClassificationBadge classification={s.classification} /> : <span className="text-slate-300">—</span>}
                </td>
                <td className="py-3 px-3 text-right hidden lg:table-cell">
                  {s ? <InvestorSignalBadge signal={s.investor_signal} /> : <span className="text-slate-300">—</span>}
                </td>
                <td className="py-3 px-3 text-right">
                  {onToggleWatchlist ? (
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        onToggleWatchlist(c, saved)
                      }}
                      disabled={busy}
                      className={clsx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border transition-colors', saved ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}
                    >
                      {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                      {busy ? 'Saving...' : saved ? 'Saved' : 'Save'}
                    </button>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="py-3 px-3 text-right">
                  {onToggleFavorite ? (
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        onToggleFavorite(c, favorited)
                      }}
                      disabled={busy}
                      className={clsx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border transition-colors', favorited ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}
                    >
                      {favorited ? <Heart className="h-3.5 w-3.5 fill-current" /> : <HeartOff className="h-3.5 w-3.5" />}
                      {busy ? 'Saving...' : favorited ? 'Saved' : 'Favorite'}
                    </button>
                  ) : <span className="text-slate-300">—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {caption && (
        <div className="px-3 py-2 text-[10px] text-slate-400 border-t border-slate-100">
          {caption}
        </div>
      )}
    </div>
  )
}
