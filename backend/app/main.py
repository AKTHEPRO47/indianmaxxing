from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.routers import companies_router, dashboard_router, matrix_router
import app.models  # noqa: register all ORM models


def ensure_company_schema_compatibility() -> None:
    """Keep local SQLite schema compatible with new columns without requiring manual reset."""
    with engine.begin() as conn:
        # SQLite path used in local dev; safe no-op for repeated startups.
        if engine.dialect.name == "sqlite":
            existing = {
                row[1] for row in conn.execute(text("PRAGMA table_info(companies)"))
            }
            if "exchange" not in existing:
                conn.execute(text("ALTER TABLE companies ADD COLUMN exchange VARCHAR(40)"))
            if "website_url" not in existing:
                conn.execute(text("ALTER TABLE companies ADD COLUMN website_url VARCHAR(500)"))
            if "executive_name" not in existing:
                conn.execute(text("ALTER TABLE companies ADD COLUMN executive_name VARCHAR(255)"))
            if "executive_url" not in existing:
                conn.execute(text("ALTER TABLE companies ADD COLUMN executive_url VARCHAR(500)"))
            evidence_columns = {row[1] for row in conn.execute(text("PRAGMA table_info(evidences)"))}
            if "report_id" not in evidence_columns:
                conn.execute(text("ALTER TABLE evidences ADD COLUMN report_id INTEGER"))
            metric_columns = {row[1] for row in conn.execute(text("PRAGMA table_info(esg_metrics)"))}
            if "report_id" not in metric_columns:
                conn.execute(text("ALTER TABLE esg_metrics ADD COLUMN report_id INTEGER"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables and seed on startup
    Base.metadata.create_all(bind=engine)
    ensure_company_schema_compatibility()
    db = SessionLocal()
    try:
        from app.seed.seed_data import seed
        seed(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="ESG Momentum Engine API",
    description="AI-powered ESG momentum scoring — measures direction and speed of ESG change before traditional rating providers catch up.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(companies_router)
app.include_router(dashboard_router)
app.include_router(matrix_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "ESG Momentum Engine"}
