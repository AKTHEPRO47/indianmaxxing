import { useState } from 'react'
import { X, ExternalLink, FileText, Globe, ChevronDown, ChevronUp } from 'lucide-react'
import type { Evidence } from '../types'
import { categoryColor, categoryLabel, confidenceColor, confidenceLabel, formatDate } from '../utils/helpers'
import { buildSearchLink } from '../utils/links'
import { clsx } from 'clsx'

interface Props {
  evidences: Evidence[]
  onClose: () => void
  title?: string
}

export default function EvidenceDrawer({ evidences, onClose, title = 'Evidence Panel' }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const categories = ['all', ...Array.from(new Set(evidences.map(e => e.category ?? 'other')))]
  const filtered = activeCategory === 'all'
    ? evidences
    : evidences.filter(e => e.category === activeCategory)

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{evidences.length} evidence items · AI-extracted</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Category filter */}
      <div className="px-5 py-3 border-b border-slate-100 flex gap-2 overflow-x-auto shrink-0">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={clsx(
              'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              activeCategory === cat
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {cat === 'all' ? 'All' : categoryLabel(cat)}
          </button>
        ))}
      </div>

      {/* Evidence list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="p-5 text-sm text-slate-400 text-center mt-8">No evidence in this category</div>
        )}
        {filtered.map((ev, i) => (
          <div key={ev.id} className="border-b border-slate-100 last:border-0">
            <button
              onClick={() => setExpanded(expanded === ev.id ? null : ev.id)}
              className="w-full px-5 py-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="mt-0.5 shrink-0">
                {ev.source_type === 'pdf' ? (
                  <FileText className="w-4 h-4 text-slate-400" />
                ) : (
                  <Globe className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {ev.category && (
                    <span className={clsx('badge text-[10px]', categoryColor(ev.category))}>
                      {categoryLabel(ev.category)}
                    </span>
                  )}
                  {ev.page_number && (
                    <span className="text-[10px] text-slate-400">p.{ev.page_number}</span>
                  )}
                  <span className={clsx('text-[10px] font-semibold', confidenceColor(ev.confidence_score))}>
                    {confidenceLabel(ev.confidence_score)} confidence
                  </span>
                </div>
                <p className="text-xs text-slate-700 mt-1 line-clamp-2 leading-relaxed">
                  "{ev.evidence_text}"
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                  <a
                    href={ev.url ?? buildSearchLink(ev.source_name ?? ev.evidence_text.slice(0, 80))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-slate-700 hover:underline"
                  >
                    {ev.source_name ?? ev.source_type}
                  </a>
                  {ev.source_date && <><span>·</span><span>{formatDate(ev.source_date)}</span></>}
                </div>
              </div>
              <span className="shrink-0 text-slate-300 mt-1">
                {expanded === ev.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </span>
            </button>

            {expanded === ev.id && (
              <div className="px-5 pb-4 ml-7">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs text-slate-700 leading-relaxed">"{ev.evidence_text}"</p>
                  <a href={ev.url ?? buildSearchLink(ev.source_name ?? ev.evidence_text.slice(0, 80))} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-[10px] text-blue-600 hover:underline">
                    <ExternalLink className="w-3 h-3" />
                    View source
                  </a>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
