from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.booking import Booking, BookingStatus, Payment, PaymentStatus


ZERO = Decimal("0.00")


def _apply_period(query, event_at, period_start, period_end):
    """Apply a half-open UTC period to a financial event timestamp."""
    query = query.where(event_at.is_not(None))
    if period_start is not None:
        query = query.where(event_at >= period_start)
    if period_end is not None:
        query = query.where(event_at < period_end)
    return query


async def _payment_sum(
    session: AsyncSession,
    amount_expression,
    event_at,
    period_start: datetime | None,
    period_end: datetime | None,
    *,
    provider_id: UUID | None = None,
) -> Decimal:
    query = select(
        func.coalesce(func.sum(amount_expression), 0)
    ).select_from(Payment)

    if provider_id is not None:
        query = query.join(
            Booking,
            Booking.id == Payment.booking_id,
        ).where(Booking.provider_id == provider_id)

    query = _apply_period(query, event_at, period_start, period_end)
    value = await session.scalar(query)
    return Decimal(str(value or 0))


async def provider_totals(
    session: AsyncSession,
    provider_id: UUID,
    period_start: datetime | None,
    period_end: datetime | None,
):
    """Return provider financial totals by the UTC date of each event.

    Captures use paid_at; refunds use refunded_at. Neither event falls back to
    created_at, and payment status does not suppress an event already recorded.
    Pending amount is a separate operational figure, not captured revenue.
    """
    gross_paid = await _payment_sum(
        session,
        Payment.amount,
        Payment.paid_at,
        period_start,
        period_end,
        provider_id=provider_id,
    )
    refunded_amount = await _payment_sum(
        session,
        func.coalesce(Payment.refund_amount, 0),
        Payment.refunded_at,
        period_start,
        period_end,
        provider_id=provider_id,
    )

    pending_query = select(
        func.coalesce(func.sum(Payment.amount), 0)
    ).select_from(Payment).join(
        Booking,
        Booking.id == Payment.booking_id,
    ).where(
        Booking.provider_id == provider_id,
        Payment.status == PaymentStatus.PENDING,
    )
    if period_start is not None:
        pending_query = pending_query.where(Payment.created_at >= period_start)
    if period_end is not None:
        pending_query = pending_query.where(Payment.created_at < period_end)
    pending_value = await session.scalar(pending_query)
    pending_amount = Decimal(str(pending_value or 0))

    return {
        "gross_paid": gross_paid,
        "refunded_amount": refunded_amount,
        "net_collected": gross_paid - refunded_amount,
        "pending_amount": pending_amount,
    }


async def admin_status_totals(
    session: AsyncSession,
    period_start: datetime | None,
    period_end: datetime | None,
):
    """Return status summaries and financial totals.

    Status counts/amounts remain operational summaries grouped by creation date.
    Financial totals follow the paid_at/refunded_at UTC event-date contract.
    """
    booking_query = select(
        Booking.status,
        func.count(Booking.id),
    ).group_by(Booking.status)
    if period_start is not None:
        booking_query = booking_query.where(Booking.created_at >= period_start)
    if period_end is not None:
        booking_query = booking_query.where(Booking.created_at < period_end)

    payment_query = select(
        Payment.status,
        func.count(Payment.id),
        func.coalesce(func.sum(Payment.amount), 0),
    ).group_by(Payment.status)
    if period_start is not None:
        payment_query = payment_query.where(Payment.created_at >= period_start)
    if period_end is not None:
        payment_query = payment_query.where(Payment.created_at < period_end)

    bookings = (await session.execute(booking_query)).all()
    payments = (await session.execute(payment_query)).all()

    gross_paid = await _payment_sum(
        session,
        Payment.amount,
        Payment.paid_at,
        period_start,
        period_end,
    )
    refunded_amount = await _payment_sum(
        session,
        func.coalesce(Payment.refund_amount, 0),
        Payment.refunded_at,
        period_start,
        period_end,
    )

    return {
        "booking_counts_by_status": {
            value.value: count for value, count in bookings
        },
        "payment_counts_by_status": {
            value.value: count for value, count, _ in payments
        },
        "payment_amounts_by_status": {
            value.value: Decimal(str(amount or 0))
            for value, _, amount in payments
        },
        "gross_paid": gross_paid,
        "refunded_amount": refunded_amount,
        "net_collected": gross_paid - refunded_amount,
    }
