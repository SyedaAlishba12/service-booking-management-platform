"""Small notification adapter backed by the shared notifications model.

This keeps booking code independent of notification persistence details. A future
notification service can replace this adapter without changing booking workflows.
"""
from sqlalchemy.ext.asyncio import AsyncSession

from models.notification import Notification, NotificationType


async def notify(
    session: AsyncSession,
    *,
    user_id,
    notification_type: str,
    title: str,
    message: str,
    entity_type: str | None = None,
    entity_id=None,
) -> Notification:
    row = Notification(
        user_id=user_id,
        notification_type=NotificationType(notification_type),
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    session.add(row)
    await session.flush()
    return row
