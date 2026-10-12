import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from models.booking import Booking, BookingStatus, Payment, PaymentStatus
from repositories.booking_repository import (
    find_conflicts,
    get_booking,
    get_payment,
    get_payment_by_booking,
    lock_provider,
)
from services import availability_service, booking_service, service_service
from services.booking_service import _setting


UTC = timezone.utc
CENT = Decimal("0.01")


async def _get_locked_payment_and_booking(
    session: AsyncSession,
    payment_id: UUID,
) -> tuple[Booking, Payment]:
    """
    Lock booking first, then payment.

    The hold-expiry worker uses the same order. Keeping that order avoids
    a booking/payment row-lock deadlock.
    """
    payment_ref = await get_payment(session, payment_id)
    if payment_ref is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Payment not found",
        )

    booking = await get_booking(
        session,
        payment_ref.booking_id,
        lock=True,
    )
    if booking is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Booking not found",
        )

    payment = await get_payment_by_booking(
        session,
        booking.id,
        lock=True,
    )
    if payment is None or payment.id != payment_id:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Payment not found",
        )

    return booking, payment


async def get_or_create_payment(
    session: AsyncSession,
    booking_id: UUID,
    method: str | None,
) -> Payment:
    booking = await get_booking(session, booking_id, lock=True)
    if booking is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Booking not found",
        )

    payment = await get_payment_by_booking(
        session,
        booking.id,
        lock=True,
    )

    if payment is None:
        if booking.status != BookingStatus.PENDING:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Only pending bookings can receive a payment",
            )

        now = datetime.now(UTC)
        if (
            booking.hold_expires_at is not None
            and booking.hold_expires_at <= now
        ):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "The booking hold has expired",
            )

        payment = Payment(
            booking_id=booking.id,
            amount=booking.price,
            status=PaymentStatus.PENDING,
            payment_method=method or "MOCK_CARD",
        )
        session.add(payment)
        await session.flush()

    await session.commit()
    await session.refresh(payment)
    return payment


async def mock_success(
    session: AsyncSession,
    payment_id: UUID,
) -> Payment:
    booking, payment = await _get_locked_payment_and_booking(
        session,
        payment_id,
    )

    if booking.status != BookingStatus.PENDING:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Booking is not awaiting payment",
        )

    now = datetime.now(UTC)
    if (
        booking.hold_expires_at is not None
        and booking.hold_expires_at <= now
    ):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "The booking hold has expired",
        )

    if payment.status != PaymentStatus.PENDING:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "This payment cannot be completed",
        )

    payment.status = PaymentStatus.PAID
    payment.paid_at = now
    payment.transaction_reference = (
        f"MOCK-{secrets.token_hex(12).upper()}"
    )
    payment.failure_reason = None
    payment.updated_at = now

    await session.flush()

    # This also confirms the booking and commits the transaction.
    await booking_service.confirm_booking(session, booking)
    await session.refresh(payment)
    return payment


async def mock_failure(
    session: AsyncSession,
    payment_id: UUID,
    reason: str,
) -> Payment:
    booking, payment = await _get_locked_payment_and_booking(
        session,
        payment_id,
    )

    if payment.status != PaymentStatus.PENDING:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Only a pending payment can fail",
        )
    if booking.status != BookingStatus.PENDING:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Booking is not awaiting payment",
        )

    now = datetime.now(UTC)
    payment.status = PaymentStatus.FAILED
    payment.failure_reason = reason
    payment.updated_at = now

    # The slot is released until the customer successfully retries.
    booking.hold_expires_at = now
    booking.updated_at = now

    await session.commit()
    await session.refresh(payment)
    return payment


async def retry(
    session: AsyncSession,
    payment_id: UUID,
    method: str | None,
) -> Payment:
    booking, payment = await _get_locked_payment_and_booking(
        session,
        payment_id,
    )

    if payment.status != PaymentStatus.FAILED:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Only failed payments can be retried",
        )
    if booking.status != BookingStatus.PENDING:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Booking cannot be retried",
        )

    await lock_provider(session, booking.provider_id)
    await service_service.ensure_service_bookable(
        session,
        booking.service_id,
        booking.provider_id,
    )

    snapshot = await availability_service.get_provider_availability(
        session,
        booking.provider_id,
        booking.start_at.date(),
        booking.start_at.date(),
    )

    try:
        provider_timezone = ZoneInfo(snapshot.timezone)
    except (ZoneInfoNotFoundError, TypeError, ValueError) as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "Provider timezone is invalid",
        ) from exc

    local_day = booking.start_at.astimezone(provider_timezone).date()

    snapshot, _, slots = await booking_service._slots_for_date(
        session,
        booking.provider_id,
        booking.service_id,
        local_day,
        exclude_booking_id=booking.id,
    )

    if (booking.start_at, booking.end_at) not in {
        (slot["start_at"], slot["end_at"])
        for slot in slots
    }:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "The original slot is no longer available",
        )

    conflicts = await find_conflicts(
        session,
        booking.provider_id,
        booking.start_at,
        booking.end_at,
        snapshot.buffer_minutes,
        exclude_booking_id=booking.id,
    )
    if conflicts:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "The original slot is no longer available",
        )

    hold_minutes = int(
        await _setting(session, "payment_hold_minutes", 15)
    )
    if hold_minutes <= 0:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "payment_hold_minutes must be positive",
        )

    now = datetime.now(UTC)
    payment.status = PaymentStatus.PENDING
    payment.failure_reason = None
    payment.payment_method = (
        method or payment.payment_method or "MOCK_CARD"
    )
    payment.paid_at = None
    payment.transaction_reference = None
    payment.updated_at = now

    booking.hold_expires_at = now + timedelta(minutes=hold_minutes)
    booking.updated_at = now

    await session.commit()
    await session.refresh(payment)
    return payment


async def refund(
    session: AsyncSession,
    payment_id: UUID,
    amount: Decimal | None = None,
) -> Payment:
    payment = await get_payment(
        session,
        payment_id,
        lock=True,
    )
    if payment is None or payment.status != PaymentStatus.PAID:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Only paid payments can be refunded",
        )

    if amount is None:
        refund_amount = payment.amount
    else:
        refund_amount = Decimal(str(amount)).quantize(
            CENT,
            rounding=ROUND_HALF_UP,
        )

    if refund_amount <= 0 or refund_amount > payment.amount:
        raise HTTPException(
            422,
            "Refund amount must be positive and cannot exceed payment amount",
        )

    # The payment model has REFUNDED but no PARTIALLY_REFUNDED status.
    if refund_amount != payment.amount:
        raise HTTPException(
            422,
            "Partial refunds are not supported",
        )

    now = datetime.now(UTC)
    payment.status = PaymentStatus.REFUNDED
    payment.refund_amount = refund_amount
    payment.refunded_at = now
    payment.updated_at = now

    await session.commit()
    await session.refresh(payment)
    return payment