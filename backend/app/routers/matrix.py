from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import Company, ScoreSnapshot
from app.schemas import MatrixResponse, MatrixEntry, CompanyOut
from app.services.market_data import fetch_financial_profile

router = APIRouter(prefix="/matrix", tags=["matrix"])


@router.get("", response_model=MatrixResponse)
def get_matrix(db: Session = Depends(get_db)):
    # Get latest snapshot per company
    subquery = (
        db.query(ScoreSnapshot.company_id, db.query(ScoreSnapshot.id)
                 .filter(ScoreSnapshot.company_id == ScoreSnapshot.company_id)
                 .order_by(desc(ScoreSnapshot.created_at))
                 .limit(1)
                 .correlate(ScoreSnapshot)
                 .scalar_subquery()
                 .label("latest_id"))
    )

    companies = db.query(Company).all()
    entries = []
    for company in companies:
        latest = (
            db.query(ScoreSnapshot)
            .filter(ScoreSnapshot.company_id == company.id)
            .order_by(desc(ScoreSnapshot.created_at))
            .first()
        )
        if latest:
            financial_profile = fetch_financial_profile(company.ticker) if company.ticker else {}
            company_out = CompanyOut.model_validate(company).model_copy(update=financial_profile)
            entries.append(MatrixEntry(
                company=company_out,
                current_esg_score=latest.current_esg_score,
                momentum_score=latest.momentum_score,
                classification=latest.classification,
                investor_signal=latest.investor_signal,
            ))

    return MatrixResponse(entries=entries)
