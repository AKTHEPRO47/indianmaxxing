import { ReactNode } from 'react'
import { clsx } from 'clsx'

interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  badge?: ReactNode
  color?: 'green' | 'red' | 'amber' | 'blue' | 'default'
  icon?: ReactNode
  bar?: number // 0-100 for a progress bar
  tooltip?: string
  size?: 'sm' | 'md'
}

const colorMap = {
  green:   { value: 'text-emerald-600', bar: 'bg-emerald-500' },
  red:     { value: 'text-red-500',     bar: 'bg-red-500' },
  amber:   { value: 'text-amber-600',   bar: 'bg-amber-500' },
  blue:    { value: 'text-blue-600',    bar: 'bg-blue-500' },
  default: { value: 'text-slate-900',   bar: 'bg-slate-400' },
}

export default function MetricCard({
  label, value, sub, badge, color = 'default', icon, bar, tooltip, size = 'md',
}: MetricCardProps) {
  const colors = colorMap[color]

  return (
    <div
      className={clsx('card p-4 flex flex-col gap-2', size === 'sm' && 'p-3')}
      title={tooltip}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
          <span className="section-label truncate">{label}</span>
        </div>
        {badge}
      </div>

      <div className={clsx('font-bold leading-tight', size === 'md' ? 'text-2xl' : 'text-xl', colors.value)}>
        {value}
      </div>

      {bar !== undefined && (
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={clsx('h-full rounded-full transition-all', colors.bar)}
            style={{ width: `${Math.max(0, Math.min(100, bar))}%` }}
          />
        </div>
      )}

      {sub && (
        <div className="text-xs text-slate-500 leading-tight">{sub}</div>
      )}
    </div>
  )
}
