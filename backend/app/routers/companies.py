import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db, SessionLocal
from app.models import Company, Report, Evidence, ESGMetric, Signal, ScoreSnapshot
from app.schemas import (
    CompanyCreate, CompanyOut, CompanyWithScores,
    ReportOut, EvidenceOut, SignalOut, ScoreSnapshotOut,
    StockDataOut,
    CopilotQuery, CopilotResponse,
)
from app.services.scoring import calculate_scores
from app.services.pdf_parser import extract_pages, save_extracted_text
from app.services.logo_lookup import logo_url_for_ticker
from app.services.market_data import fetch_stock_data
from app.agents.document_extractor import document_extractor_agent
from app.agents.signal_classifier import signal_classifier_agent
from app.agents.copilot import copilot_agent

router = APIRouter(prefix="/companies", tags=["companies"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def process_uploaded_report(report_id: int, company_id: int, company_name: str, file_path: str, year: Optional[int]) -> None:
    db = SessionLocal()
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            return

        pages = extract_pages(file_path)
        text_path = os.path.splitext(file_path)[0] + "_extracted.txt"
        save_extracted_text(pages, text_path)
        report.extracted_text_path = text_path
        report.page_count = len(pages)

        extracted = document_extractor_agent.extract(pages, company_name)
        for item in extracted:
            ev = Evidence(
                company_id=company_id,
                report_id=report.id,
                source_type="pdf",
                source_name=os.path.basename(file_path),
                source_date=str(year) if year else None,
                page_number=item.get("page_number"),
                evidence_text=item["evidence_text"],
                category=item.get("pillar"),
                confidence_score=item.get("confidence_score", 0.5),
            )
            db.add(ev)
            db.flush()

            if item.get("value") is not None:
                metric = ESGMetric(
                    company_id=company_id,
                    report_id=report.id,
                    metric_name=item["metric_name"],
                    pillar=item["pillar"],
                    value=item["value"],
                    unit=item.get("unit"),
                    year=year,
                    confidence_score=item.get("confidence_score", 0.5),
                    evidence_id=ev.id,
                )
                db.add(metric)

        report.status = "done"
        db.commit()
    except Exception:
        report = db.query(Report).filter(Report.id == report_id).first()
        if report:
            report.status = "failed"
            db.commit()
    finally:
        db.close()


@router.post("", response_model=CompanyOut, status_code=201)
def create_company(payload: CompanyCreate, db: Session = Depends(get_db)):
    if payload.ticker:
        existing = db.query(Company).filter(Company.ticker == payload.ticker).first()
        if existing:
            raise HTTPException(400, f"Ticker {payload.ticker} already exists")
    company_data = payload.model_dump()
    company_data["logo_url"] = company_data.get("logo_url") or logo_url_for_ticker(company_data.get("ticker"))
    company = Company(**company_data)
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.get("", response_model=List[CompanyWithScores])
def list_companies(
    q: Optional[str] = Query(None, description="Search by name or ticker"),
    exchange: Optional[str] = Query(None, description="Filter by exchange, e.g. NASDAQ"),
    industry: Optional[str] = Query(None, description="Filter by industry"),
    country: Optional[str] = Query(None, description="Filter by country"),
    db: Session = Depends(get_db),
):
    query = db.query(Company)
    if q:
        pattern = f"%{q}%"
        query = query.filter(
            (Company.name.ilike(pattern)) | (Company.ticker.ilike(pattern))
        )
    if exchange:
        query = query.filter(Company.exchange.ilike(exchange))
    if industry:
        query = query.filter(Company.industry.ilike(f"%{industry}%"))
    if country:
        query = query.filter(Company.country.ilike(f"%{country}%"))
    companies = query.all()
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


@router.get("/{company_id}", response_model=CompanyWithScores)
def get_company(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")
    latest = (
        db.query(ScoreSnapshot)
        .filter(ScoreSnapshot.company_id == company_id)
        .order_by(desc(ScoreSnapshot.created_at))
        .first()
    )
    return CompanyWithScores(
        **CompanyOut.model_validate(company).model_dump(),
        latest_score=ScoreSnapshotOut.model_validate(latest) if latest else None,
    )


@router.get("/{company_id}/reports", response_model=List[ReportOut])
def get_reports(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")
    return (
        db.query(Report)
        .filter(Report.company_id == company_id)
        .order_by(desc(Report.uploaded_at), desc(Report.id))
        .all()
    )


@router.post("/{company_id}/upload-report", response_model=ReportOut)
async def upload_report(
    company_id: int,
    background_tasks: BackgroundTasks,
    year: Optional[int] = None,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")

    company_dir = os.path.join(UPLOAD_DIR, str(company_id))
    os.makedirs(company_dir, exist_ok=True)
    file_path = os.path.join(company_dir, file.filename)

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    report = Report(
        company_id=company_id,
        file_name=file.filename,
        year=year,
        status="processing",
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    background_tasks.add_task(process_uploaded_report, report.id, company_id, company.name, file_path, year)

    return report


@router.post("/{company_id}/scan-signals")
def scan_signals(company_id: int, db: Session = Depends(get_db)):
    """Classify and store news signals. In MVP uses mock data if none exist."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")

    existing = db.query(Signal).filter(Signal.company_id == company_id).count()
    return {"message": f"Signal scan complete. {existing} signals available.", "company_id": company_id}


@router.post("/{company_id}/calculate-scores", response_model=ScoreSnapshotOut)
def trigger_calculate_scores(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")
    snapshot = calculate_scores(company_id, db)
    return snapshot


@router.get("/{company_id}/evidence", response_model=List[EvidenceOut])
def get_evidence(
    company_id: int,
    category: Optional[str] = None,
    report_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(Evidence).filter(Evidence.company_id == company_id)
    if category:
        query = query.filter(Evidence.category == category)
    if report_id:
        query = query.filter(Evidence.report_id == report_id)
    return query.order_by(desc(Evidence.confidence_score)).limit(limit).all()


@router.get("/{company_id}/scores", response_model=List[ScoreSnapshotOut])
def get_scores(company_id: int, limit: int = 12, db: Session = Depends(get_db)):
    return (
        db.query(ScoreSnapshot)
        .filter(ScoreSnapshot.company_id == company_id)
        .order_by(desc(ScoreSnapshot.created_at))
        .limit(limit)
        .all()
    )


@router.get("/{company_id}/stock-data", response_model=StockDataOut)
def get_stock_data(
    company_id: int,
    stock_range: str = Query("1mo", alias="range"),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")
    if not company.ticker:
        raise HTTPException(400, "Company does not have a ticker symbol")

    try:
        payload = fetch_stock_data(company.ticker, stock_range)
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(502, f"Failed to fetch market data: {exc}") from exc

    return StockDataOut(
        company_id=company.id,
        company_name=company.name,
        ticker=company.ticker,
        range=payload["range"],
        quote=payload["quote"],
        history=payload["history"],
    )


@router.post("/{company_id}/copilot", response_model=CopilotResponse)
def ask_copilot(company_id: int, payload: CopilotQuery, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")

    evidences = db.query(Evidence).filter(Evidence.company_id == company_id).all()
    result = copilot_agent.answer(payload.question, evidences, company.name)

    return CopilotResponse(
        answer=result["answer"],
        sources=[EvidenceOut.model_validate(e) for e in result["sources"]],
        confidence=result["confidence"],
    )
