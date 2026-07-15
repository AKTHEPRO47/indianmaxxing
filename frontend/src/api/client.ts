import axios from 'axios'
import { COMPANY_CATALOG } from '../data/companyCatalog'
import type {
  Company, ScoreSnapshot, Evidence, Signal, Report,
  DashboardData, MatrixData, CopilotResponse, StockData, StockRange,
} from '../types'

const BASE = '/api'

const http = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

const nowIso = () => new Date().toISOString()

const hashString = (value: string) => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 100000
  }
  return Math.abs(hash)
}

const companyIdMap = new Map(COMPANY_CATALOG.map((item, index) => [item.ticker.toUpperCase(), index + 1]))

const buildScore = (ticker: string, seed = 0): ScoreSnapshot => {
  const hash = hashString(`${ticker}-${seed}`)
  const current_esg_score = 45 + (hash % 40)
  const momentum_score = ((hash >> 3) % 61) - 30
  const ai_adoption_score = 35 + ((hash >> 5) % 55)
  const controversy_risk = 10 + ((hash >> 7) % 70)

  let classification: ScoreSnapshot['classification'] = 'Watchlist'
  let investor_signal: ScoreSnapshot['investor_signal'] = 'Hold'
  if (controversy_risk > 75) {
    classification = 'Risk Alert'
    investor_signal = 'Risk Alert'
  } else if (current_esg_score < 60 && momentum_score > 20) {
    classification = 'Hidden Winner'
    investor_signal = 'Buy / Watchlist'
  } else if (current_esg_score >= 60 && momentum_score > 20) {
    classification = 'Future Leader'
    investor_signal = 'Buy / Watchlist'
  } else if (current_esg_score < 60 && momentum_score < -20) {
    classification = 'Value Trap'
    investor_signal = 'Avoid'
  } else if (current_esg_score >= 60 && momentum_score < -20) {
    classification = 'Overrated Leader'
    investor_signal = 'Hold'
  }

  return {
    id: hash % 1000000,
    company_id: companyIdMap.get(ticker.toUpperCase()) ?? 0,
    current_esg_score,
    momentum_score,
    ai_adoption_score,
    controversy_risk,
    confidence_score: 0.78,
    environmental_score: Math.max(0, current_esg_score - 6),
    social_score: Math.max(0, current_esg_score - 3),
    governance_score: Math.max(0, current_esg_score - 9),
    classification,
    investor_signal,
    created_at: nowIso(),
  }
}

const buildCompany = (catalogItem: typeof COMPANY_CATALOG[number], index: number): Company => ({
  id: index + 1,
  name: catalogItem.name,
  ticker: catalogItem.ticker,
  exchange: catalogItem.exchange,
  industry: catalogItem.industry,
  country: catalogItem.country,
  description: `${catalogItem.name} is available in the static Cloudflare deployment fallback.`,
  logo_url: catalogItem.logo_url ?? null,
  website_url: `https://www.google.com/search?q=${encodeURIComponent(catalogItem.name)}`,
  executive_name: 'Leadership',
  executive_url: `https://www.google.com/search?q=${encodeURIComponent(catalogItem.name + ' executive')}`,
  market_cap: catalogItem.market_cap ?? null,
  latest_score: buildScore(catalogItem.ticker, index),
})

const FALLBACK_COMPANIES = COMPANY_CATALOG.map(buildCompany)

const fallbackCompanyById = (id: number) => FALLBACK_COMPANIES.find(company => company.id === id) ?? null

const fallbackReports = (companyId: number): Report[] => ([
  {
    id: companyId * 10 + 1,
    company_id: companyId,
    file_name: 'Static fallback report',
    year: 2025,
    uploaded_at: nowIso(),
    status: 'done',
    page_count: 12,
  },
])

const fallbackEvidence = (companyId: number): Evidence[] => ([
  {
    id: companyId * 100 + 1,
    company_id: companyId,
    report_id: companyId * 10 + 1,
    source_type: 'pdf',
    source_name: 'Static fallback report',
    source_date: '2025',
    page_number: 1,
    url: null,
    evidence_text: 'Static fallback evidence for the hosted Cloudflare deployment.',
    category: 'neutral',
    confidence_score: 0.8,
  },
])

const fallbackSignals = (companyId: number): Signal[] => ([
  {
    id: companyId * 1000 + 1,
    company_id: companyId,
    title: 'Static deployment signal',
    category: 'neutral',
    sentiment: 'neutral',
    severity: 0.2,
    date: nowIso(),
    source: 'Hosted fallback',
    explanation: 'Generated locally when the backend API is unavailable.',
    confidence_score: 0.5,
  },
])

