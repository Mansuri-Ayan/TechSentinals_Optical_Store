# Routes: notification_router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user
from db.session import get_db
from models.notification import Notification
from schemas.notification import NotificationListResponse, NotificationRead

router = APIRouter(
    prefix="/api/notifications",
    tags=["Notifications"],
)


@router.get("/", response_model=NotificationListResponse)
async def get_my_notifications(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Retrieve notifications for the authenticated user along with the unread count."""
    user_id = current_user.id

    # Fetch notifications
    stmt = (
        select(Notification)
        .where(Notification.recipient_user_id == user_id)
        .order_by(Notification.created_at.desc())
    )
    res = await db.execute(stmt)
    notifications = res.scalars().all()

    # Count unread
    unread_stmt = (
        select(func.count())
        .select_from(Notification)
        .where(Notification.recipient_user_id == user_id, Notification.is_read.is_(False))
    )
    unread_res = await db.execute(unread_stmt)
    unread_count = int(unread_res.scalar_one() or 0)

    # Validate with Pydantic
    read_list = [NotificationRead.model_validate(n) for n in notifications]

    return NotificationListResponse(
        notifications=read_list,
        unread_count=unread_count,
    )


@router.put("/{id}/read", response_model=NotificationRead)
async def mark_notification_read(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Mark a single notification as read."""
    user_id = current_user.id

    stmt = select(Notification).where(Notification.id == id)
    res = await db.execute(stmt)
    notif = res.scalar_one_or_none()

    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    if notif.recipient_user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access this notification",
        )

    notif.is_read = True
    await db.commit()
    await db.refresh(notif)
    return NotificationRead.model_validate(notif)


@router.put("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Mark all notifications of the current user as read."""
    user_id = current_user.id

    stmt = (
        update(Notification)
        .where(Notification.recipient_user_id == user_id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    await db.execute(stmt)
    await db.commit()
    return {"message": "All notifications marked as read"}
