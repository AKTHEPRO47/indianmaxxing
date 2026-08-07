from app.routers.companies import router as companies_router
from app.routers.dashboard import router as dashboard_router
from app.routers.matrix import router as matrix_router
from app.routers.auth import router as auth_router
from app.routers.account import router as account_router
from app.routers.notifications import router as notifications_router

__all__ = ["companies_router", "dashboard_router", "matrix_router", "auth_router", "account_router", "notifications_router"]
