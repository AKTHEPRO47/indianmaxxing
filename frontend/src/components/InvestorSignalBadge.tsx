import { clsx } from 'clsx'
import { Gem, Rocket, TrendingDown, ShieldAlert, AlertOctagon, Eye } from 'lucide-react'
import type { Classification, InvestorSignal } from '../types'
import { classificationColor, signalColor } from '../utils/helpers'

/** Renders the appropriate Lucide icon for an ESG classification */
export function ClassificationIcon({
  classification,
  className = 'w-3.5 h-3.5',
}: {
  classification: Classification | string
  className?: string
}) {
  const props = { className, strokeWidth: 2.5 } as const
  switch (classification) {
    case 'Future Leader':    return <Rocket {...props} />
    case 'Hidden Winner':    return <Gem {...props} />
    case 'Value Trap':       return <TrendingDown {...props} />
    case 'Overrated Leader': return <ShieldAlert {...props} />
    case 'Risk Alert':       return <AlertOctagon {...props} />
    default:                 return <Eye {...props} />
  }
}

interface ClassBadgeProps {
  classification: Classification | string
  showIcon?: boolean
}

export function ClassificationBadge({ classification, showIcon = true }: ClassBadgeProps) {
  return (
    <span className={clsx('badge font-semibold', classificationColor(classification as Classification))}>
      {showIcon && <ClassificationIcon classification={classification} />}
      {classification}
    </span>
  )
}

interface SignalBadgeProps {
  signal: InvestorSignal | string
}

export function InvestorSignalBadge({ signal }: SignalBadgeProps) {
  return (
    <span className={clsx('badge font-bold text-xs tracking-wide', signalColor(signal as InvestorSignal))}>
      {signal}
    </span>
  )
}

interface PillProps {
  label: string
  color?: 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'purple'
}

export function Pill({ label, color = 'slate' }: PillProps) {
  const map: Record<string, string> = {
    green:  'badge-green',
    red:    'badge-red',
    amber:  'badge-amber',
    blue:   'badge-blue',
    slate:  'badge-slate',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200 badge',
  }
  return <span className={clsx('badge', map[color])}>{label}</span>
}

/** Animated pulsing dot shown when controversy risk is high */
export function ControversyPulse({ risk, className = '' }: { risk: number | null | undefined; className?: string }) {
  if (risk == null || risk < 60) return null
  const intensity = risk >= 80 ? 'bg-red-500' : 'bg-orange-400'
  return (
    <span className={clsx('relative inline-flex h-3 w-3', className)} title={`Controversy risk: ${risk}`}>
      <span className={clsx('animate-ping absolute inline-flex h-full w-full rounded-full opacity-60', intensity)} />
      <span className={clsx('relative inline-flex rounded-full h-3 w-3', intensity)} />
    </span>
  )
}
