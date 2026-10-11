from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.booking import Booking, BookingStatus
from models.customer import Customer
from models.user import User
from repositories.booking_repository import list_provider


async def provider_calendar(session: AsyncSession, provider_id: UUID, from_at: datetime, to_at: datetime):
    if from_at.tzinfo is None or to_at.tzinfo is None or from_at >= to_at:
        raise HTTPException(422, "A valid timezone-aware date range is required")
    rows, _ = await list_provider(session, provider_id, from_at.astimezone(timezone.utc), to_at.astimezone(timezone.utc), page=1, page_size=100)
    return rows


async def provider_customer_ids(session: AsyncSession, provider_id: UUID):
    rows = (await session.execute(
        select(Customer.id, User.full_name, func.count(Booking.id), func.max(Booking.start_at))
        .join(Booking, Booking.customer_id == Customer.id)
        .join(User, User.id == Customer.user_id)
        .where(Booking.provider_id == provider_id)
        .group_by(Customer.id, User.full_name)
        .order_by(User.full_name)
    )).all()
    return [
        {"customer_id": row[0], "customer_name": row[1], "booking_count": row[2], "last_booking_at": row[3]}
        for row in rows
    ]


async def completed_booking_counts_by_service(session: AsyncSession, period_start: datetime, period_end: datetime, limit: int = 10):
    if period_start.tzinfo is None or period_end.tzinfo is None or period_start >= period_end:
        raise HTTPException(422, "A valid timezone-aware reporting range is required")
    rows = (await session.execute(
        select(Booking.service_id, func.count(Booking.id).label("completed_count"))
        .where(Booking.status == BookingStatus.COMPLETED,
               Booking.completed_at >= period_start.astimezone(timezone.utc),
               Booking.completed_at < period_end.astimezone(timezone.utc))
        .group_by(Booking.service_id).order_by(func.count(Booking.id).desc()).limit(max(1, min(limit, 100)))
    )).all()
    return [{"service_id": row.service_id, "completed_count": row.completed_count} for row in rows]
