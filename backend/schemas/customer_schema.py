from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class CustomerPreferences(BaseModel):
    email_notifications: bool = True
    sms_notifications: bool = False
    theme: str = "light"


class CustomerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    preferences: dict | None = None
    created_at: datetime
    updated_at: datetime


class CustomerUpdateRequest(BaseModel):
    preferences: dict | None = None