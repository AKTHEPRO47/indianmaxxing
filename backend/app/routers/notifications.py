from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from typing import List

from app.database import get_db
from app.models import Notification
from app.routers.auth import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationOut(BaseModel):
    id: int
    channel: str
    title: str
    body: str
    trigger_type: str
    status: str
    read_at: datetime | None
    delivered_at: datetime | None
    created_at: datetime
    deep_link: str | None

    class Config:
        from_attributes = True


@router.get("", response_model=List[NotificationOut])
def get_notifications(
    db: Session = Depends(get_db),
    _current_user = Depends(get_current_user),
    unread_only: bool = False
):
    """Get notifications for current user."""
    query = db.query(Notification).filter(
        Notification.user_id == _current_user.id,
        Notification.channel == "IN_APP"  # Only show in-app notifications in UI
    ).order_by(desc(Notification.created_at))
    
    if unread_only:
        query = query.filter(Notification.read_at.is_(None))
    
    return query.all()


@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    _current_user = Depends(get_current_user)
):
    """Mark notification as read."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == _current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.read_at = datetime.utcnow()
    db.commit()
    
    return {"status": "marked_read", "id": notification_id}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    _current_user = Depends(get_current_user)
):
    """Delete notification from inbox."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == _current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    db.delete(notification)
    db.commit()
    
    return {"status": "deleted", "id": notification_id}


@router.post("/{notification_id}/read-and-delete")
def mark_read_then_delete(
    notification_id: int,
    db: Session = Depends(get_db),
    _current_user = Depends(get_current_user)
):
    """Mark notification as read and immediately delete it."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == _current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.read_at = datetime.utcnow()
    db.delete(notification)
    db.commit()
    
    return {"status": "read_and_deleted", "id": notification_id}


@router.delete("")
def delete_all_read_notifications(
    db: Session = Depends(get_db),
    _current_user = Depends(get_current_user)
):
    """Delete all read notifications for current user."""
    deleted_count = db.query(Notification).filter(
        Notification.user_id == _current_user.id,
        Notification.read_at.isnot(None)
    ).delete()
    
    db.commit()
    
    return {"status": "deleted_all_read", "count": deleted_count}
