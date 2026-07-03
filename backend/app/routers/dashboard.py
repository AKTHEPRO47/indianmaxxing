from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import Company, ScoreSnapshot, Signal
from app.schemas import DashboardResponse, CompanyWithScores, CompanyOut, ScoreSnapshotOut, SignalOut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db)):
    def _enrich(companies):
        result = []
        for c in companies:
            latest = (
                db.query(ScoreSnapshot)
                .filter(ScoreSnapshot.company_id == c.id)
                .order_by(desc(ScoreSnapshot.created_at))
                .first()
            )
            result.append(CompanyWithScores(
                **CompanyOut.model_validate(c).model_dump(),
                latest_score=ScoreSnapshotOut.model_validate(latest) if latest else None,
            ))
        return result

    # Hidden Winners
    hidden_winner_ids = (
        db.query(ScoreSnapshot.company_id)
        .filter(ScoreSnapshot.classification == "Hidden Winner")
        .order_by(desc(ScoreSnapshot.momentum_score))
        .distinct()
        .limit(5)
        .all()
    )
    hw_companies = [db.query(Company).filter(Company.id == row[0]).first() for row in hidden_winner_ids]
    hw_companies = [c for c in hw_companies if c]

    # Overrated Leaders
    overrated_ids = (
        db.query(ScoreSnapshot.company_id)
        .filter(ScoreSnapshot.classification == "Overrated Leader")
        .order_by(ScoreSnapshot.momentum_score)
        .distinct()
        .limit(5)
        .all()
    )
    or_companies = [db.query(Company).filter(Company.id == row[0]).first() for row in overrated_ids]
    or_companies = [c for c in or_companies if c]

    # Watchlist
    watchlist_ids = (
        db.query(ScoreSnapshot.company_id)
        .order_by(desc(ScoreSnapshot.created_at))
        .distinct()
        .limit(10)
        .all()
    )
    wl_companies = [db.query(Company).filter(Company.id == row[0]).first() for row in watchlist_ids]
    wl_companies = [c for c in wl_companies if c]

    # Recent controversies
    recent_controversies = (
        db.query(Signal)
        .filter(Signal.category == "controversy")
        .order_by(desc(Signal.created_at))
        .limit(6)
        .all()
    )

    market_summary = _generate_market_summary(db)

    return DashboardResponse(
        hidden_winners=_enrich(hw_companies),
        overrated_leaders=_enrich(or_companies),
        recent_controversies=[SignalOut.model_validate(s) for s in recent_controversies],
        watchlist=_enrich(wl_companies),
        market_summary=market_summary,
    )


def _generate_market_summary(db: Session) -> str:
    total = db.query(ScoreSnapshot).count()
    improving = db.query(ScoreSnapshot).filter(ScoreSnapshot.momentum_score > 20).count()
    declining = db.query(ScoreSnapshot).filter(ScoreSnapshot.momentum_score < -20).count()
    risk_alerts = db.query(ScoreSnapshot).filter(ScoreSnapshot.controversy_risk > 75).count()

    if total == 0:
        return "ESG Momentum Engine initializing. Seed data loading..."

    pct_improving = round((improving / total) * 100) if total else 0
    return (
        f"ESG Momentum Pulse: {improving}/{total} tracked companies show improving ESG momentum (+{pct_improving}%). "
        f"{declining} companies are in decline. {risk_alerts} active Risk Alert(s) flagged. "
        f"AI adoption signals are strongest in Technology and Industrials sectors. "
        f"Greenwashing risk remains elevated in Energy and Materials. Market confidence: Moderate."
    )
