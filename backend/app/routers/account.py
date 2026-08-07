from __future__ import annotations

import io
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import Company, Report, User, UserWatchlistItem, UserFavoriteItem, Notification
from app.schemas import (
    CompanyOut, ReportOut, UserOut, NotificationOut, UpdateProfileRequest, UpdatePreferencesRequest,
)
from app.routers.auth import get_current_user
from app.services.notifications import load_notification_preferences, save_notification_preferences


router = APIRouter(prefix="/account", tags=["account"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _user_to_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        investing_style=user.investing_style,
        theme_mode=user.theme_mode,
        accent_color=user.accent_color,
        dashboard_layout=user.dashboard_layout,
        card_density=user.card_density,
        ui_preferences=json.loads(user.ui_preferences_json or "{}"),
        notification_preferences=load_notification_preferences(user),
        is_active=user.is_active,
        google_connected=bool(user.google_sub),
    )


def _notification_to_out(notification: Notification) -> NotificationOut:
    return NotificationOut(
        id=notification.id,
        user_id=notification.user_id,
        company_id=notification.company_id,
        trigger_type=notification.trigger_type,
        channel=notification.channel,
        title=notification.title,
        body=notification.body,
        deep_link=notification.deep_link,
        metadata=json.loads(notification.metadata_json or "{}"),
        status=notification.status,
        read_at=notification.read_at,
        delivered_at=notification.delivered_at,
        created_at=notification.created_at,
    )


@router.get("/profile", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return _user_to_out(current_user)


@router.put("/profile", response_model=UserOut)
def update_profile(payload: UpdateProfileRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name.strip() or None
    if payload.investing_style is not None:
        current_user.investing_style = payload.investing_style
    if payload.email is not None:
        email = payload.email.strip().lower()
        if email != current_user.email and db.query(User).filter(User.email == email).first():
            raise HTTPException(409, "An account with that email already exists")
        current_user.email = email
    db.commit()
    db.refresh(current_user)
    return _user_to_out(current_user)


@router.put("/preferences", response_model=UserOut)
def update_preferences(payload: UpdatePreferencesRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if payload.theme_mode is not None:
        current_user.theme_mode = payload.theme_mode
    if payload.accent_color is not None:
        current_user.accent_color = payload.accent_color
    if payload.dashboard_layout is not None:
        current_user.dashboard_layout = payload.dashboard_layout
    if payload.card_density is not None:
        current_user.card_density = payload.card_density
    if payload.ui_preferences is not None:
        current_user.ui_preferences_json = json.dumps(payload.ui_preferences)
    if payload.notification_preferences is not None:
        save_notification_preferences(current_user, payload.notification_preferences)
    db.commit()
    db.refresh(current_user)
    return _user_to_out(current_user)


@router.get("/notifications", response_model=list[NotificationOut])
def get_notifications(limit: int = 50, unread_only: bool = False, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        query = query.filter(Notification.read_at.is_(None))
    return [_notification_to_out(notification) for notification in query.order_by(desc(Notification.created_at), desc(Notification.id)).limit(limit).all()]


@router.post("/notifications/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(notification_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notification = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if not notification:
        raise HTTPException(404, "Notification not found")
    if notification.read_at is None:
        notification.read_at = _utcnow()
        db.commit()
        db.refresh(notification)
    return _notification_to_out(notification)


@router.post("/notifications/read-all")
def mark_all_notifications_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    updated = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.read_at.is_(None))
        .update({Notification.read_at: _utcnow()}, synchronize_session=False)
    )
    db.commit()
    return {"message": "Notifications marked as read", "updated": updated}


@router.get("/watchlist", response_model=list[CompanyOut])
def get_watchlist(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    companies = (
        db.query(Company)
        .join(UserWatchlistItem, UserWatchlistItem.company_id == Company.id)
        .filter(UserWatchlistItem.user_id == current_user.id)
        .order_by(desc(UserWatchlistItem.created_at))
        .all()
    )
    return [CompanyOut.model_validate(company) for company in companies]


@router.post("/watchlist/{company_id}")
def add_watchlist_item(company_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")
    existing = db.query(UserWatchlistItem).filter(UserWatchlistItem.user_id == current_user.id, UserWatchlistItem.company_id == company_id).first()
    if existing:
        return {"message": "Already in watchlist"}
    db.add(UserWatchlistItem(user_id=current_user.id, company_id=company_id))
    db.commit()
    return {"message": "Added to watchlist"}


@router.delete("/watchlist/{company_id}")
def remove_watchlist_item(company_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(UserWatchlistItem).filter(UserWatchlistItem.user_id == current_user.id, UserWatchlistItem.company_id == company_id).first()
    if item:
        db.delete(item)
        db.commit()
    return {"message": "Removed from watchlist"}


@router.get("/favorites", response_model=list[CompanyOut])
def get_favorites(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    companies = (
        db.query(Company)
        .join(UserFavoriteItem, UserFavoriteItem.company_id == Company.id)
        .filter(UserFavoriteItem.user_id == current_user.id)
        .order_by(desc(UserFavoriteItem.created_at))
        .all()
    )
    return [CompanyOut.model_validate(company) for company in companies]


@router.post("/favorites/{company_id}")
def add_favorite_item(company_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")
    existing = db.query(UserFavoriteItem).filter(UserFavoriteItem.user_id == current_user.id, UserFavoriteItem.company_id == company_id).first()
    if existing:
        return {"message": "Already saved"}
    db.add(UserFavoriteItem(user_id=current_user.id, company_id=company_id))
    db.commit()
    return {"message": "Saved"}


@router.delete("/favorites/{company_id}")
def remove_favorite_item(company_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(UserFavoriteItem).filter(UserFavoriteItem.user_id == current_user.id, UserFavoriteItem.company_id == company_id).first()
    if item:
        db.delete(item)
        db.commit()
    return {"message": "Removed"}


@router.get("/reports", response_model=list[ReportOut])
def get_reports(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(Report)
        .filter(Report.user_id == current_user.id)
        .order_by(desc(Report.uploaded_at), desc(Report.id))
        .all()
    )


@router.patch("/reports/{report_id}", response_model=ReportOut)
def rename_report(report_id: int, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if not report:
        raise HTTPException(404, "Report not found")
    new_name = str(payload.get("file_name") or payload.get("name") or "").strip()
    if not new_name:
        raise HTTPException(400, "Report name cannot be empty")
    report.file_name = new_name
    db.commit()
    db.refresh(report)
    return report


@router.delete("/reports/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if not report:
        raise HTTPException(404, "Report not found")
    db.delete(report)
    db.commit()
    return {"message": "Report deleted"}


@router.get("/export")
def export_account(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    payload = {
        "profile": _user_to_out(current_user).model_dump(),
        "watchlist": [item.company_id for item in db.query(UserWatchlistItem).filter(UserWatchlistItem.user_id == current_user.id).all()],
        "favorites": [item.company_id for item in db.query(UserFavoriteItem).filter(UserFavoriteItem.user_id == current_user.id).all()],
        "reports": [ReportOut.model_validate(report).model_dump() for report in db.query(Report).filter(Report.user_id == current_user.id).all()],
    }
    buffer = io.BytesIO(json.dumps(payload, indent=2).encode("utf-8"))
    return StreamingResponse(buffer, media_type="application/json", headers={"Content-Disposition": f'attachment; filename="tricard-account-export.json"'})


@router.post("/import")
async def import_account(file: UploadFile = File(...), overwrite: bool = Query(False), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        payload = json.loads((await file.read()).decode("utf-8"))
    except Exception:
        raise HTTPException(400, "Invalid JSON import file")

    if not isinstance(payload, dict):
        raise HTTPException(400, "Unsupported import format")

    if not overwrite and (payload.get("reports") or payload.get("watchlist") or payload.get("favorites")):
        raise HTTPException(409, "Import would overwrite existing data. Set overwrite=true to confirm.")

    profile = payload.get("profile", {})
    if isinstance(profile, dict):
        if profile.get("full_name") is not None:
            current_user.full_name = profile.get("full_name")
        if profile.get("investing_style") is not None:
            current_user.investing_style = profile.get("investing_style")
        if profile.get("theme_mode") is not None:
            current_user.theme_mode = profile.get("theme_mode")
        if profile.get("accent_color") is not None:
            current_user.accent_color = profile.get("accent_color")
        if profile.get("dashboard_layout") is not None:
            current_user.dashboard_layout = profile.get("dashboard_layout")
        if profile.get("card_density") is not None:
            current_user.card_density = profile.get("card_density")
        if isinstance(profile.get("ui_preferences"), dict):
            current_user.ui_preferences_json = json.dumps(profile.get("ui_preferences"))

    db.query(UserWatchlistItem).filter(UserWatchlistItem.user_id == current_user.id).delete()
    db.query(UserFavoriteItem).filter(UserFavoriteItem.user_id == current_user.id).delete()

    for company_id in payload.get("watchlist", []) or []:
        if db.query(Company).filter(Company.id == company_id).first():
            db.add(UserWatchlistItem(user_id=current_user.id, company_id=company_id))

    for company_id in payload.get("favorites", []) or []:
        if db.query(Company).filter(Company.id == company_id).first():
            db.add(UserFavoriteItem(user_id=current_user.id, company_id=company_id))

    db.commit()
    return {"message": "Account data imported"}