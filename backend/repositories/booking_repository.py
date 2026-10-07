from datetime import datetime, timedelta, timezone
from hashlib import blake2b
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.booking import Booking, BookingStatus, Payment, PaymentStatus


async def lock_provider(session: AsyncSession, provider_id: UUID) -> None:
    """Serialize writes per provider for the duration of the PostgreSQL transaction."""
    key = int.from_bytes(blake2b(provider_id.bytes, digest_size=8).digest(), "big", signed=True)
    await session.execute(select(func.pg_advisory_xact_lock(key)))


async def get_booking(session: AsyncSession, booking_id: UUID, *, lock: bool = False) -> Booking | None:
    query = select(Booking).where(Booking.id == booking_id)
    if lock:
        query = query.with_for_update()
    return await session.scalar(query)


async def get_payment_by_booking(session: AsyncSession, booking_id: UUID, *, lock: bool = False) -> Payment | None:
    query = select(Payment).where(Payment.booking_id == booking_id)
    if lock:
        query = query.with_for_update()
    return await session.scalar(query)


async def get_payment(session: AsyncSession, payment_id: UUID, *, lock: bool = False) -> Payment | None:
    query = select(Payment).where(Payment.id == payment_id)
    if lock:
        query = query.with_for_update()
    return await session.scalar(query)


async def find_conflicts(session: AsyncSession, provider_id: UUID, start_at: datetime, end_at: datetime,
                         buffer_minutes: int, *, exclude_booking_id: UUID | None = None) -> list[Booking]:
    now = datetime.now(timezone.utc)
    query = select(Booking).where(
        Booking.provider_id == provider_id,
        Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
        or_(Booking.status != BookingStatus.PENDING, Booking.hold_expires_at.is_(None), Booking.hold_expires_at > now),
    )
    if exclude_booking_id:
        query = query.where(Booking.id != exclude_booking_id)
    buffer = timedelta(minutes=buffer_minutes)
    rows = list((await session.scalars(query)).all())
    def conflicts(row: Booking) -> bool:
        if start_at <= row.start_at:
            return end_at + buffer > row.start_at
        return row.end_at + buffer > start_at
    return [row for row in rows if conflicts(row)]


async def list_customer(session: AsyncSession, customer_id: UUID, page: int, page_size: int):
    query = select(Booking).where(Booking.customer_id == customer_id)
    total = await session.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = list((await session.scalars(query.order_by(Booking.start_at.desc()).offset((page - 1) * page_size).limit(page_size))).all())
    return items, total


async def list_provider(session: AsyncSession, provider_id: UUID, start_at: datetime | None = None,
                        end_at: datetime | None = None, page: int = 1, page_size: int = 100):
    query = select(Booking).where(Booking.provider_id == provider_id)
    if start_at:
        query = query.where(Booking.start_at >= start_at)
    if end_at:
        query = query.where(Booking.start_at < end_at)
    total = await session.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = list((await session.scalars(query.order_by(Booking.start_at).offset((page - 1) * page_size).limit(page_size))).all())
    return items, total


async def expire_holds(session: AsyncSession, now: datetime):
    items = list((await session.scalars(select(Booking).where(
        Booking.status == BookingStatus.PENDING,
        Booking.hold_expires_at.is_not(None),
        Booking.hold_expires_at <= now,
    ).with_for_update())).all())
    for booking in items:
        booking.status = BookingStatus.CANCELLED
        booking.cancelled_at = now
        booking.cancellation_reason = "Payment hold expired"
        payment = await get_payment_by_booking(session, booking.id, lock=True)
        if payment and payment.status == PaymentStatus.PENDING:
            payment.status = PaymentStatus.FAILED
            payment.failure_reason = "Payment hold expired"
    return len(items)
