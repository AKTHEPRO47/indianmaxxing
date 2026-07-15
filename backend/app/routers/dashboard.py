from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from concurrent.futures import ThreadPoolExecutor, as_completed

from app.database import get_db
from app.models import Company, ScoreSnapshot, Signal
from app.schemas import DashboardResponse, CompanyWithScores, CompanyOut, ScoreSnapshotOut, SignalOut, DividendSummaryOut
from app.routers.auth import get_current_user
from app.services.notifications import maybe_notify_market_open_for_user
from app.services.market_data import fetch_stock_data

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db), _current_user=Depends(get_current_user)):
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
    maybe_notify_market_open_for_user(db, _current_user)

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


@router.get("/dividends", response_model=list[DividendSummaryOut])
def get_dividend_summaries(
    limit: int = 300,
    include_zero: bool = True,
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    companies = db.query(Company).filter(Company.ticker.isnot(None)).all()

    def _row(company: Company) -> DividendSummaryOut:
        ticker = (company.ticker or "").strip()
        if not ticker:
            return DividendSummaryOut(
                company_id=company.id,
                company_name=company.name,
                ticker="",
                exchange=company.exchange,
                country=company.country,
                annual_dividend=None,
                dividend_yield=None,
                last_dividend_date=None,
                payout_count=0,
                status="no_ticker",
            )
        try:
            payload = fetch_stock_data(ticker, "1y")
            annual_dividend = payload.get("annual_dividend")
            dividend_yield = payload.get("dividend_yield")
            last_dividend_date = payload.get("last_dividend_date")
            payouts = len(payload.get("dividends") or [])
            status = "ok"
        except Exception as exc:
            annual_dividend = None
            dividend_yield = None
            last_dividend_date = None
            payouts = 0
            status = f"error:{str(exc)[:120]}"

        return DividendSummaryOut(
            company_id=company.id,
            company_name=company.name,
            ticker=ticker,
            exchange=company.exchange,
            country=company.country,
            annual_dividend=annual_dividend,
            dividend_yield=dividend_yield,
            last_dividend_date=last_dividend_date,
            payout_count=payouts,
            status=status,
        )

    rows: list[DividendSummaryOut] = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(_row, company) for company in companies]
        for future in as_completed(futures):
            rows.append(future.result())

    rows.sort(
        key=lambda row: (
            row.dividend_yield is not None,
            row.dividend_yield or 0.0,
            row.annual_dividend or 0.0,
            row.ticker,
        ),
        reverse=True,
    )

    if not include_zero:
        rows = [row for row in rows if (row.annual_dividend or 0) > 0]

    return rows[:max(1, min(limit, 1000))]
