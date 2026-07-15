from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CompanyBase(BaseModel):
    name: str
    ticker: Optional[str] = None
    exchange: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    website_url: Optional[str] = None
    executive_name: Optional[str] = None
    executive_url: Optional[str] = None
    market_cap: Optional[str] = None


class CompanyCreate(CompanyBase):
    pass


class CompanyOut(CompanyBase):
    id: int

    class Config:
        from_attributes = True


class CompanyWithScores(CompanyOut):
    latest_score: Optional["ScoreSnapshotOut"] = None


class ReportOut(BaseModel):
    id: int
    company_id: int
    user_id: Optional[int] = None
    file_name: str
    year: Optional[int]
    uploaded_at: Optional[datetime]
    status: str
    page_count: Optional[int]

    class Config:
        from_attributes = True


class NotificationOut(BaseModel):
    id: int
    user_id: int
    company_id: Optional[int] = None
    trigger_type: str
    channel: str
    title: str
    body: str
    deep_link: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    status: str
    read_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EvidenceOut(BaseModel):
    id: int
    company_id: int
    report_id: Optional[int] = None
    source_type: str
    source_name: Optional[str]
    source_date: Optional[str]
    page_number: Optional[int]
    url: Optional[str]
    evidence_text: str
    category: Optional[str]
    confidence_score: float

    class Config:
        from_attributes = True


class ESGMetricOut(BaseModel):
    id: int
    company_id: int
    report_id: Optional[int] = None
    metric_name: str
    pillar: str
    value: Optional[float]
    unit: Optional[str]
    year: Optional[int]
    confidence_score: float

    class Config:
        from_attributes = True


class SignalOut(BaseModel):
    id: int
    company_id: int
    title: str
    category: str
    sentiment: Optional[str]
    severity: float
    date: Optional[str]
    source: Optional[str]
    explanation: Optional[str]
    confidence_score: float

    class Config:
        from_attributes = True


class ScoreSnapshotOut(BaseModel):
    id: int
    company_id: int
    current_esg_score: float
    momentum_score: float
    ai_adoption_score: float
    controversy_risk: float
    confidence_score: float
    environmental_score: Optional[float]
    social_score: Optional[float]
    governance_score: Optional[float]
    classification: str
    investor_signal: str
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class CopilotQuery(BaseModel):
    question: str


class CopilotResponse(BaseModel):
    answer: str
    sources: List[EvidenceOut]
    confidence: float


class DashboardResponse(BaseModel):
    hidden_winners: List[CompanyWithScores]
    overrated_leaders: List[CompanyWithScores]
    recent_controversies: List[SignalOut]
    watchlist: List[CompanyWithScores]
    market_summary: str


class DividendSummaryOut(BaseModel):
    company_id: int
    company_name: str
    ticker: str
    exchange: Optional[str] = None
    country: Optional[str] = None
    annual_dividend: Optional[float] = None
    dividend_yield: Optional[float] = None
    last_dividend_date: Optional[str] = None
    payout_count: int = 0
    status: str


class MatrixEntry(BaseModel):
    company: CompanyOut
    current_esg_score: float
    momentum_score: float
    classification: str
    investor_signal: str


class MatrixResponse(BaseModel):
    entries: List[MatrixEntry]


class StockPricePoint(BaseModel):
    timestamp: str
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None
    volume: Optional[float] = None


class DividendOut(BaseModel):
    date: str
    amount: float


class QuarterlyProgressOut(BaseModel):
    period: str
    revenue: Optional[float] = None
    earnings: Optional[float] = None
    revenue_growth: Optional[float] = None
    earnings_growth: Optional[float] = None


class StockQuoteOut(BaseModel):
    symbol: str
    currency: Optional[str] = None
    exchange: Optional[str] = None
    quote_type: Optional[str] = None
    last_price: Optional[float] = None
    change: Optional[float] = None
    change_percent: Optional[float] = None
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    previous_close: Optional[float] = None
    day_high: Optional[float] = None
    day_low: Optional[float] = None
    year_high: Optional[float] = None
    year_low: Optional[float] = None
    fifty_day_average: Optional[float] = None
    two_hundred_day_average: Optional[float] = None
    volume: Optional[float] = None
    average_volume: Optional[float] = None
    market_cap: Optional[float] = None
    source: str
    as_of: Optional[str] = None


class StockDataOut(BaseModel):
    company_id: int
    company_name: str
    ticker: str
    range: str
    quote: StockQuoteOut
    history: List[StockPricePoint]
    dividends: List[DividendOut] = Field(default_factory=list)
    quarterly_progress: List[QuarterlyProgressOut] = Field(default_factory=list)
    annual_dividend: Optional[float] = None
    dividend_yield: Optional[float] = None
    last_dividend_date: Optional[str] = None


class QuantAnalyticsOut(BaseModel):
    company_id: int
    lookback_points: int
    esg_trend_slope: float
    momentum_acceleration: float
    max_esg_drawdown_pct: float
    downside_risk: float
    risk_adjusted_momentum: float
    signal_quality_score: float
    positive_signal_ratio: float
    evidence_coverage_ratio: float
    data_freshness_days: Optional[int] = None
    regime: str


class UserPreferencesOut(BaseModel):
    theme_mode: str
    accent_color: str
    dashboard_layout: str
    card_density: str
    ui_preferences: dict = Field(default_factory=dict)
    notification_preferences: dict = Field(default_factory=dict)


class UserOut(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    investing_style: str
    theme_mode: str
    accent_color: str
    dashboard_layout: str
    card_density: str
    ui_preferences: dict = Field(default_factory=dict)
    notification_preferences: dict = Field(default_factory=dict)
    is_active: bool
    google_connected: bool = False


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    investing_style: Optional[str] = None
    theme_mode: Optional[str] = None
    accent_color: Optional[str] = None
    dashboard_layout: Optional[str] = None
    card_density: Optional[str] = None
    ui_preferences: Optional[dict] = None
    notification_preferences: Optional[dict] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleAuthRequest(BaseModel):
    credential: str


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetConfirmRequest(BaseModel):
    token: str
    password: str


class UpdateProfileRequest(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    investing_style: Optional[str] = None


class UpdatePreferencesRequest(BaseModel):
    theme_mode: Optional[str] = None
    accent_color: Optional[str] = None
    dashboard_layout: Optional[str] = None
    card_density: Optional[str] = None
    ui_preferences: Optional[dict] = None
    notification_preferences: Optional[dict] = None


class AuthResponse(BaseModel):
    user: UserOut


# Update forward reference
CompanyWithScores.model_rebuild()
