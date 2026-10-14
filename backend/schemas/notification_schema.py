from pydantic import BaseModel, ConfigDict, UUID4
from datetime import datetime
from models.notification import NotificationType


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID4
    user_id: UUID4
    notification_type: NotificationType
    title: str
    message: str
    entity_type: str | None = None
    entity_id: UUID4 | None = None
    is_read: bool
    created_at: datetime
    updated_at: datetime