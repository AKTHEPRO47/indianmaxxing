import { useEffect, useState } from 'react'

interface Props {
  /** 0–100 value. For momentum pass clamped value (0–100), use displayValue for true ±100 label */
  value: number
  /** Override the displayed number (e.g. pass raw momentum score of -32) */
  displayValue?: number
  /** Max for ring fill — default 100 */
  max?: number
  size?: number
  strokeWidth?: number
  /** Explicit hex color; auto-derived from value if omitted */
  color?: string
  trackColor?: string
  label?: string
  subLabel?: string
  animate?: boolean
  /** Invert auto-color logic (lower = better, e.g. controversy risk) */
  invertColors?: boolean
  prefix?: string
}

function autoColor(value: number, invert: boolean): string {
  const v = invert ? 100 - value : value
  if (v >= 75) return '#10b981' // emerald-500
  if (v >= 55) return '#3b82f6' // blue-500
  if (v >= 40) return '#f59e0b' // amber-500
  return '#ef4444'              // red-500
}

export default function ScoreRing({
  value,
  displayValue,
  max = 100,
  size = 96,
  strokeWidth = 7,
  color,
  trackColor = '#f1f5f9',
  label,
  subLabel,
  animate = true,
  invertColors = false,
  prefix = '',
}: Props) {
  const [animated, setAnimated] = useState(animate ? 0 : value)

  useEffect(() => {
    if (!animate) { setAnimated(value); return }
    setAnimated(0)
    const id = setTimeout(() => setAnimated(value), 80)
    return () => clearTimeout(id)
  }, [value, animate])

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const fill = Math.max(0, Math.min(max, animated))
  const dashOffset = circumference - (fill / max) * circumference
  const ringColor = color ?? autoColor(value, invertColors)
  const shown = displayValue !== undefined ? displayValue : Math.round(animated)

  return (
    <div className="flex flex-col items-center gap-1.5 select-none">
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Soft glow behind ring */}
        <div
          className="absolute rounded-full opacity-[0.12] blur-xl pointer-events-none"
          style={{ inset: 4, background: ringColor }}
        />
        <svg
          width={size}
          height={size}
          className="-rotate-90"
          style={{ position: 'relative', zIndex: 1 }}
        >
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={trackColor} strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{
              transition: animate
                ? 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.3, 0.64, 1)'
                : 'none',
            }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 2 }}>
          <span
            className="font-bold tabular-nums leading-none"
            style={{ color: ringColor, fontSize: size * 0.23 }}
          >
            {prefix}
            {shown > 0 && displayValue !== undefined && '+'}
            {shown}
          </span>
          {subLabel && (
            <span
              className="text-slate-500 leading-tight mt-0.5 text-center px-1"
              style={{ fontSize: Math.max(8, size * 0.10) }}
            >
              {subLabel}
            </span>
          )}
        </div>
      </div>
      {label && (
        <span className="text-xs font-semibold text-slate-500 text-center leading-tight">
          {label}
        </span>
      )}
    </div>
  )
}
