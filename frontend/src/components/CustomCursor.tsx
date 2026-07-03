import { useEffect, useState } from 'react'

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      setPosition({ x: event.clientX, y: event.clientY })
      setVisible(true)
    }

    const onLeave = () => setVisible(false)

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerleave', onLeave)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] hidden lg:block" aria-hidden="true">
      <div
        className="absolute h-3 w-3 rounded-full bg-emerald-500/80 shadow-[0_0_24px_rgba(16,185,129,0.45)] transition-transform duration-100 ease-out"
        style={{ transform: `translate3d(${position.x - 6}px, ${position.y - 6}px, 0) scale(${visible ? 1 : 0})` }}
      />
      <div
        className="absolute h-10 w-10 rounded-full border border-red-400/40 bg-red-400/10 backdrop-blur-[1px] transition-transform duration-200 ease-out"
        style={{ transform: `translate3d(${position.x - 20}px, ${position.y - 20}px, 0) scale(${visible ? 1 : 0.85})` }}
      />
    </div>
  )
}