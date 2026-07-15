import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.routers import companies_router, dashboard_router, matrix_router, auth_router, account_router, notifications_router
from app.services.notifications import maybe_notify_live_price_for_watchlists, maybe_notify_market_open_for_all_users
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
            report_columns = {row[1] for row in conn.execute(text("PRAGMA table_info(reports)"))}
            if "user_id" not in report_columns:
                conn.execute(text("ALTER TABLE reports ADD COLUMN user_id INTEGER"))
            user_columns = {row[1] for row in conn.execute(text("PRAGMA table_info(users)"))}
            if "notification_preferences_json" not in user_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN notification_preferences_json TEXT NOT NULL DEFAULT '{}'"))


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

    stop_event = asyncio.Event()

    async def market_open_scheduler() -> None:
        while not stop_event.is_set():
            db = SessionLocal()
            try:
                maybe_notify_market_open_for_all_users(db)
                maybe_notify_live_price_for_watchlists(db)
            except Exception:
                pass
            finally:
                db.close()

            try:
                await asyncio.wait_for(stop_event.wait(), timeout=60)
            except asyncio.TimeoutError:
                continue

    scheduler_task = asyncio.create_task(market_open_scheduler())
    yield
    stop_event.set()
    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        pass


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
app.include_router(auth_router)
app.include_router(account_router)
app.include_router(notifications_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "ESG Momentum Engine"}
