import { ArrowRight, Newspaper, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Signal } from '../types'
import { buildNewsLink } from '../utils/links'

interface Props {
  signals: Signal[]
}

type DigestItem = {
  key: string
  signals: Signal[]
}

export default function NewsCombiner({ signals }: Props) {
  const navigate = useNavigate()

  const digest = signals.reduce<Map<string, DigestItem>>((acc, signal) => {
    const key = signal.source ?? signal.category ?? 'Market feed'
    const current = acc.get(key)
    if (current) {
      current.signals.push(signal)
    } else {
      acc.set(key, { key, signals: [signal] })
    }
    return acc
  }, new Map())

  const combined = [...digest.values()]
    .map(item => ({
      ...item,
      signals: [...item.signals].sort((a, b) => {
        const severityDelta = (b.severity ?? 0) - (a.severity ?? 0)
        if (severityDelta !== 0) return severityDelta
        return new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()
      }),
    }))
    .sort((a, b) => {
      const aDate = new Date(a.signals[0]?.date ?? 0).getTime()
      const bDate = new Date(b.signals[0]?.date ?? 0).getTime()
      return bDate - aDate
    })
    .slice(0, 4)

  if (combined.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-400">
        No combined news available yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {combined.map(item => {
        const latest = item.signals[0]
        const query = `${item.key} ${latest?.title ?? 'news'}`
        return (
          <article
            key={item.key}
            className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                <Newspaper className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{item.key}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                      <span>{item.signals.length} combined updates</span>
                      <span className="inline-flex h-1 w-1 rounded-full bg-slate-300" />
                      <span>{latest?.category ?? 'General coverage'}</span>
                    </div>
                  </div>
                  <Sparkles className="h-4 w-4 shrink-0 text-blue-500" />
                </div>

                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {latest?.title ?? 'Latest update'}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a
                    href={buildNewsLink(query)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100"
                  >
                    <Newspaper className="h-3.5 w-3.5" />
                    Open combined news
                  </a>
                  <button
                    type="button"
                    onClick={() => latest && navigate(`/companies/${latest.company_id}`)}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    View company
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}