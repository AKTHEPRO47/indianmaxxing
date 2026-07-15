/** Maps tickers to their primary web domain for Clearbit Logo API lookups */
export const TICKER_DOMAINS: Record<string, string> = {
  // Tech Giants
  MSFT:  'microsoft.com',
  AAPL:  'apple.com',
  GOOGL: 'google.com',
  GOOG:  'google.com',
  META:  'meta.com',
  AMZN:  'amazon.com',
  NVDA:  'nvidia.com',
  ORCL:  'oracle.com',
  IBM:   'ibm.com',
  INTC:  'intel.com',
  AMD:   'amd.com',
  ADBE:  'adobe.com',
  CRM:   'salesforce.com',
  NFLX:  'netflix.com',
  CSCO:  'cisco.com',
  SAP:   'sap.com',
  AVGO:  'broadcom.com',
  ASML:  'asml.com',
  BABA:  'alibaba.com',
  TSM:   'tsmc.com',
  SONY:  'sony.com',
  MU:    'micron.com',
  SNDK:  'sandisk.com',
  NIO:   'nio.com',
  TMC:   'metals.co',
  SPCX:  'simplify.us',
  INFY:  'infosys.com',
  RIO:   'riotinto.com',
  BHP:   'bhp.com',
  'Z74.SI': 'singtel.com',
  // Automotive / EV
  TSLA:  'tesla.com',
  TM:    'toyota.com',
  BYDDF: 'byd.com',
  VWAGY: 'volkswagen.com',
  F:     'ford.com',
  GM:    'gm.com',
  HMC:   'honda.com',
  STLA:  'stellantis.com',
  BMWYY: 'bmwgroup.com',
  // Energy
  SHEL:  'shell.com',
  XOM:   'exxonmobil.com',
  BP:    'bp.com',
  CVX:   'chevron.com',
  TTE:   'totalenergies.com',
  ENB:   'enbridge.com',
  // Consumer / Food / Retail
  NSRGY: 'nestle.com',
  UL:    'unilever.com',
  PG:    'pg.com',
  KO:    'coca-cola.com',
  PEP:   'pepsico.com',
  WMT:   'walmart.com',
  NKE:   'nike.com',
  SBUX:  'starbucks.com',
  MCD:   'mcdonalds.com',
  // Finance
  JPM:   'jpmorganchase.com',
  GS:    'goldmansachs.com',
  BAC:   'bankofamerica.com',
  MS:    'morganstanley.com',
  V:     'visa.com',
  MA:    'mastercard.com',
  AXP:   'americanexpress.com',
  // Industrial / Healthcare
  SIEGY: 'siemens.com',
  JNJ:   'jnj.com',
  PFE:   'pfizer.com',
  ABBV:  'abbvie.com',
  UNH:   'unitedhealthgroup.com',
}

/**
 * Returns a Clearbit Logo URL for a given ticker.
 * Falls back to null if the domain is unknown.
 * Safe to use as <img src> — no CORS issues for image elements.
 */
export const getLogoUrl = (ticker?: string | null, dbLogoUrl?: string | null): string | null => {
  if (dbLogoUrl) return dbLogoUrl
  if (!ticker) return null
  const domain = TICKER_DOMAINS[ticker.toUpperCase()]
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null
}

export const getLogoFallbackUrls = (ticker?: string | null): string[] => {
  if (!ticker) return []
  const domain = TICKER_DOMAINS[ticker.toUpperCase()]
  if (!domain) return []
  return [
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://logo.clearbit.com/${domain}?size=128`,
  ]
}
