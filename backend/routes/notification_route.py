from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_db
from middleware.auth_middleware import get_current_user
from models.user import User
from schemas.notification_schema import NotificationResponse
from services.notification_service import NotificationService

router = APIRouter(
    prefix="/api/notifications",
    tags=["Notifications"],
)


@router.get("", response_model=dict)
async def get_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    notifications = await service.get_user_notifications(current_user.id)
    return {
        "success": True,
        "data": [NotificationResponse.model_validate(n).model_dump() for n in notifications],
    }


@router.get("/unread", response_model=dict)
async def get_unread_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    notifications = await service.get_unread_notifications(current_user.id)
    return {
        "success": True,
        "data": [NotificationResponse.model_validate(n).model_dump() for n in notifications],
    }


@router.put("/{id}/read", response_model=dict)
async def mark_notification_as_read(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    success = await service.mark_as_read(id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    return {"success": True, "message": "Notification marked as read"}


@router.put("/read-all", response_model=dict)
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    count = await service.mark_all_as_read(current_user.id)
    return {"success": True, "message": f"{count} notifications marked as read"}


@router.delete("/{id}", response_model=dict)
async def delete_notification(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    success = await service.delete_notification(id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    return {"success": True, "message": "Notification deleted successfully"}