from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, field_serializer

from models.booking import BookingStatus, PaymentStatus


class AdminBookingListItem(BaseModel):
    id: UUID
    status: BookingStatus
    start_at: datetime
    end_at: datetime
    price: Decimal
    customer_id: UUID
    customer_name: str | None
    provider_id: UUID
    provider_business_name: str | None
    service_id: UUID
    service_name: str | None
    payment_status: PaymentStatus | None
    payment_amount: Decimal | None
    created_at: datetime
    updated_at: datetime

    @field_serializer("price", "payment_amount")
    def serialize_decimal(self, value: Decimal | None) -> str | None:
        return str(value) if value is not None else None


class AdminBookingDetailResponse(AdminBookingListItem):
    notes: str | None = None
    cancellation_reason: str | None = None
    cancelled_at: datetime | None = None
    confirmed_at: datetime | None = None
    completed_at: datetime | None = None
    no_show_at: datetime | None = None
    hold_expires_at: datetime | None = None
    customer_email: str | None = None
    provider_timezone: str | None = None
    payment_id: UUID | None = None
    payment_method: str | None = None
    transaction_reference: str | None = None
    paid_at: datetime | None = None
    refunded_at: datetime | None = None
    refund_amount: Decimal | None = None
    failure_reason: str | None = None

    @field_serializer("refund_amount")
    def serialize_refund_amount(self, value: Decimal | None) -> str | None:
        return str(value) if value is not None else None
