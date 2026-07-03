import { useRef } from 'react'

interface Props {
  children: React.ReactNode
  className?: string
  /** Max tilt angle in degrees (default 7) */
  intensity?: number
  /** Scale on hover (default 1.02) */
  scale?: number
  /** Disable tilt (renders plain div) */
  disabled?: boolean
}

/**
 * Wraps children in a div that tilts in 3D following the mouse.
 * Uses CSS perspective transforms — no dependencies.
 */
export default function Tilt3D({
  children,
  className = '',
  intensity = 7,
  scale = 1.02,
  disabled = false,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  if (disabled) {
    return <div className={className}>{children}</div>
  }

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * intensity * 2
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -intensity * 2
    el.style.transform = `perspective(700px) rotateX(${y}deg) rotateY(${x}deg) scale3d(${scale},${scale},${scale})`
    el.style.transition = 'transform 0.08s linear'
  }

  const handleLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)'
    el.style.transition = 'transform 0.55s cubic-bezier(0.23, 1, 0.32, 1)'
  }

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
    >
      {children}
    </div>
  )
}
