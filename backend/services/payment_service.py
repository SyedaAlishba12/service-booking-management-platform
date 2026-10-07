import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from models.booking import BookingStatus, Payment, PaymentStatus
from repositories.booking_repository import get_booking, get_payment, get_payment_by_booking, lock_provider
from repositories.booking_repository import find_conflicts
from services import availability_service, booking_service, service_service
from services.booking_service import _setting

UTC = timezone.utc


async def get_or_create_payment(session: AsyncSession, booking_id: UUID, method: str | None) -> Payment:
    booking = await get_booking(session, booking_id, lock=True)
    if booking is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found")
    payment = await get_payment_by_booking(session, booking.id)
    if payment is None:
        payment = Payment(booking_id=booking.id, amount=booking.price, status=PaymentStatus.PENDING, payment_method=method or "MOCK_CARD")
        session.add(payment)
        await session.flush()
    await session.commit()
    await session.refresh(payment)
    return payment


async def mock_success(session: AsyncSession, payment_id: UUID) -> Payment:
    payment = await get_payment(session, payment_id, lock=True)
    if payment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found")
    booking = await get_booking(session, payment.booking_id, lock=True)
    if booking is None or booking.status != BookingStatus.PENDING:
        raise HTTPException(status.HTTP_409_CONFLICT, "Booking is not awaiting payment")
    now = datetime.now(UTC)
    if booking.hold_expires_at is not None and booking.hold_expires_at <= now:
        raise HTTPException(status.HTTP_409_CONFLICT, "The booking hold has expired")
    if payment.status != PaymentStatus.PENDING:
        raise HTTPException(status.HTTP_409_CONFLICT, "This payment cannot be completed")
    payment.status, payment.paid_at = PaymentStatus.PAID, now
    payment.transaction_reference = f"MOCK-{secrets.token_hex(12).upper()}"
    payment.failure_reason = None
    await session.flush()
    await booking_service.confirm_booking(session, booking)
    await session.commit()
    await session.refresh(payment)
    return payment


async def mock_failure(session: AsyncSession, payment_id: UUID, reason: str) -> Payment:
    payment = await get_payment(session, payment_id, lock=True)
    if payment is None or payment.status != PaymentStatus.PENDING:
        raise HTTPException(status.HTTP_409_CONFLICT, "Only a pending payment can fail")
    booking = await get_booking(session, payment.booking_id, lock=True)
    if booking is None or booking.status != BookingStatus.PENDING:
        raise HTTPException(status.HTTP_409_CONFLICT, "Booking is not awaiting payment")
    payment.status, payment.failure_reason = PaymentStatus.FAILED, reason
    booking.hold_expires_at = datetime.now(UTC)
    await session.commit()
    await session.refresh(payment)
    return payment


async def retry(session: AsyncSession, payment_id: UUID, method: str | None) -> Payment:
    payment = await get_payment(session, payment_id, lock=True)
    if payment is None or payment.status != PaymentStatus.FAILED:
        raise HTTPException(status.HTTP_409_CONFLICT, "Only failed payments can be retried")
    booking = await get_booking(session, payment.booking_id, lock=True)
    if booking is None or booking.status != BookingStatus.PENDING:
        raise HTTPException(status.HTTP_409_CONFLICT, "Booking cannot be retried")
    await lock_provider(session, booking.provider_id)
    await service_service.ensure_service_bookable(session, booking.service_id, booking.provider_id)
    snapshot = await availability_service.get_provider_availability(
        session, booking.provider_id, booking.start_at.date(), booking.start_at.date()
    )
    try:
        local_day = booking.start_at.astimezone(ZoneInfo(snapshot.timezone)).date()
    except ZoneInfoNotFoundError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Provider timezone is invalid") from exc
    snapshot, _, slots = await booking_service._slots_for_date(
        session, booking.provider_id, booking.service_id, local_day, exclude_booking_id=booking.id
    )
    if (booking.start_at, booking.end_at) not in {(slot["start_at"], slot["end_at"]) for slot in slots}:
        raise HTTPException(status.HTTP_409_CONFLICT, "The original slot is no longer available")
    conflicts = await find_conflicts(session, booking.provider_id, booking.start_at, booking.end_at,
                                     snapshot.buffer_minutes, exclude_booking_id=booking.id)
    if conflicts:
        raise HTTPException(status.HTTP_409_CONFLICT, "The original slot is no longer available")
    hold = int(await _setting(session, "payment_hold_minutes", 15))
    payment.status, payment.failure_reason = PaymentStatus.PENDING, None
    payment.payment_method = method or payment.payment_method
    booking.hold_expires_at = datetime.now(UTC) + timedelta(minutes=hold)
    await session.commit()
    await session.refresh(payment)
    return payment


async def refund(session: AsyncSession, payment_id: UUID, amount: Decimal | None = None) -> Payment:
    payment = await get_payment(session, payment_id, lock=True)
    if payment is None or payment.status != PaymentStatus.PAID:
        raise HTTPException(status.HTTP_409_CONFLICT, "Only paid payments can be refunded")
    refund_amount = payment.amount if amount is None else Decimal(amount).quantize(Decimal("0.01"))
    if refund_amount < 0 or refund_amount > payment.amount:
        raise HTTPException(422, "Refund amount exceeds payment amount")
    payment.status, payment.refund_amount, payment.refunded_at = PaymentStatus.REFUNDED, refund_amount, datetime.now(UTC)
    await session.commit()
    await session.refresh(payment)
    return payment
