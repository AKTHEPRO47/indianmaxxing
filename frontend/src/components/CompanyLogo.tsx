import { useState } from 'react'
import { getLogoFallbackUrls, getLogoUrl } from '../utils/logos'

interface Props {
  ticker?: string | null
  name: string
  logoUrl?: string | null  // from DB (overrides Clearbit)
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  rounded?: 'lg' | 'xl' | 'full'
}

const SIZES = {
  xs: { wrapper: 'w-6 h-6',   text: 'text-[7px]',  padding: 'p-0.5' },
  sm: { wrapper: 'w-8 h-8',   text: 'text-[9px]',  padding: 'p-0.5' },
  md: { wrapper: 'w-10 h-10', text: 'text-[10px]', padding: 'p-1'   },
  lg: { wrapper: 'w-14 h-14', text: 'text-xs',     padding: 'p-1.5' },
  xl: { wrapper: 'w-20 h-20', text: 'text-sm',     padding: 'p-2'   },
}

const GRADIENTS = [
  'from-blue-500 to-cyan-400',
  'from-emerald-500 to-teal-400',
  'from-purple-500 to-pink-400',
  'from-amber-500 to-orange-400',
  'from-rose-500 to-red-400',
  'from-indigo-500 to-violet-400',
  'from-sky-500 to-blue-400',
]

function hashGradient(str: string): string {
  let h = 0
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) & 0xfffff
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]
}

export default function CompanyLogo({
  ticker,
  name,
  logoUrl,
  size = 'md',
  className = '',
  rounded = 'xl',
}: Props) {
  const [imgError, setImgError] = useState(false)
  const src = getLogoUrl(ticker, logoUrl)
  const initials = (ticker ?? name).slice(0, ticker && ticker.length <= 4 ? ticker.length : 3).toUpperCase()
  const { wrapper, text, padding } = SIZES[size]
  const roundedClass = `rounded-${rounded}`
  const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=0f172a&color=ffffff&size=128&bold=true&format=svg`
  const fallbackSources = [src, ...getLogoFallbackUrls(ticker)].filter(Boolean) as string[]
  const [sourceIndex, setSourceIndex] = useState(0)

  if (!src) {
    return (
      <div className={`${wrapper} ${roundedClass} bg-white border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden shadow-sm ${className}`}>
        <img
          src={avatarFallback}
          alt={`${name} logo`}
          className={`w-full h-full object-contain ${padding}`}
          loading="lazy"
          decoding="async"
        />
      </div>
    )
  }

  return (
    <div
      className={`${wrapper} ${roundedClass} bg-white border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden shadow-sm ${className}`}
    >
      <img
        src={imgError ? avatarFallback : (fallbackSources[sourceIndex] ?? avatarFallback)}
        alt={`${name} logo`}
        className={`w-full h-full object-contain ${padding}`}
        onError={() => {
          if (sourceIndex < fallbackSources.length - 1) {
            setSourceIndex(i => i + 1)
            return
          }
          setImgError(true)
        }}
        loading="lazy"
        decoding="async"
      />
    </div>
  )
}
