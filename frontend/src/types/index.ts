// ─── Core Domain Types ────────────────────────────────────────────────────────

export type Classification =
  | 'Hidden Winner'
  | 'Future Leader'
  | 'Value Trap'
  | 'Overrated Leader'
  | 'Watchlist'
  | 'Risk Alert'

export type InvestorSignal = 'Buy / Watchlist' | 'Hold' | 'Risk Alert' | 'Avoid'

export type EsgPillar = 'environmental' | 'social' | 'governance' | 'ai_adoption'
export type StockRange = '1m' | '2m' | '5m' | '1d' | '2d' | '1w' | '1mo' | '1y' | 'max'

export type SignalCategory =
  | 'environmental'
  | 'social'
  | 'governance'
  | 'ai_adoption'
  | 'controversy'
  | 'neutral'

export type Sentiment = 'positive' | 'negative' | 'neutral'

export interface NotificationPreferences {
  enabled: boolean
  live_price_alerts: boolean
  price_move_threshold_pct: number
  market_open_countries: Array<'Singapore' | 'United States' | 'Hong Kong'>
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface Company {
  id: number
  name: string
  ticker: string | null
  exchange?: string | null
  industry: string | null
  country: string | null
  description: string | null
  logo_url: string | null
  website_url: string | null
  executive_name: string | null
  executive_url: string | null
  market_cap: string | null
  market_cap_value?: number | null
  pe_ratio?: number | null
  forward_pe?: number | null
  price_to_book?: number | null
  dividend_yield?: number | null
  beta?: number | null
  latest_score?: ScoreSnapshot | null
}

export interface ScoreSnapshot {
  id: number
  company_id: number
  current_esg_score: number
  momentum_score: number
  ai_adoption_score: number
  controversy_risk: number
  confidence_score: number
  environmental_score: number | null
  social_score: number | null
  governance_score: number | null
  classification: Classification
  investor_signal: InvestorSignal
  created_at: string | null
}

export interface Evidence {
  id: number
  company_id: number
  report_id: number | null
  source_type: string
  source_name: string | null
  source_date: string | null
  page_number: number | null
  url: string | null
  evidence_text: string
  category: string | null
  confidence_score: number
}

export interface EsgMetric {
  id: number
  company_id: number
  metric_name: string
  pillar: EsgPillar
  value: number | null
  unit: string | null
  year: number | null
  confidence_score: number
}

export interface Signal {
  id: number
  company_id: number
  title: string
  category: SignalCategory
  sentiment: Sentiment | null
  severity: number
  date: string | null
  source: string | null
  explanation: string | null
  confidence_score: number
}

export interface Report {
  id: number
  company_id: number
  user_id?: number | null
  file_name: string
  year: number | null
  uploaded_at: string | null
  status: 'pending' | 'processing' | 'done' | 'failed'
  page_count: number | null
}

export interface UserPreferences {
  theme_mode: 'light' | 'dark' | 'system'
  accent_color: 'slate' | 'rose' | 'emerald' | 'blue' | 'violet' | 'amber'
  dashboard_layout: 'comfortable' | 'compact' | 'analytics'
  card_density: 'comfortable' | 'compact' | 'dense'
  ui_preferences: Record<string, unknown>
  notification_preferences: NotificationPreferences
}

export interface UserProfile extends UserPreferences {
  id: number
  email: string
  full_name: string | null
  investing_style: string
  is_active: boolean
  google_connected: boolean
}

export interface NotificationItem {
  id: number
  user_id: number
  company_id: number | null
  trigger_type: string
  channel: string
  title: string
  body: string
  deep_link: string | null
  metadata: Record<string, unknown>
  status: string
  read_at: string | null
  delivered_at: string | null
  created_at: string | null
}

export interface AuthResponse {
  user: UserProfile
}

export interface AccountExportBundle {
  profile: UserProfile
  watchlist: number[]
  favorites: number[]
  reports: Report[]
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload extends LoginPayload {
  full_name?: string | null
  investing_style?: string
  theme_mode?: UserPreferences['theme_mode']
  accent_color?: UserPreferences['accent_color']
  dashboard_layout?: UserPreferences['dashboard_layout']
  card_density?: UserPreferences['card_density']
  ui_preferences?: Record<string, unknown>
}

export interface ResetPasswordPayload {
  email: string
}

export interface ResetPasswordConfirmPayload {
  token: string
  password: string
}

export interface UpdateProfilePayload {
  email?: string
  full_name?: string | null
  investing_style?: string
}

export interface UpdatePreferencesPayload {
  theme_mode?: UserPreferences['theme_mode']
  accent_color?: UserPreferences['accent_color']
  dashboard_layout?: UserPreferences['dashboard_layout']
  card_density?: UserPreferences['card_density']
  ui_preferences?: Record<string, unknown>
  notification_preferences?: Partial<NotificationPreferences>
}

export interface StockPricePoint {
  timestamp: string
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  volume: number | null
}

export interface DividendPoint {
  date: string
  amount: number
}

export interface QuarterlyProgressPoint {
  period: string
  revenue: number | null
  earnings: number | null
  revenue_growth: number | null
  earnings_growth: number | null
}

export interface StockQuote {
  symbol: string
  currency: string | null
  exchange: string | null
  quote_type: string | null
  last_price: number | null
  change: number | null
  change_percent: number | null
  open: number | null
  high: number | null
  low: number | null
  previous_close: number | null
  day_high: number | null
  day_low: number | null
  year_high: number | null
  year_low: number | null
  fifty_day_average: number | null
  two_hundred_day_average: number | null
  volume: number | null
  average_volume: number | null
  market_cap: number | null
  premarket_price: number | null
  premarket_change: number | null
  premarket_change_percent: number | null
  premarket_as_of: string | null
  source: string
  as_of: string | null
}

export interface StockData {
  company_id: number
  company_name: string
  ticker: string
  range: StockRange
  quote: StockQuote
  history: StockPricePoint[]
  dividends: DividendPoint[]
  quarterly_progress: QuarterlyProgressPoint[]
  annual_dividend: number | null
  dividend_yield: number | null
  last_dividend_date: string | null
}

export interface CompanyQuantAnalytics {
  company_id: number
  lookback_points: number
  esg_trend_slope: number
  momentum_acceleration: number
  max_esg_drawdown_pct: number
  downside_risk: number
  risk_adjusted_momentum: number
  signal_quality_score: number
  positive_signal_ratio: number
  evidence_coverage_ratio: number
  data_freshness_days: number | null
  regime: string
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardData {
  hidden_winners: Company[]
  overrated_leaders: Company[]
  recent_controversies: Signal[]
  watchlist: Company[]
  market_summary: string
}

export interface DividendSummary {
  company_id: number
  company_name: string
  ticker: string
  exchange: string | null
  country: string | null
  annual_dividend: number | null
  dividend_yield: number | null
  last_dividend_date: string | null
  payout_count: number
  status: string
}

// ─── Matrix ───────────────────────────────────────────────────────────────────

export interface MatrixEntry {
  company: Company
  current_esg_score: number
  momentum_score: number
  classification: Classification
  investor_signal: InvestorSignal
}

export interface MatrixData {
  entries: MatrixEntry[]
}

// ─── Copilot ─────────────────────────────────────────────────────────────────

export interface CopilotResponse {
  answer: string
  sources: Evidence[]
  confidence: number
}