const fallbackStockData = (companyId: number, range: StockRange): StockData | null => {
  const company = fallbackCompanyById(companyId)
  if (!company?.ticker) return null
  const base = 80 + (hashString(company.ticker) % 250)
  const history = Array.from({ length: 24 }, (_, index) => {
    const drift = Math.sin((index / 24) * Math.PI * 2) * 4
    const close = base + drift + index * 0.35
    return {
      timestamp: new Date(Date.now() - (23 - index) * 60 * 60 * 1000).toISOString(),
      open: close - 1.2,
      high: close + 2.1,
      low: close - 2.4,
      close,
      volume: 1000000 + index * 25000,
    }
  })
  const last = history[history.length - 1]
  const previous = history[history.length - 2] ?? last
  return {
    company_id: company.id,
    company_name: company.name,
    ticker: company.ticker ?? '',
    range,
    quote: {
      symbol: company.ticker ?? '',
      currency: 'USD',
      exchange: company.exchange ?? null,
      quote_type: 'EQUITY',
      last_price: last.close ?? null,
      change: (last.close ?? 0) - (previous.close ?? 0),
      change_percent: previous.close ? (((last.close ?? 0) - previous.close) / previous.close) * 100 : null,
      open: last.open ?? null,
      high: last.high ?? null,
      low: last.low ?? null,
      previous_close: previous.close ?? null,
      day_high: last.high ?? null,
      day_low: last.low ?? null,
      year_high: Math.max(...history.map(point => point.high ?? 0)),
      year_low: Math.min(...history.map(point => point.low ?? 0)),
      fifty_day_average: base + 5,
      two_hundred_day_average: base + 11,
      volume: last.volume ?? null,
      average_volume: 1250000,
      market_cap: 1000000000000,
      source: 'static-fallback',
      as_of: last.timestamp,
    },
    history,
  }
}

const fallbackDashboard = (): DashboardData => {
  const sorted = [...FALLBACK_COMPANIES].sort((a, b) => (b.latest_score?.current_esg_score ?? 0) - (a.latest_score?.current_esg_score ?? 0))
  return {
    hidden_winners: sorted.slice(0, 5),
    overrated_leaders: sorted.slice(-5).reverse(),
    recent_controversies: fallbackSignals(1),
    watchlist: sorted.slice(5, 10),
    market_summary: 'Static fallback data is shown because the hosted frontend cannot reach the local API.',
  }
}

const fallbackMatrix = (): MatrixData => ({
  entries: FALLBACK_COMPANIES.map(company => ({
    company,
    current_esg_score: company.latest_score?.current_esg_score ?? 0,
    momentum_score: company.latest_score?.momentum_score ?? 0,
    classification: company.latest_score?.classification ?? 'Watchlist',
    investor_signal: company.latest_score?.investor_signal ?? 'Hold',
  })),
})

const withFallback = async <T>(request: Promise<T>, fallback: () => T): Promise<T> => {
  try {
    return await request
  } catch {
    return fallback()
  }
}

type CompanySearchParams = {
  q?: string
  exchange?: string
  industry?: string
  country?: string
}

// ─── Companies ────────────────────────────────────────────────────────────────

export const searchCompanies = (query?: string | CompanySearchParams) => {
  const params = typeof query === 'string'
    ? (query ? { q: query } : {})
    : (query ?? {})
  return withFallback(
    http.get<Company[]>('/companies', { params }).then(r => r.data),
    () => {
      const search = typeof query === 'string'
        ? query.trim().toLowerCase()
        : String(params.q ?? '').trim().toLowerCase()
      if (!search) return FALLBACK_COMPANIES
      return FALLBACK_COMPANIES.filter(company =>
        company.name.toLowerCase().includes(search)
        || company.ticker?.toLowerCase().includes(search)
        || (company.exchange ?? '').toLowerCase().includes(search)
        || (company.industry ?? '').toLowerCase().includes(search)
        || (company.country ?? '').toLowerCase().includes(search)
      )
    },
  )
}

export const getCompany = (id: number) =>
  withFallback(
    http.get<Company>(`/companies/${id}`).then(r => r.data),
    () => fallbackCompanyById(id) ?? FALLBACK_COMPANIES[0],
  )

