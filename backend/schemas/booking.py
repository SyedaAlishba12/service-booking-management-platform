from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from models.booking import BookingStatus, PaymentStatus


class BookingCreate(BaseModel):
    provider_id: UUID
    service_id: UUID
    start_at: datetime
    notes: str | None = Field(default=None, max_length=5000)

    @model_validator(mode="after")
    def aware_start(self):
        if self.start_at.tzinfo is None or self.start_at.utcoffset() is None:
            raise ValueError("start_at must include a timezone offset")
        return self


class BookingReschedule(BaseModel):
    start_at: datetime

    @model_validator(mode="after")
    def aware_start(self):
        if self.start_at.tzinfo is None or self.start_at.utcoffset() is None:
            raise ValueError("start_at must include a timezone offset")
        return self


class BookingCancel(BaseModel):
    reason: str | None = Field(default=None, max_length=2000)


class BookingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    customer_id: UUID
    provider_id: UUID
    service_id: UUID
    start_at: datetime
    end_at: datetime
    status: BookingStatus
    price: Decimal
    notes: str | None
    cancellation_reason: str | None
    cancelled_at: datetime | None
    confirmed_at: datetime | None
    completed_at: datetime | None
    no_show_at: datetime | None
    hold_expires_at: datetime | None
    created_at: datetime
    updated_at: datetime
    service_name: str | None = None
    provider_name: str | None = None
    customer_name: str | None = None
    provider_timezone: str | None = None
    payment_status: PaymentStatus | None = None


class SlotResponse(BaseModel):
    start_at: datetime
    end_at: datetime
    provider_timezone: str


class PaymentCreate(BaseModel):
    booking_id: UUID
    payment_method: str | None = Field(default="MOCK_CARD", max_length=50)


class PaymentRetry(BaseModel):
    payment_method: str | None = Field(default="MOCK_CARD", max_length=50)


class PaymentFailure(BaseModel):
    reason: str = Field(default="Mock payment failed", max_length=1000)


class RefundRequest(BaseModel):
    amount: Decimal | None = Field(default=None, ge=0)


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    booking_id: UUID
    amount: Decimal
    status: PaymentStatus
    payment_method: str | None
    transaction_reference: str | None
    failure_reason: str | None
    paid_at: datetime | None
    refunded_at: datetime | None
    refund_amount: Decimal | None
    created_at: datetime
    updated_at: datetime


class EarningsResponse(BaseModel):
    gross_paid: Decimal
    commission_rate_percent: Decimal
    commission_amount: Decimal
    net_earnings: Decimal
    pending_amount: Decimal
    refunded_amount: Decimal
    period_start: datetime | None
    period_end: datetime | None
