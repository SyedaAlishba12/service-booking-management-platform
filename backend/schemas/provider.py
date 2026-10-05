import re
from datetime import datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from models.provider import ProviderStatus

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _check_timezone(value: str | None) -> str | None:
    if value is None:
        return value
    try:
        ZoneInfo(value)
    except Exception:
        raise ValueError("Invalid IANA timezone, e.g. Asia/Karachi")
    return value


def _check_email(value: str | None) -> str | None:
    if value is None:
        return value
    if not _EMAIL_RE.match(value):
        raise ValueError("Invalid email address")
    return value


class ProviderCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    business_name: str = Field(min_length=2, max_length=150)
    description: str | None = None
    profile_image_url: str | None = Field(default=None, max_length=500)
    location: str = Field(min_length=2, max_length=255)
    city: str | None = Field(default=None, max_length=100)
    contact_phone: str | None = Field(default=None, max_length=30)
    contact_email: str | None = Field(default=None, max_length=255)
    timezone: str = Field(max_length=64, description="IANA name, e.g. Asia/Karachi")
    slot_interval_minutes: int = Field(default=30, gt=0, le=480)
    buffer_minutes: int = Field(default=0, ge=0, le=240)

    _tz = field_validator("timezone")(_check_timezone)
    _email = field_validator("contact_email")(_check_email)


class ProviderUpdate(BaseModel):
    """Partial update. Only the fields that are sent are changed."""

    model_config = ConfigDict(str_strip_whitespace=True)

    business_name: str | None = Field(default=None, min_length=2, max_length=150)
    description: str | None = None
    profile_image_url: str | None = Field(default=None, max_length=500)
    location: str | None = Field(default=None, min_length=2, max_length=255)
    city: str | None = Field(default=None, max_length=100)
    contact_phone: str | None = Field(default=None, max_length=30)
    contact_email: str | None = Field(default=None, max_length=255)
    timezone: str | None = Field(default=None, max_length=64)
    slot_interval_minutes: int | None = Field(default=None, gt=0, le=480)
    buffer_minutes: int | None = Field(default=None, ge=0, le=240)

    _tz = field_validator("timezone")(_check_timezone)
    _email = field_validator("contact_email")(_check_email)


class ProviderStatusUpdate(BaseModel):
    """Used by the admin approval workflow (Taha)."""

    status: ProviderStatus | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def _at_least_one(self):
        if self.status is None and self.is_active is None:
            raise ValueError("Provide status and/or is_active")
        return self


class ProviderSummary(BaseModel):
    """Small provider block embedded in service cards."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    business_name: str
    city: str | None
    location: str
    profile_image_url: str | None


class ProviderPublicResponse(BaseModel):
    """What the public provider profile and provider cards can show."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    business_name: str
    description: str | None
    profile_image_url: str | None
    location: str
    city: str | None
    contact_phone: str | None
    contact_email: str | None
    timezone: str
    created_at: datetime


class ProviderResponse(ProviderPublicResponse):
    """Full record for the provider themself and for admins."""

    user_id: UUID
    slot_interval_minutes: int
    buffer_minutes: int
    status: ProviderStatus
    is_active: bool
    updated_at: datetime


class ProviderFilters(BaseModel):
    q: str | None = None
    city: str | None = None
    location: str | None = None
    category_id: UUID | None = None
    # status / is_active are honoured only for admin listings (public_only=False)
    status: ProviderStatus | None = None
    is_active: bool | None = None


class ProviderListResponse(BaseModel):
    items: list[ProviderPublicResponse]
    total: int
    page: int
    page_size: int
