from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.authz import get_current_active_user
from app.models.user import User
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Field Communications & Notifications"])

@router.get("", response_model=dict)
def get_notifications(
    mine_id: Optional[int] = Query(None, description="Filter by Mine ID"),
    status: Optional[str] = Query(None, description="Filter by read status (ALL, UNREAD, READ)"),
    category: Optional[str] = Query(None, description="Filter by category (ALL, CRITICAL, TASKS, INCIDENTS, RISK, VERIFICATION)"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Returns role-scoped and mine-isolated actionable notifications.
    Combines user notifications and active mine operational alerts with actionable deep links.
    """
    return NotificationService.get_user_notifications(
        db=db,
        user=current_user,
        mine_id=mine_id,
        status_filter=status,
        category_filter=category,
        limit=limit,
        offset=offset
    )

@router.get("/unread-count", response_model=dict)
def get_unread_count(
    mine_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Returns accurate unread notification counts per category for the current user.
    """
    return NotificationService.get_unread_counts(db=db, user=current_user, mine_id=mine_id)

@router.patch("/{notification_id}/read", response_model=dict)
def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Marks an individual notification or operational alert as read.
    Logs an immutable cryptographic audit record.
    """
    return NotificationService.mark_as_read(db=db, user=current_user, notification_id=notification_id)

@router.post("/mark-all-read", response_model=dict)
def mark_all_notifications_read(
    mine_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Marks all notifications and alerts in user's authorized scope as read.
    """
    return NotificationService.mark_all_as_read(db=db, user=current_user, mine_id=mine_id)
