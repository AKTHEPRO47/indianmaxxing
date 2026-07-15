from pydantic import BaseModel
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
    file_name: str
    year: Optional[int]
    uploaded_at: Optional[datetime]
    status: str
    page_count: Optional[int]

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


# Update forward reference
CompanyWithScores.model_rebuild()
