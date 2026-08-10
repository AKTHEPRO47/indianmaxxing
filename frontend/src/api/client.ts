import axios from 'axios'
import { COMPANY_CATALOG } from '../data/companyCatalog'
import type {
  Company, ScoreSnapshot, Evidence, Signal, Report,
  DashboardData, MatrixData, CopilotResponse, StockData, StockRange,
  AuthResponse, UserProfile, UserPreferences, AccountExportBundle, NotificationItem, UpdatePreferencesPayload, CompanyQuantAnalytics, DividendSummary, NewsSignal, TechnicalScanResult,
} from '../types'

const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
export const http = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 15000,
})

const isHostedFallbackOnly = () => {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return !import.meta.env.VITE_API_URL && host !== 'localhost' && host !== '127.0.0.1'
}

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

const fallbackQuantAnalytics = (companyId: number): CompanyQuantAnalytics => {
  const company = fallbackCompanyById(companyId) ?? FALLBACK_COMPANIES[0]
  const score = company.latest_score ?? buildScore(company.ticker ?? 'GEN', companyId)
  const signalQuality = Math.max(35, Math.min(85, 50 + (score.momentum_score * 0.4) - (score.controversy_risk * 0.2)))
  return {
    company_id: companyId,
    lookback_points: 8,
    esg_trend_slope: Number(((score.current_esg_score - 50) / 25).toFixed(2)),
    momentum_acceleration: Number((score.momentum_score / 10).toFixed(2)),
    max_esg_drawdown_pct: Number((Math.max(2, 22 - score.current_esg_score * 0.2)).toFixed(2)),
    downside_risk: Number((Math.max(0.2, score.controversy_risk / 35)).toFixed(2)),
    risk_adjusted_momentum: Number((score.momentum_score * (1 - score.controversy_risk / 100)).toFixed(2)),
    signal_quality_score: Number(signalQuality.toFixed(2)),
    positive_signal_ratio: Number(Math.max(10, Math.min(90, 50 + score.momentum_score * 0.8)).toFixed(2)),
    evidence_coverage_ratio: Number(Math.max(20, Math.min(100, 45 + score.current_esg_score * 0.5)).toFixed(2)),
    data_freshness_days: 7,
    regime: score.momentum_score > 20 ? 'Compounding Upside' : score.momentum_score < -20 ? 'De-Rating Risk' : 'Transition',
  }
}

const withFallback = async <T>(request: Promise<T>, fallback: () => T): Promise<T> => {
  if (isHostedFallbackOnly()) return fallback()
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
  ).then((companies) => {
    const requestedCountry = typeof query === 'string'
      ? ''
      : String(params.country ?? '').trim().toLowerCase()
    const requestedText = typeof query === 'string'
      ? query.trim().toLowerCase()
      : String(params.q ?? '').trim().toLowerCase()
    const wantsSingapore = requestedCountry === 'singapore' || requestedText.includes('singapore') || requestedText.includes('sgx')

    if (!wantsSingapore) return companies

    const singaporeFallback = FALLBACK_COMPANIES.filter(company => (company.country ?? '').toLowerCase() === 'singapore')
    const merged = new Map<string, Company>()
    for (const company of [...companies, ...singaporeFallback]) {
      if (!company.ticker) continue
      merged.set(company.ticker.toUpperCase(), company)
    }
    return Array.from(merged.values())
  })
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
    () => null,
  )

export const getCompanyQuantAnalytics = (companyId: number, lookbackPoints = 12) =>
  withFallback(
    http.get<CompanyQuantAnalytics>(`/companies/${companyId}/quant-analytics`, {
      params: { lookback_points: lookbackPoints },
    }).then(r => r.data),
    () => fallbackQuantAnalytics(companyId),
  )

export const getAllDividends = (includeZero = true, limit = 300) =>
  withFallback(
    http.get<DividendSummary[]>('/dashboard/dividends', {
      params: { include_zero: includeZero, limit },
    }).then(r => r.data),
    () => [],
  )

// ─── Signals ─────────────────────────────────────────────────────────────────

export const scanSignals = (companyId: number) =>
  withFallback(
    http.post(`/companies/${companyId}/scan-signals`).then(r => r.data),
    () => ({ message: 'Static fallback signals loaded.', company_id: companyId }),
  )

export const scanTechnicalAnalysis = (companyId: number) =>
  withFallback(
    http.post<TechnicalScanResult>(`/companies/${companyId}/scan-technical`).then(r => r.data),
    () => ({ company_id: companyId, indicators: null, created_signals: [] }),
  )

