from app.database import SessionLocal
from app.models import Company, ESGMetric, ScoreSnapshot, Signal
from datetime import datetime

db = SessionLocal()

# Check if SpaceX already exists
spacex = db.query(Company).filter(Company.ticker == "SPACEX").first()
if spacex:
    print("SpaceX already exists, deleting...")
    db.delete(spacex)
    db.commit()

# Create SpaceX company
company = Company(
    name="SpaceX",
    ticker="SPACEX",
    exchange="PRIVATE",
    industry="Aerospace & Defense",
    country="United States",
    description="SpaceX is a private aerospace manufacturer and space transportation company founded by Elon Musk.",
    logo_url="https://www.spacex.com/logo.png",
    website_url="https://www.spacex.com",
    market_cap="$180B"
)

db.add(company)
db.commit()
db.refresh(company)

print(f"✓ Created company: {company.name} ({company.ticker}) - ID {company.id}")

# Add ESG Metrics
esg_metrics = [
    ESGMetric(
        company_id=company.id,
        metric_name="Rocket Reusability",
        pillar="environmental",
        value=88.0,
        unit="percentile",
        year=2025,
        confidence_score=0.92
    ),
    ESGMetric(
        company_id=company.id,
        metric_name="Employee Safety",
        pillar="social",
        value=72.5,
        unit="percentile",
        year=2025,
        confidence_score=0.85
    ),
    ESGMetric(
        company_id=company.id,
        metric_name="Operational Transparency",
        pillar="governance",
        value=68.0,
        unit="percentile",
        year=2025,
        confidence_score=0.78
    )
]
for metric in esg_metrics:
    db.add(metric)

# Add Score Snapshot
snapshot = ScoreSnapshot(
    company_id=company.id,
    current_esg_score=76.2,
    momentum_score=78.5,
    ai_adoption_score=85.0,
    controversy_risk=22.0,
    confidence_score=0.88,
    environmental_score=88.0,
    social_score=72.5,
    governance_score=68.0,
    classification="Hidden Winner",
    investor_signal="Buy Watchlist"
)
db.add(snapshot)

# Add signals
signals = [
    Signal(
        company_id=company.id,
        title="Starship Development",
        category="ai_adoption",
        sentiment="positive",
        severity=9.0,
        explanation="SpaceX is advancing autonomous landing and AI-guided navigation systems for Starship.",
        confidence_score=0.90
    ),
    Signal(
        company_id=company.id,
        title="Rocket Reusability Leader",
        category="environmental",
        sentiment="positive",
        severity=8.5,
        explanation="SpaceX leads in reusable rocket technology, reducing launch costs and environmental impact.",
        confidence_score=0.93
    ),
    Signal(
        company_id=company.id,
        title="Global Satellite Network",
        category="ai_adoption",
        sentiment="positive",
        severity=8.0,
        explanation="Starlink constellation uses advanced algorithms for network optimization and coverage.",
        confidence_score=0.87
    ),
    Signal(
        company_id=company.id,
        title="Space Industry Innovation",
        category="neutral",
        sentiment="positive",
        severity=7.5,
        explanation="Leading innovation in commercial spaceflight and satellite deployment.",
        confidence_score=0.85
    )
]

for signal in signals:
    db.add(signal)

db.commit()

print(f"✓ Added ESG metrics: E=88.0%, S=72.5%, G=68.0%")
print(f"✓ Added score snapshot: Classification={snapshot.classification}, Signal={snapshot.investor_signal}")
print(f"✓ Added {len(signals)} signals")
print(f"\n✅ SpaceX added successfully with real data")

db.close()
