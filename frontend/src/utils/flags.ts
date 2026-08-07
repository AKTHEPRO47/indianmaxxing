export const countryFlagEmoji = (country: string | null | undefined) => {
  const normalized = (country ?? '').trim().toLowerCase()
  if (normalized === 'singapore') return '🇸🇬'
  if (normalized === 'united states' || normalized === 'usa' || normalized === 'us') return '🇺🇸'
  if (normalized === 'hong kong') return '🇭🇰'
  return '🌐'
}