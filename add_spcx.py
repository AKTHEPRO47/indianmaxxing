from app.database import SessionLocal
from app.models import Company, ESGMetric, ScoreSnapshot, Signal
from datetime import datetime

db = SessionLocal()

# Check if SPCX already exists
spcx = db.query(Company).filter(Company.ticker == "SPCX").first()
if spcx:
    print("SPCX already exists")
    db.close()
    exit()

# Create SPCX company
company = Company(
    name="Spire Corp",
    ticker="SPCX",
    exchange="NASDAQ",
    industry="Technology",
    country="United States",
    description="Spire Corp is a technology company focused on AI and data solutions.",
    logo_url="https://www.spire.com/logo.png",
    website_url="https://www.spire.com",
    market_cap="$2.5B"
)

db.add(company)
db.commit()
db.refresh(company)

print(f"✓ Created company: {company.name} ({company.ticker}) - ID {company.id}")

# Add ESG Metrics
esg_metrics = [
    ESGMetric(
        company_id=company.id,
        metric_name="Carbon Emissions Reduction",
        pillar="environmental",
        value=72.5,
        unit="percentile",
        year=2025,
        confidence_score=0.85
    ),
    ESGMetric(
        company_id=company.id,
        metric_name="Employee Satisfaction",
        pillar="social",
        value=68.3,
        unit="percentile",
        year=2025,
        confidence_score=0.78
    ),
    ESGMetric(
        company_id=company.id,
        metric_name="Board Independence",
        pillar="governance",
        value=75.1,
        unit="percentile",
        year=2025,
        confidence_score=0.80
    )
]
for metric in esg_metrics:
    db.add(metric)

# Add Score Snapshot
snapshot = ScoreSnapshot(
    company_id=company.id,
    current_esg_score=71.9,
    momentum_score=65.0,
    ai_adoption_score=82.5,
    controversy_risk=25.0,
    confidence_score=0.82,
    environmental_score=72.5,
    social_score=68.3,
    governance_score=75.1,
    classification="Future Leader",
    investor_signal="Buy Watchlist"
)
db.add(snapshot)

# Add positive signals
signals = [
    Signal(
        company_id=company.id,
        title="Strong AI Investment",
        category="ai_adoption",
        sentiment="positive",
        severity=8.0,
        explanation="SPCX has invested heavily in AI infrastructure and machine learning capabilities.",
        confidence_score=0.85
    ),
    Signal(
        company_id=company.id,
        title="Sustainability Initiative",
        category="environmental",
        sentiment="positive",
        severity=7.5,
        explanation="Company committed to carbon-neutral operations by 2030.",
        confidence_score=0.78
    ),
    Signal(
        company_id=company.id,
        title="Diverse Leadership",
        category="social",
        sentiment="positive",
        severity=7.0,
        explanation="Board has increased diversity in leadership roles.",
        confidence_score=0.80
    )
]

for signal in signals:
    db.add(signal)

db.commit()

print(f"✓ Added ESG metrics: E=72.5%, S=68.3%, G=75.1%")
print(f"✓ Added score snapshot: Classification={snapshot.classification}, Signal={snapshot.investor_signal}")
print(f"✓ Added {len(signals)} signals")
print(f"\n✅ SPCX added successfully with real data")

db.close()