// ─── Copilot ─────────────────────────────────────────────────────────────────

export const askCopilot = (companyId: number, question: string) =>
  withFallback(
    http.post<CopilotResponse>(`/companies/${companyId}/copilot`, { query: question }).then(r => r.data),
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

export const getNews = (limit = 50, category?: string, companyId?: number) =>
  http.get<NewsSignal[]>('/news', { params: { limit, ...(category ? { category } : {}), ...(companyId ? { company_id: companyId } : {}) } }).then(r => r.data)

export const refreshNews = () =>
  http.post<{ skipped: boolean; refreshed_companies: number; new_signals: number }>('/news/refresh').then(r => r.data)

// ─── Auth & Account ─────────────────────────────────────────────────────────

export type LoginPayload = { email: string; password: string }
export type RegisterPayload = LoginPayload & Partial<UserPreferences> & { full_name?: string | null; ui_preferences?: Record<string, unknown> }
export type ResetPasswordPayload = { email: string }
export type ResetPasswordConfirmPayload = { token: string; password: string }
export type UpdateProfilePayload = { email?: string; full_name?: string | null; investing_style?: string }

export const getCurrentUser = () => http.get<UserProfile>('/auth/me').then(r => r.data)

export const register = (payload: RegisterPayload) => http.post<AuthResponse>('/auth/register', payload).then(r => r.data)

export const login = (payload: LoginPayload) => http.post<AuthResponse>('/auth/login', payload).then(r => r.data)

export const googleLogin = (credential: string) => http.post<AuthResponse>('/auth/google', { credential }).then(r => r.data)

export const logout = () => http.post('/auth/logout').then(r => r.data)

export const requestPasswordReset = (payload: ResetPasswordPayload) => http.post('/auth/forgot-password', payload).then(r => r.data)

export const confirmPasswordReset = (payload: ResetPasswordConfirmPayload) => http.post('/auth/reset-password', payload).then(r => r.data)

export const verifyEmail = (token: string) => http.get('/auth/verify-email', { params: { token } }).then(r => r.data)

export const getProfile = () => http.get<UserProfile>('/account/profile').then(r => r.data)

export const getNotificationChannelStatus = () => http.get<{
  telegram: { configured: boolean; bot_username: string | null }
  discord: { configured: boolean }
  email: { configured: boolean }
}>('/account/notification-channels').then(r => r.data)

export const updateProfile = (payload: UpdateProfilePayload) => http.put<UserProfile>('/account/profile', payload).then(r => r.data)

export const updatePreferences = (payload: UpdatePreferencesPayload) => http.put<UserProfile>('/account/preferences', payload).then(r => r.data)

export const getNotifications = (limit = 50, unreadOnly = false) =>
  http.get<NotificationItem[]>('/account/notifications', { params: { limit, unread_only: unreadOnly } }).then(r => r.data)

export const markNotificationRead = (notificationId: number) =>
  http.post<NotificationItem>(`/account/notifications/${notificationId}/read`).then(r => r.data)

export const markAllNotificationsRead = () =>
  http.post('/account/notifications/read-all').then(r => r.data)

export const getWatchlist = () => http.get<Company[]>('/account/watchlist').then(r => r.data)

export const addWatchlistItem = (companyId: number) => http.post(`/account/watchlist/${companyId}`).then(r => r.data)

export const removeWatchlistItem = (companyId: number) => http.delete(`/account/watchlist/${companyId}`).then(r => r.data)

export const getFavorites = () => http.get<Company[]>('/account/favorites').then(r => r.data)

export const addFavoriteItem = (companyId: number) => http.post(`/account/favorites/${companyId}`).then(r => r.data)

export const removeFavoriteItem = (companyId: number) => http.delete(`/account/favorites/${companyId}`).then(r => r.data)

export const getAccountReports = () => http.get<Report[]>('/account/reports').then(r => r.data)

export const renameReport = (reportId: number, fileName: string) => http.patch<Report>(`/account/reports/${reportId}`, { file_name: fileName }).then(r => r.data)

export const deleteReport = (reportId: number) => http.delete(`/account/reports/${reportId}`).then(r => r.data)

export const exportAccount = () => http.get<AccountExportBundle>('/account/export').then(r => r.data)

export const importAccount = (file: File, overwrite = false) => {
  const form = new FormData()
  form.append('file', file)
  return http.post('/account/import', form, { params: overwrite ? { overwrite: true } : {} , headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
}
