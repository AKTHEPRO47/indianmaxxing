import type { Classification, InvestorSignal, Sentiment, SignalCategory } from '../types'

// ─── Classification helpers ────────────────────────────────────────────────────

export const classificationColor = (c: Classification | string): string => {
  switch (c) {
    case 'Future Leader':    return 'badge-green'
    case 'Hidden Winner':    return 'badge-blue'
    case 'Overrated Leader': return 'badge-amber'
    case 'Value Trap':       return 'badge-red'
    case 'Risk Alert':       return 'badge-red'
    default:                 return 'badge-slate'
  }
}

export const classificationIcon = (_c: Classification | string): string => {
  // Deprecated: use <ClassificationIcon> from InvestorSignalBadge.tsx instead.
  return ''
}

// ─── Signal helpers ────────────────────────────────────────────────────────────

export const signalColor = (s: InvestorSignal | string): string => {
  switch (s) {
    case 'Buy / Watchlist': return 'badge-green'
    case 'Hold':            return 'badge-amber'
    case 'Risk Alert':      return 'badge-red'
    case 'Avoid':           return 'badge-red'
    default:                return 'badge-slate'
  }
}

// ─── Momentum helpers ─────────────────────────────────────────────────────────

export const momentumColor = (score: number): string => {
  if (score > 20)  return 'text-emerald-600'
  if (score < -20) return 'text-red-500'
  return 'text-amber-500'
}

export const momentumBg = (score: number): string => {
  if (score > 20)  return 'bg-emerald-50 border-emerald-200 text-emerald-700'
  if (score < -20) return 'bg-red-50 border-red-200 text-red-700'
  return 'bg-amber-50 border-amber-200 text-amber-700'
}

export const momentumArrow = (score: number): string => {
  if (score > 5)  return '↑'
  if (score < -5) return '↓'
  return '→'
}

// ─── ESG score color ──────────────────────────────────────────────────────────

export const esgScoreColor = (score: number): string => {
  if (score >= 75) return 'text-emerald-600'
  if (score >= 55) return 'text-blue-600'
  if (score >= 40) return 'text-amber-600'
  return 'text-red-500'
}

export const esgScoreBg = (score: number): string => {
  if (score >= 75) return 'bg-emerald-500'
  if (score >= 55) return 'bg-blue-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

// ─── Category helpers ─────────────────────────────────────────────────────────

export const categoryColor = (cat: SignalCategory | string): string => {
  switch (cat) {
    case 'environmental': return 'badge-green'
    case 'social':        return 'badge-blue'
    case 'governance':    return 'badge-slate'
    case 'ai_adoption':   return 'bg-purple-50 text-purple-700 border border-purple-200 badge'
    case 'controversy':   return 'badge-red'
    default:              return 'badge-slate'
  }
}

export const categoryLabel = (cat: SignalCategory | string): string => {
  const map: Record<string, string> = {
    environmental: 'Environmental',
    social: 'Social',
    governance: 'Governance',
    ai_adoption: 'AI Adoption',
    controversy: 'Controversy',
    neutral: 'Neutral',
  }
  return map[cat] ?? cat
}

export const sentimentIcon = (s: Sentiment | string | null): string => {
  if (s === 'positive') return '▲'
  if (s === 'negative') return '▼'
  return '●'
}

export const sentimentColor = (s: Sentiment | string | null): string => {
  if (s === 'positive') return 'text-emerald-600'
  if (s === 'negative') return 'text-red-500'
  return 'text-slate-400'
}

// ─── Number formatting ────────────────────────────────────────────────────────

export const fmt1 = (n: number): string => n.toFixed(1)
export const fmt0 = (n: number): string => Math.round(n).toString()
export const fmtPct = (n: number): string => `${n > 0 ? '+' : ''}${n.toFixed(1)}`

export const confidenceLabel = (c: number): string => {
  if (c >= 0.85) return 'High'
  if (c >= 0.65) return 'Medium'
  if (c >= 0.45) return 'Low'
  return 'Very Low'
}

export const confidenceColor = (c: number): string => {
  if (c >= 0.85) return 'text-emerald-600'
  if (c >= 0.65) return 'text-blue-600'
  if (c >= 0.45) return 'text-amber-600'
  return 'text-red-500'
}

export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  } catch {
    return dateStr
  }
}
