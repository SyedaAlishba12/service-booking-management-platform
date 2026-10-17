from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from models.notification import Notification, NotificationType


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def notify(
        self,
        user_id: UUID,
        notification_type: NotificationType | str,
        title: str,
        message: str,
        entity_type: str | None = None,
        entity_id: UUID | None = None,
    ) -> Notification:
        """Central notification function to be used across all project modules."""
        notification = Notification(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id,
            is_read=False,
        )
        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)
        return notification

    async def get_user_notifications(self, user_id: UUID) -> list[Notification]:
        result = await self.db.execute(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_unread_notifications(self, user_id: UUID) -> list[Notification]:
        result = await self.db.execute(
            select(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)
            .order_by(Notification.created_at.desc())
        )
        return list(result.scalars().all())

    async def mark_as_read(self, notification_id: UUID, user_id: UUID) -> bool:
        result = await self.db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        notification = result.scalar_one_or_none()
        if not notification:
            return False

        notification.is_read = True
        await self.db.commit()
        return True

    async def mark_all_as_read(self, user_id: UUID) -> int:
        query = (
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)
            .values(is_read=True)
        )
        result = await self.db.execute(query)
        await self.db.commit()
        return result.rowcount

    async def delete_notification(self, notification_id: UUID, user_id: UUID) -> bool:
        result = await self.db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        notification = result.scalar_one_or_none()
        if not notification:
            return False

        await self.db.delete(notification)
        await self.db.commit()
        return True