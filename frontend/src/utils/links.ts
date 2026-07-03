const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const buildSearchLink = (query: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(query)}`

export const buildNewsLink = (query: string) =>
  `https://news.google.com/search?q=${encodeURIComponent(query)}`

export const buildPeRatioLink = (ticker?: string | null, name?: string | null) => {
  if (!ticker) return buildSearchLink(`${name ?? ''} P/E ratio`.trim())
  const cleanedTicker = ticker.replace(/\./g, '-').toLowerCase()
  const cleanedName = slugify(name ?? ticker)
  return `https://www.macrotrends.net/stocks/charts/${cleanedTicker}/${cleanedName}/pe-ratio`
}

export const downloadTextFile = (fileName: string, content: string, mimeType = 'text/plain;charset=utf-8') => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}