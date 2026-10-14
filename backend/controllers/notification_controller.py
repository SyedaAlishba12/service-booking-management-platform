from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from repositories.notification_repository import NotificationRepository
from models.notification import Notification, NotificationType


class NotificationController:
    def __init__(self, db: AsyncSession):
        self.repo = NotificationRepository(db)

    async def notify(
        self,
        user_id: UUID,
        notification_type: NotificationType | str,
        title: str,
        message: str,
        entity_type: str | None = None,
        entity_id: UUID | None = None,
    ) -> Notification:
        return await self.repo.create(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id,
        )

    async def list_notifications(self, user_id: UUID) -> list[Notification]:
        return await self.repo.get_by_user(user_id)

    async def list_unread_notifications(self, user_id: UUID) -> list[Notification]:
        return await self.repo.get_unread_by_user(user_id)

    async def mark_read(self, notification_id: UUID, user_id: UUID) -> bool:
        notification = await self.repo.get_by_id_and_user(notification_id, user_id)
        if not notification:
            return False
        await self.repo.mark_as_read(notification)
        return True

    async def mark_all_read(self, user_id: UUID) -> int:
        return await self.repo.mark_all_as_read(user_id)

    async def remove_notification(self, notification_id: UUID, user_id: UUID) -> bool:
        notification = await self.repo.get_by_id_and_user(notification_id, user_id)
        if not notification:
            return False
        await self.repo.delete(notification)
        return True