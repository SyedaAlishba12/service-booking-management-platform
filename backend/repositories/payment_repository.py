from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.booking import Booking, BookingStatus, Payment, PaymentStatus


ZERO = Decimal("0.00")


def _apply_period(query, date_expression, period_start, period_end):
    if period_start is not None:
        query = query.where(date_expression >= period_start)
    if period_end is not None:
        query = query.where(date_expression < period_end)
    return query


async def _payment_sum(
    session: AsyncSession,
    amount_expression,
    statuses: tuple[PaymentStatus, ...],
    date_expression,
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

    query = query.where(Payment.status.in_(statuses))
    query = _apply_period(
        query,
        date_expression,
        period_start,
        period_end,
    )

    value = await session.scalar(query)
    return Decimal(str(value or 0))


async def provider_totals(
    session: AsyncSession,
    provider_id: UUID,
    period_start: datetime | None,
    period_end: datetime | None,
):
    """
    Return payment totals by financial event date:
    - captured payments use paid_at, falling back to created_at;
    - refunds use refunded_at, then paid_at, then created_at;
    - pending payments use created_at.
    """
    captured_date = func.coalesce(
        Payment.paid_at,
        Payment.created_at,
    )
    refund_date = func.coalesce(
        Payment.refunded_at,
        Payment.paid_at,
        Payment.created_at,
    )

    gross_paid = await _payment_sum(
        session,
        Payment.amount,
        (PaymentStatus.PAID, PaymentStatus.REFUNDED),
        captured_date,
        period_start,
        period_end,
        provider_id=provider_id,
    )

    refunded_amount = await _payment_sum(
        session,
        func.coalesce(Payment.refund_amount, 0),
        (PaymentStatus.REFUNDED,),
        refund_date,
        period_start,
        period_end,
        provider_id=provider_id,
    )

    pending_amount = await _payment_sum(
        session,
        Payment.amount,
        (PaymentStatus.PENDING,),
        Payment.created_at,
        period_start,
        period_end,
        provider_id=provider_id,
    )

    return {
        "gross_paid": gross_paid,
        "refunded_amount": refunded_amount,
        "pending_amount": pending_amount,
    }


async def admin_status_totals(
    session: AsyncSession,
    period_start: datetime | None,
    period_end: datetime | None,
):
    """
    Return booking/payment status summaries plus financial totals.

    Status counts and status amounts are grouped by record creation date.
    The separate gross/refund/net fields use their financial event dates.
    """
    booking_query = (
        select(
            Booking.status,
            func.count(Booking.id),
        )
        .group_by(Booking.status)
    )
    booking_query = _apply_period(
        booking_query,
        Booking.created_at,
        period_start,
        period_end,
    )

    payment_query = (
        select(
            Payment.status,
            func.count(Payment.id),
            func.coalesce(func.sum(Payment.amount), 0),
        )
        .group_by(Payment.status)
    )
    payment_query = _apply_period(
        payment_query,
        Payment.created_at,
        period_start,
        period_end,
    )

    bookings = (await session.execute(booking_query)).all()
    payments = (await session.execute(payment_query)).all()

    captured_date = func.coalesce(
        Payment.paid_at,
        Payment.created_at,
    )
    refund_date = func.coalesce(
        Payment.refunded_at,
        Payment.paid_at,
        Payment.created_at,
    )

    gross_paid = await _payment_sum(
        session,
        Payment.amount,
        (PaymentStatus.PAID, PaymentStatus.REFUNDED),
        captured_date,
        period_start,
        period_end,
    )

    refunded_amount = await _payment_sum(
        session,
        func.coalesce(Payment.refund_amount, 0),
        (PaymentStatus.REFUNDED,),
        refund_date,
        period_start,
        period_end,
    )

    return {
        "booking_counts_by_status": {
            booking_status.value: count
            for booking_status, count in bookings
        },
        "payment_counts_by_status": {
            payment_status.value: count
            for payment_status, count, _ in payments
        },
        "payment_amounts_by_status": {
            payment_status.value: Decimal(str(amount or 0))
            for payment_status, _, amount in payments
        },
        "gross_paid": gross_paid,
        "refunded_amount": refunded_amount,
        "net_collected": gross_paid - refunded_amount,
    }