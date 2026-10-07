"""Booking lifecycle and the single source of truth for generated time slots."""
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
import re
import secrets
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.booking import Booking, BookingStatus, Payment, PaymentStatus
from models.customer import Customer
from models.provider import Provider
from repositories.booking_repository import expire_holds as expire_booking_holds, find_conflicts, get_booking, get_payment_by_booking, lock_provider
from schemas.booking import BookingCreate, BookingReschedule
from services import availability_service, platform_setting_service, service_service
from services.notification_integration import notify

UTC = timezone.utc
CENT = Decimal("0.01")


def _utc(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        raise HTTPException(422, "Datetime must include a timezone offset")
    return value.astimezone(UTC)


def _local_instants(day: date, wall_time: time, tz: ZoneInfo) -> list[datetime]:
    naive = datetime.combine(day, wall_time.replace(tzinfo=None))
    found = []
    for fold in (0, 1):
        candidate = naive.replace(tzinfo=tz, fold=fold).astimezone(UTC)
        if candidate.astimezone(tz).replace(tzinfo=None) == naive and candidate not in found:
            found.append(candidate)
    return sorted(found)


async def _setting(session: AsyncSession, key: str, default):
    try:
        value = await platform_setting_service.get_setting_value(session, key)
        return default if value is None else value
    except platform_setting_service.SettingNotFoundError:
        return default


def _day_windows(snapshot, day: date):
    weekly = [row for row in snapshot.weekly if row.day_of_week == day.weekday()]
    exception = next((row for row in snapshot.exceptions if row.exception_date == day), None)
    if exception and exception.is_day_off:
        return [], []
    breaks = [(row.start_time, row.end_time) for row in weekly if row.is_break]
    if exception:
        # Custom hours replace weekly work hours; weekly break windows remain in force.
        return ([(exception.start_time, exception.end_time)] if exception.start_time and exception.end_time else []), breaks
    return [(row.start_time, row.end_time) for row in weekly if not row.is_break], breaks


def _intersects_break(start: datetime, end: datetime, day: date, tz: ZoneInfo, breaks) -> bool:
    for break_start, break_end in breaks:
        starts, ends = _local_instants(day, break_start, tz), _local_instants(day, break_end, tz)
        if any(start < e and end > s for s in starts for e in ends if e > s):
            return True
    return False


async def _slots_for_date(
    session: AsyncSession, provider_id: UUID, service_id: UUID, day: date,
    *, exclude_booking_id: UUID | None = None,
):
    snapshot = await availability_service.get_provider_availability(session, provider_id, day, day)
    service = await service_service.ensure_service_bookable(session, service_id, provider_id)
    if snapshot.slot_interval_minutes <= 0 or snapshot.buffer_minutes < 0 or service.duration_minutes <= 0:
        raise HTTPException(502, "Provider scheduling configuration is invalid")
    try:
        tz = ZoneInfo(snapshot.timezone)
    except ZoneInfoNotFoundError as exc:
        raise HTTPException(502, "Provider timezone is invalid") from exc
    duration = timedelta(minutes=service.duration_minutes)
    step = timedelta(minutes=snapshot.slot_interval_minutes)
    windows, breaks = _day_windows(snapshot, day)
    candidates = set()
    for window_start_time, window_end_time in windows:
        starts = _local_instants(day, window_start_time, tz)
        ends = _local_instants(day, window_end_time, tz)
        for window_start in starts:
            window_ends = [end for end in ends if end > window_start]
            if not window_ends:
                continue
            window_end = min(window_ends)
            cursor = window_start
            while cursor + duration <= window_end:
                finish = cursor + duration
                local_day = cursor.astimezone(tz).date()
                if not _intersects_break(cursor, finish, local_day, tz, breaks):
                    candidates.add((cursor, finish))
                cursor += step
    now = datetime.now(UTC)
    results = []
    for start, end in sorted(candidates):
        if start <= now:
            continue
        conflicts = await find_conflicts(
            session, provider_id, start, end, snapshot.buffer_minutes,
            exclude_booking_id=exclude_booking_id,
        )
        if not conflicts:
            results.append({"start_at": start, "end_at": end, "provider_timezone": snapshot.timezone})
    return snapshot, service, results


async def get_available_slots(
    session: AsyncSession, provider_id: UUID, service_id: UUID, from_date: date, to_date: date,
):
    if to_date < from_date or (to_date - from_date).days > 31:
        raise HTTPException(422, "Date range must be valid and no longer than 31 days")
    slots = []
    day = from_date
    while day <= to_date:
        _, _, daily = await _slots_for_date(session, provider_id, service_id, day)
        slots.extend(daily)
        day += timedelta(days=1)
    return slots


async def create_booking(session: AsyncSession, user_id: UUID, data: BookingCreate) -> Booking:
    customer_id = await session.scalar(select(Customer.id).where(Customer.user_id == user_id))
    if customer_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Customer profile not found")
    start_at = _utc(data.start_at)
    await service_service.ensure_service_bookable(session, data.service_id, data.provider_id)
    initial = await availability_service.get_provider_availability(
        session, data.provider_id, start_at.date(), start_at.date()
    )
    try:
        local_day = start_at.astimezone(ZoneInfo(initial.timezone)).date()
    except ZoneInfoNotFoundError as exc:
        raise HTTPException(502, "Provider timezone is invalid") from exc
    snapshot, service, slots = await _slots_for_date(session, data.provider_id, data.service_id, local_day)
    duration = timedelta(minutes=service.duration_minutes)
    if (start_at, start_at + duration) not in {(x["start_at"], x["end_at"]) for x in slots}:
        raise HTTPException(status.HTTP_409_CONFLICT, "The selected slot is no longer available")
    hold_minutes = int(await _setting(session, "payment_hold_minutes", 15))
    if hold_minutes <= 0:
        raise HTTPException(502, "payment_hold_minutes must be positive")
    await lock_provider(session, data.provider_id)
    await service_service.ensure_service_bookable(session, data.service_id, data.provider_id)
    conflicts = await find_conflicts(session, data.provider_id, start_at, start_at + duration, snapshot.buffer_minutes)
    if conflicts:
        raise HTTPException(status.HTTP_409_CONFLICT, "The selected slot was just booked")
    booking = Booking(
        customer_id=customer_id,
        provider_id=data.provider_id,
        service_id=data.service_id,
        start_at=start_at,
        end_at=start_at + duration,
        status=BookingStatus.PENDING,
        price=Decimal(str(service.price)).quantize(CENT, rounding=ROUND_HALF_UP),
        notes=data.notes,
        hold_expires_at=datetime.now(UTC) + timedelta(minutes=hold_minutes),
    )
    session.add(booking)
    await session.flush()
    session.add(Payment(booking_id=booking.id, amount=booking.price, status=PaymentStatus.PENDING, payment_method="MOCK_CARD"))
    await session.commit()
    await session.refresh(booking)
    return booking


async def _notify_event(session: AsyncSession, booking: Booking, event: str):
    customer_user_id = await session.scalar(select(Customer.user_id).where(Customer.id == booking.customer_id))
    provider_user_id = await session.scalar(select(Provider.user_id).where(Provider.id == booking.provider_id))
    title = {
        "BOOKING_CONFIRMED": "Booking confirmed",
        "BOOKING_CANCELLED": "Booking cancelled",
        "BOOKING_RESCHEDULED": "Booking rescheduled",
    }[event]
    message = f"Booking {booking.id} is now {booking.status.value.lower().replace('_', ' ')}."
    for user_id in {customer_user_id, provider_user_id} - {None}:
        await notify(
            session=session, user_id=user_id, notification_type=event, title=title,
            message=message, entity_type="booking", entity_id=booking.id,
        )


async def confirm_booking(session: AsyncSession, booking: Booking) -> Booking:
    if booking.status != BookingStatus.PENDING:
        raise HTTPException(status.HTTP_409_CONFLICT, "Only pending bookings can be confirmed")
    payment = await get_payment_by_booking(session, booking.id, lock=True)
    if payment is None or payment.status != PaymentStatus.PAID:
        raise HTTPException(status.HTTP_409_CONFLICT, "A successful payment is required before confirmation")
    now = datetime.now(UTC)
    booking.status, booking.confirmed_at, booking.hold_expires_at, booking.updated_at = BookingStatus.CONFIRMED, now, None, now
    await session.flush()
    await _notify_event(session, booking, "BOOKING_CONFIRMED")
    return booking


def _refund_eligible(policy: str, hours_until_start: Decimal) -> bool:
    match = re.search(r"full\s+refund.*?(\d+)\s+hours?", policy, flags=re.I)
    return bool(match and hours_until_start >= Decimal(match.group(1)))


async def cancel_booking(session: AsyncSession, booking: Booking, reason: str | None) -> Booking:
    if booking.status not in (BookingStatus.PENDING, BookingStatus.CONFIRMED):
        raise HTTPException(status.HTTP_409_CONFLICT, "This booking cannot be cancelled")
    now = datetime.now(UTC)
    hours_left = Decimal(str((booking.start_at - now).total_seconds() / 3600))
    min_hours = Decimal(str(await _setting(session, "minimum_cancellation_hours", 24)))
    if booking.status == BookingStatus.CONFIRMED and hours_left < min_hours:
        raise HTTPException(status.HTTP_409_CONFLICT, "The cancellation window has passed")
    booking.status, booking.cancellation_reason = BookingStatus.CANCELLED, reason
    booking.cancelled_at, booking.hold_expires_at, booking.updated_at = now, now, now
    payment = await get_payment_by_booking(session, booking.id, lock=True)
    if payment and payment.status == PaymentStatus.PENDING:
        payment.status, payment.failure_reason = PaymentStatus.FAILED, "Booking cancelled before payment"
    elif payment and payment.status == PaymentStatus.PAID:
        policy = str(await _setting(session, "refund_policy", ""))
        if _refund_eligible(policy, hours_left):
            payment.status, payment.refund_amount, payment.refunded_at = PaymentStatus.REFUNDED, payment.amount, now
    await session.flush()
    await _notify_event(session, booking, "BOOKING_CANCELLED")
    await session.commit()
    await session.refresh(booking)
    return booking


async def reschedule_booking(session: AsyncSession, booking: Booking, data: BookingReschedule) -> Booking:
    if booking.status not in (BookingStatus.PENDING, BookingStatus.CONFIRMED):
        raise HTTPException(status.HTTP_409_CONFLICT, "This booking cannot be rescheduled")
    now, new_start = datetime.now(UTC), _utc(data.start_at)
    hours_left = Decimal(str((booking.start_at - now).total_seconds() / 3600))
    minimum = Decimal(str(await _setting(session, "minimum_reschedule_hours", 12)))
    if hours_left < minimum:
        raise HTTPException(status.HTTP_409_CONFLICT, "The rescheduling window has passed")
    service = await service_service.ensure_service_bookable(session, booking.service_id, booking.provider_id)
    initial = await availability_service.get_provider_availability(session, booking.provider_id, new_start.date(), new_start.date())
    local_day = new_start.astimezone(ZoneInfo(initial.timezone)).date()
    snapshot, _, slots = await _slots_for_date(session, booking.provider_id, booking.service_id, local_day, exclude_booking_id=booking.id)
    new_end = new_start + timedelta(minutes=service.duration_minutes)
    if (new_start, new_end) not in {(x["start_at"], x["end_at"]) for x in slots}:
        raise HTTPException(status.HTTP_409_CONFLICT, "The requested slot is not available")
    await lock_provider(session, booking.provider_id)
    conflicts = await find_conflicts(session, booking.provider_id, new_start, new_end, snapshot.buffer_minutes, exclude_booking_id=booking.id)
    if conflicts:
        raise HTTPException(status.HTTP_409_CONFLICT, "The requested slot was just booked")
    booking.start_at, booking.end_at, booking.updated_at = new_start, new_end, now
    if booking.status == BookingStatus.PENDING:
        hold = int(await _setting(session, "payment_hold_minutes", 15))
        booking.hold_expires_at = now + timedelta(minutes=hold)
    await session.flush()
    await _notify_event(session, booking, "BOOKING_RESCHEDULED")
    await session.commit()
    await session.refresh(booking)
    return booking


async def complete_booking(session: AsyncSession, booking: Booking) -> Booking:
    if booking.status != BookingStatus.CONFIRMED:
        raise HTTPException(status.HTTP_409_CONFLICT, "Only confirmed bookings can be completed")
    now = datetime.now(UTC)
    if now < booking.end_at:
        raise HTTPException(status.HTTP_409_CONFLICT, "A booking cannot be completed before its scheduled end")
    booking.status, booking.completed_at, booking.updated_at = BookingStatus.COMPLETED, now, now
    await session.commit()
    await session.refresh(booking)
    return booking


async def mark_no_show(session: AsyncSession, booking: Booking) -> Booking:
    if booking.status != BookingStatus.CONFIRMED or datetime.now(UTC) < booking.start_at:
        raise HTTPException(status.HTTP_409_CONFLICT, "Only started confirmed bookings can be marked no-show")
    now = datetime.now(UTC)
    booking.status, booking.no_show_at, booking.updated_at = BookingStatus.NO_SHOW, now, now
    await session.commit()
    await session.refresh(booking)
    return booking


async def get_review_eligibility(session: AsyncSession, booking_id: UUID, user_id: UUID):
    """Injected into Taha's existing set_eligibility_provider seam."""
    from services.booking_eligibility import ReviewEligibility
    booking = await get_booking(session, booking_id)
    if booking is None:
        return ReviewEligibility(False, False, None, None)
    customer_id = await session.scalar(select(Customer.id).where(Customer.user_id == user_id))
    return ReviewEligibility(
        completed=booking.status == BookingStatus.COMPLETED,
        owned=customer_id is not None and booking.customer_id == customer_id,
        provider_id=booking.provider_id,
        service_id=booking.service_id,
    )


async def get_upcoming_appointments_for_reminders(session: AsyncSession, from_at: datetime, to_at: datetime):
    """Zainab's scheduler calls this service instead of querying bookings directly."""
    if from_at.tzinfo is None or to_at.tzinfo is None or from_at >= to_at:
        raise HTTPException(422, "A valid timezone-aware reminder range is required")
    rows = list((await session.scalars(select(Booking).where(
        Booking.status == BookingStatus.CONFIRMED,
        Booking.start_at >= from_at.astimezone(UTC), Booking.start_at < to_at.astimezone(UTC),
    ).order_by(Booking.start_at))).all())
    result = []
    for booking in rows:
        result.append({
            "booking_id": booking.id,
            "customer_user_id": await session.scalar(select(Customer.user_id).where(Customer.id == booking.customer_id)),
            "provider_user_id": await session.scalar(select(Provider.user_id).where(Provider.id == booking.provider_id)),
            "provider_timezone": await session.scalar(select(Provider.timezone).where(Provider.id == booking.provider_id)),
            "provider_id": booking.provider_id, "service_id": booking.service_id,
            "start_at": booking.start_at, "end_at": booking.end_at,
        })
    return result


async def send_appointment_reminders(session: AsyncSession, from_at: datetime, to_at: datetime) -> int:
    """Create one reminder per booking recipient; a scheduler can call this periodically."""
    from models.notification import Notification, NotificationType

    appointments = await get_upcoming_appointments_for_reminders(session, from_at, to_at)
    sent = 0
    for appointment in appointments:
        try:
            local_start = appointment["start_at"].astimezone(ZoneInfo(appointment["provider_timezone"] or "UTC"))
        except ZoneInfoNotFoundError:
            local_start = appointment["start_at"].astimezone(UTC)
        start_label = local_start.strftime("%A, %B %d at %I:%M %p %Z")
        for user_id in {appointment["customer_user_id"], appointment["provider_user_id"]} - {None}:
            exists = await session.scalar(select(Notification.id).where(
                Notification.user_id == user_id,
                Notification.notification_type == NotificationType.APPOINTMENT_REMINDER,
                Notification.entity_type == "booking",
                Notification.entity_id == appointment["booking_id"],
            ).limit(1))
            if exists is None:
                await notify(
                    session=session,
                    user_id=user_id,
                    notification_type="APPOINTMENT_REMINDER",
                    title="Appointment reminder",
                    message=f"Your appointment is scheduled for {start_label}.",
                    entity_type="booking",
                    entity_id=appointment["booking_id"],
                )
                sent += 1
    await session.commit()
    return sent


async def expire_payment_holds(session: AsyncSession, now: datetime | None = None) -> int:
    """Scheduler entry point: expire unpaid holds and release their slots."""
    instant = _utc(now) if now is not None else datetime.now(UTC)
    count = await expire_booking_holds(session, instant)
    await session.commit()
    return count
