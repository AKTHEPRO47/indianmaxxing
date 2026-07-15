from __future__ import annotations

import json
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import PasswordResetToken, User, UserSession
from app.schemas import (
    AuthResponse, GoogleAuthRequest, LoginRequest, PasswordResetConfirmRequest,
    PasswordResetRequest, RegisterRequest, UserOut, UpdateProfileRequest,
    UpdatePreferencesRequest,
)
from app.security import generate_token, hash_password, hash_token, verify_password
from app.services.notifications import load_notification_preferences, save_notification_preferences


router = APIRouter(prefix="/auth", tags=["auth"])
SESSION_COOKIE = "tricard_session"
SESSION_DAYS = 30
RESET_HOURS = 24


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


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


def _issue_session(user: User, response: Response, db: Session, request: Request | None = None) -> UserOut:
    raw_token = generate_token()
    session = UserSession(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        user_agent=request.headers.get("user-agent") if request else None,
        ip_address=request.client.host if request and request.client else None,
        expires_at=_utcnow() + timedelta(days=SESSION_DAYS),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    response.set_cookie(
        key=SESSION_COOKIE,
        value=raw_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=SESSION_DAYS * 24 * 60 * 60,
        path="/",
    )
    return _user_to_out(user)


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(401, "Not authenticated")

    token_hash = hash_token(token)
    session = (
        db.query(UserSession)
        .filter(UserSession.token_hash == token_hash, UserSession.revoked_at.is_(None), UserSession.expires_at > _utcnow())
        .first()
    )
    if not session:
        raise HTTPException(401, "Session expired or invalid")

    user = db.query(User).filter(User.id == session.user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(401, "Not authenticated")
    return user


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return _user_to_out(current_user)


@router.post("/register", response_model=AuthResponse)
def register(payload: RegisterRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    email = _normalize_email(payload.email)
    if len(payload.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters long")
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(409, "An account with that email already exists")

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        investing_style=payload.investing_style or "balanced",
        theme_mode=payload.theme_mode or "light",
        accent_color=payload.accent_color or "slate",
        dashboard_layout=payload.dashboard_layout or "comfortable",
        card_density=payload.card_density or "comfortable",
        ui_preferences_json=json.dumps(payload.ui_preferences or {}),
        notification_preferences_json=json.dumps(payload.notification_preferences or {}),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    if payload.notification_preferences is not None:
        save_notification_preferences(user, payload.notification_preferences)
        db.commit()
    return AuthResponse(user=_issue_session(user, response, db, request))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    email = _normalize_email(payload.email)
    user = db.query(User).filter(User.email == email, User.is_active.is_(True)).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    return AuthResponse(user=_issue_session(user, response, db, request))


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        token_hash = hash_token(token)
        session = db.query(UserSession).filter(UserSession.token_hash == token_hash, UserSession.revoked_at.is_(None)).first()
        if session:
            session.revoked_at = _utcnow()
            db.commit()
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"message": "Logged out"}


@router.post("/google", response_model=AuthResponse)
def google_login(payload: GoogleAuthRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    client_id = settings.GOOGLE_CLIENT_ID
    if not client_id:
        raise HTTPException(503, "Google sign-in is not configured")

    try:
        url = f"https://oauth2.googleapis.com/tokeninfo?id_token={urllib.parse.quote(payload.credential)}"
        with urllib.request.urlopen(url, timeout=10) as handle:
            data = json.loads(handle.read().decode("utf-8"))
    except Exception as exc:
        raise HTTPException(400, f"Google token verification failed: {exc}") from exc

    if data.get("aud") != client_id:
        raise HTTPException(401, "Google token audience mismatch")

    email = _normalize_email(str(data.get("email", "")))
    if not email:
        raise HTTPException(400, "Google account did not return an email address")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            google_sub=str(data.get("sub")),
            full_name=str(data.get("name") or data.get("given_name") or email.split("@")[0]),
            investing_style="balanced",
            theme_mode="light",
            accent_color="slate",
            dashboard_layout="comfortable",
            card_density="comfortable",
            ui_preferences_json="{}",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if not user.google_sub:
            user.google_sub = str(data.get("sub"))
            db.commit()

    return AuthResponse(user=_issue_session(user, response, db, request))


@router.post("/forgot-password")
def forgot_password(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    email = _normalize_email(payload.email)
    user = db.query(User).filter(User.email == email, User.is_active.is_(True)).first()
    if not user:
        return {"message": "If the account exists, a reset link was created."}

    raw_token = generate_token()
    reset_token = PasswordResetToken(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=_utcnow() + timedelta(hours=RESET_HOURS),
    )
    db.add(reset_token)
    db.commit()
    return {"message": "Password reset token created", "reset_token": raw_token}


@router.post("/reset-password")
def reset_password(payload: PasswordResetConfirmRequest, db: Session = Depends(get_db)):
    token_hash = hash_token(payload.token)
    reset_token = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == token_hash, PasswordResetToken.used_at.is_(None), PasswordResetToken.expires_at > _utcnow())
        .first()
    )
    if not reset_token:
        raise HTTPException(400, "Invalid or expired reset token")
    if len(payload.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters long")

    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    user.password_hash = hash_password(payload.password)
    reset_token.used_at = _utcnow()
    db.commit()
    return {"message": "Password updated"}