export const createCompany = (payload: Partial<Company>) =>
  withFallback(
    http.post<Company>('/companies', payload).then(r => r.data),
    () => ({
      id: Date.now(),
      name: payload.name ?? 'New Company',
      ticker: payload.ticker ?? null,
      exchange: payload.exchange ?? null,
      industry: payload.industry ?? null,
      country: payload.country ?? null,
      description: payload.description ?? null,
      logo_url: payload.logo_url ?? null,
      website_url: payload.website_url ?? null,
      executive_name: payload.executive_name ?? null,
      executive_url: payload.executive_url ?? null,
      market_cap: payload.market_cap ?? null,
      latest_score: null,
    }),
  )

// ─── Reports ─────────────────────────────────────────────────────────────────

export const uploadReport = (companyId: number, file: File, year?: number) => {
  const form = new FormData()
  form.append('file', file)
  return withFallback(
    axios.post<Report>(
    `${BASE}/companies/${companyId}/upload-report`,
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: year ? { year } : {},
    }
  ).then(r => r.data),
    () => ({
      id: Date.now(),
      company_id: companyId,
      file_name: file.name,
      year: year ?? null,
      uploaded_at: nowIso(),
      status: 'done' as const,
      page_count: 1,
    }),
  )
}

// ─── Scores ───────────────────────────────────────────────────────────────────

export const getScoreHistory = (companyId: number) =>
  withFallback(
    http.get<ScoreSnapshot[]>(`/companies/${companyId}/scores`).then(r => r.data),
    () => {
      const company = fallbackCompanyById(companyId) ?? FALLBACK_COMPANIES[0]
      return Array.from({ length: 8 }, (_, index) => buildScore(company.ticker ?? 'GEN', index))
    },
  )

export const calculateScores = (companyId: number) =>
  withFallback(
    http.post<ScoreSnapshot>(`/companies/${companyId}/calculate-scores`).then(r => r.data),
    () => buildScore((fallbackCompanyById(companyId)?.ticker ?? 'GEN'), Date.now()),
  )

// ─── Evidence ─────────────────────────────────────────────────────────────────

export const getEvidence = (companyId: number, category?: string, reportId?: number) =>
  withFallback(
    http.get<Evidence[]>(`/companies/${companyId}/evidence`, {
      params: { ...(category ? { category } : {}), ...(reportId ? { report_id: reportId } : {}) },
    }).then(r => r.data),
    () => fallbackEvidence(companyId).filter(item => !category || item.category === category),
  )

export const getCompanyReports = (companyId: number) =>
  withFallback(
    http.get<Report[]>(`/companies/${companyId}/reports`).then(r => r.data),
    () => fallbackReports(companyId),
  )

export const getStockData = (companyId: number, range: StockRange) =>
  withFallback(
    http.get<StockData>(`/companies/${companyId}/stock-data`, {
      params: { range },
    }).then(r => r.data),
    () => fallbackStockData(companyId, range) ?? {
      company_id: companyId,
      company_name: 'Unknown',
      ticker: '',
      range,
      quote: {
        symbol: '',
        currency: 'USD',
        exchange: null,
        quote_type: null,
        last_price: null,
        change: null,
        change_percent: null,
        open: null,
        high: null,
        low: null,
        previous_close: null,
        day_high: null,
        day_low: null,
        year_high: null,
        year_low: null,
        fifty_day_average: null,
        two_hundred_day_average: null,
        volume: null,
        average_volume: null,
        market_cap: null,
        source: 'static-fallback',
        as_of: nowIso(),
      },
      history: [],
    },
  )

// ─── Signals ─────────────────────────────────────────────────────────────────

export const scanSignals = (companyId: number) =>
  withFallback(
    http.post(`/companies/${companyId}/scan-signals`).then(r => r.data),
    () => ({ message: 'Static fallback signals loaded.', company_id: companyId }),
  )

// ─── Copilot ─────────────────────────────────────────────────────────────────

export const askCopilot = (companyId: number, question: string) =>
  withFallback(
    http.post<CopilotResponse>(`/companies/${companyId}/copilot`, { question }).then(r => r.data),
    () => ({
      answer: 'Static fallback mode is active because the hosted frontend cannot reach the API.',
      sources: fallbackEvidence(companyId),
      confidence: 0.5,
    }),
  )

// ─── Dashboard & Matrix ───────────────────────────────────────────────────────

export const getDashboard = () =>
  withFallback(
    http.get<DashboardData>('/dashboard').then(r => r.data),
    () => fallbackDashboard(),
  )

export const getMatrix = () =>
  withFallback(
    http.get<MatrixData>('/matrix').then(r => r.data),
    () => fallbackMatrix(),
  )
