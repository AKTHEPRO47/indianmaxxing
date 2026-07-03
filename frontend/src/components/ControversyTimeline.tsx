import { clsx } from 'clsx'
import type { Signal } from '../types'
import { categoryColor, categoryLabel, sentimentColor, sentimentIcon, formatDate } from '../utils/helpers'
import { AlertTriangle, Info } from 'lucide-react'
import { buildSearchLink } from '../utils/links'

interface Props {
  signals: Signal[]
  limit?: number
  showCompany?: boolean
}

export default function ControversyTimeline({ signals, limit = 10, showCompany = false }: Props) {
  const sorted = [...signals]
    .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
    .slice(0, limit)

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
        <Info className="w-5 h-5" />
        <span className="text-sm">No signals found</span>
      </div>
    )
  }

  return (
    <div className="space-y-0 relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-2 bottom-2 w-px bg-slate-100" />

      {sorted.map((sig) => (
        <div key={sig.id} className="flex gap-3 pb-4 relative">
          {/* Timeline dot */}
          <div className={clsx(
            'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 z-10',
            sig.category === 'controversy' ? 'bg-red-50' :
            sig.sentiment === 'positive' ? 'bg-emerald-50' : 'bg-slate-100'
          )}>
            {sig.category === 'controversy' ? (
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            ) : (
              <span className={clsx('text-xs font-bold', sentimentColor(sig.sentiment))}>
                {sentimentIcon(sig.sentiment)}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-slate-800 font-medium leading-snug">{sig.title}</p>
              <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                <span className={clsx('badge text-[10px]', categoryColor(sig.category))}>
                  {categoryLabel(sig.category)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
              <a
                href={buildSearchLink(sig.source ?? sig.title)}
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-700 hover:underline"
              >
                {sig.source ?? 'Source'}
              </a>
              <span>·</span>
              <span>{formatDate(sig.date)}</span>
              {sig.severity > 0 && (
                <>
                  <span>·</span>
                  <span className={clsx('font-medium', sig.severity >= 7 ? 'text-red-500' : sig.severity >= 4 ? 'text-amber-500' : 'text-slate-400')}>
                    Severity {sig.severity.toFixed(0)}/10
                  </span>
                </>
              )}
            </div>

            {sig.explanation && (
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                {sig.explanation}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
