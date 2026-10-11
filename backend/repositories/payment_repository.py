from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.booking import Booking, Payment, PaymentStatus


async def provider_totals(session: AsyncSession, provider_id: UUID,
                          period_start: datetime | None, period_end: datetime | None):
    query = select(Payment, Booking).join(Booking, Booking.id == Payment.booking_id).where(Booking.provider_id == provider_id)
    if period_start:
        query = query.where(Payment.paid_at >= period_start)
    if period_end:
        query = query.where(Payment.paid_at < period_end)
    rows = (await session.execute(query)).all()
    zero = Decimal("0.00")
    gross = sum((p.amount for p, _ in rows if p.status in (PaymentStatus.PAID, PaymentStatus.REFUNDED)), zero)
    refunded = sum((p.refund_amount or zero for p, _ in rows if p.status == PaymentStatus.REFUNDED), zero)
    pending = sum((p.amount for p, _ in rows if p.status == PaymentStatus.PENDING), zero)
    return {"gross_paid": gross, "refunded_amount": refunded, "pending_amount": pending}


async def admin_status_totals(session: AsyncSession, period_start: datetime | None, period_end: datetime | None):
    from models.booking import BookingStatus
    booking_query = select(Booking.status, func.count(Booking.id)).group_by(Booking.status)
    payment_query = select(Payment.status, func.count(Payment.id), func.coalesce(func.sum(Payment.amount), 0)).group_by(Payment.status)
    if period_start:
        booking_query = booking_query.where(Booking.created_at >= period_start)
        payment_query = payment_query.where(Payment.created_at >= period_start)
    if period_end:
        booking_query = booking_query.where(Booking.created_at < period_end)
        payment_query = payment_query.where(Payment.created_at < period_end)
    bookings = (await session.execute(booking_query)).all()
    payments = (await session.execute(payment_query)).all()
    return {
        "booking_counts_by_status": {s.value: n for s, n in bookings},
        "payment_counts_by_status": {s.value: n for s, n, _ in payments},
        "payment_amounts_by_status": {s.value: Decimal(amount) for s, _, amount in payments},
    }
