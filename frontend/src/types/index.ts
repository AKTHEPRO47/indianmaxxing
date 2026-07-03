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
  file_name: string
  year: number | null
  uploaded_at: string | null
  status: 'pending' | 'processing' | 'done' | 'failed'
  page_count: number | null
}

export interface StockPricePoint {
  timestamp: string
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  volume: number | null
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
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardData {
  hidden_winners: Company[]
  overrated_leaders: Company[]
  recent_controversies: Signal[]
  watchlist: Company[]
  market_summary: string
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
