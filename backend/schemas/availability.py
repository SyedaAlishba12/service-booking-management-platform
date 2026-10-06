from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AvailabilityCreate(BaseModel):
    """One weekly working window (is_break=False) or one break window (is_break=True).
    Times are in the provider's local time (providers.timezone)."""

    day_of_week: int = Field(ge=0, le=6, description="0=Monday ... 6=Sunday")
    start_time: time
    end_time: time
    is_break: bool = False

    @model_validator(mode="after")
    def _order(self):
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class AvailabilityUpdate(BaseModel):
    day_of_week: int | None = Field(default=None, ge=0, le=6)
    start_time: time | None = None
    end_time: time | None = None
    is_break: bool | None = None


class AvailabilityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    provider_id: UUID
    day_of_week: int
    start_time: time
    end_time: time
    is_break: bool
    created_at: datetime
    updated_at: datetime


class AvailabilityExceptionCreate(BaseModel):
    """A day off / holiday (is_day_off=True) or custom hours for one date."""

    exception_date: date
    is_day_off: bool = True
    start_time: time | None = None
    end_time: time | None = None
    reason: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def _consistent(self):
        if self.is_day_off:
            if self.start_time is not None or self.end_time is not None:
                raise ValueError("start_time and end_time must be empty for a day off")
        else:
            if self.start_time is None or self.end_time is None:
                raise ValueError("start_time and end_time are required for custom hours")
            if self.end_time <= self.start_time:
                raise ValueError("end_time must be after start_time")
        return self


class AvailabilityExceptionUpdate(BaseModel):
    exception_date: date | None = None
    is_day_off: bool | None = None
    start_time: time | None = None
    end_time: time | None = None
    reason: str | None = Field(default=None, max_length=255)


class AvailabilityExceptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    provider_id: UUID
    exception_date: date
    is_day_off: bool
    start_time: time | None
    end_time: time | None
    reason: str | None
    created_at: datetime
    updated_at: datetime


class ProviderAvailabilityResponse(BaseModel):
    """Everything slot generation needs from the provider side, in one object."""

    provider_id: UUID
    timezone: str
    slot_interval_minutes: int
    buffer_minutes: int
    weekly: list[AvailabilityResponse]
    exceptions: list[AvailabilityExceptionResponse]
