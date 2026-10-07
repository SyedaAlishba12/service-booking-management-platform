"""Availability business logic. See provider_service.py for conventions.

Times are stored in the provider's local time (providers.timezone).
Weekly rows: is_break=False is a working window, is_break=True is a break.
Rows of the same kind must not overlap on the same day.
"""
from datetime import date, time
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from models.availability import Availability, AvailabilityException
from repositories.availability_repository import AvailabilityRepository
from schemas.availability import (
    AvailabilityCreate,
    AvailabilityExceptionCreate,
    AvailabilityExceptionUpdate,
    AvailabilityUpdate,
    ProviderAvailabilityResponse,
)
from services import provider_service


def _check_order(start: time | None, end: time | None) -> None:
    if start is None or end is None or end <= start:
        raise HTTPException(
            422, "end_time must be after start_time"
        )


# ---------- read (for Booking / public) ----------
async def get_provider_availability(
    session: AsyncSession,
    provider_id: UUID,
    from_date: date | None = None,
    to_date: date | None = None,
) -> ProviderAvailabilityResponse:
    """Everything slot generation needs: weekly windows and breaks, date exceptions
    (optionally limited to a date range), plus slot interval, buffer and timezone."""
    provider = await provider_service.get_provider(session, provider_id)
    repo = AvailabilityRepository(session)
    weekly = await repo.list_weekly(provider.id)
    exceptions = await repo.list_exceptions(provider.id, from_date, to_date)
    return ProviderAvailabilityResponse(
        provider_id=provider.id,
        timezone=provider.timezone,
        slot_interval_minutes=provider.slot_interval_minutes,
        buffer_minutes=provider.buffer_minutes,
        weekly=weekly,
        exceptions=exceptions,
    )


async def list_my_availability(
    session: AsyncSession, user_id: UUID
) -> ProviderAvailabilityResponse:
    provider = await provider_service.get_provider_by_user(session, user_id)
    return await get_provider_availability(session, provider.id)


# ---------- weekly schedule ----------
async def add_availability(
    session: AsyncSession, user_id: UUID, data: AvailabilityCreate
) -> Availability:
    provider = await provider_service.get_provider_by_user(session, user_id)
    repo = AvailabilityRepository(session)
    if await repo.has_overlap(
        provider.id, data.day_of_week, data.is_break, data.start_time, data.end_time
    ):
        raise HTTPException(
            status.HTTP_409_CONFLICT, "This time overlaps an existing entry for that day"
        )
    row = Availability(provider_id=provider.id, **data.model_dump())
    await repo.add_weekly(row)
    await session.commit()
    return row


async def update_availability(
    session: AsyncSession,
    user_id: UUID,
    availability_id: UUID,
    data: AvailabilityUpdate,
) -> Availability:
    provider = await provider_service.get_provider_by_user(session, user_id)
    repo = AvailabilityRepository(session)
    row = await repo.get_weekly(availability_id, provider.id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Availability not found")

    changes = data.model_dump(exclude_unset=True)
    if any(changes.get(f, "x") is None for f in ("day_of_week", "start_time", "end_time", "is_break")):
        raise HTTPException(
            422, "Fields cannot be set to null"
        )
    day = changes.get("day_of_week", row.day_of_week)
    start = changes.get("start_time", row.start_time)
    end = changes.get("end_time", row.end_time)
    is_break = changes.get("is_break", row.is_break)
    _check_order(start, end)
    if await repo.has_overlap(
        provider.id, day, is_break, start, end, exclude_id=row.id
    ):
        raise HTTPException(
            status.HTTP_409_CONFLICT, "This time overlaps an existing entry for that day"
        )
    row.day_of_week, row.start_time, row.end_time, row.is_break = (
        day,
        start,
        end,
        is_break,
    )
    await repo.save_weekly(row)
    await session.commit()
    return row


async def delete_availability(
    session: AsyncSession, user_id: UUID, availability_id: UUID
) -> None:
    provider = await provider_service.get_provider_by_user(session, user_id)
    repo = AvailabilityRepository(session)
    row = await repo.get_weekly(availability_id, provider.id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Availability not found")
    await repo.delete_weekly(row)
    await session.commit()


# ---------- exceptions (days off, holidays, custom hours) ----------
async def add_exception(
    session: AsyncSession, user_id: UUID, data: AvailabilityExceptionCreate
) -> AvailabilityException:
    provider = await provider_service.get_provider_by_user(session, user_id)
    repo = AvailabilityRepository(session)
    if await repo.exception_exists_for_date(provider.id, data.exception_date):
        raise HTTPException(
            status.HTTP_409_CONFLICT, "An exception already exists for this date"
        )
    row = AvailabilityException(provider_id=provider.id, **data.model_dump())
    await repo.add_exception(row)
    await session.commit()
    return row


async def update_exception(
    session: AsyncSession,
    user_id: UUID,
    exception_id: UUID,
    data: AvailabilityExceptionUpdate,
) -> AvailabilityException:
    provider = await provider_service.get_provider_by_user(session, user_id)
    repo = AvailabilityRepository(session)
    row = await repo.get_exception(exception_id, provider.id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exception not found")

    changes = data.model_dump(exclude_unset=True)
    if any(changes.get(f, "x") is None for f in ("exception_date", "is_day_off")):
        raise HTTPException(
            422, "Fields cannot be set to null"
        )
    exception_date = changes.get("exception_date", row.exception_date)
    is_day_off = changes.get("is_day_off", row.is_day_off)
    reason = changes.get("reason", row.reason)
    if is_day_off:
        start = end = None
        if changes.get("start_time") is not None or changes.get("end_time") is not None:
            raise HTTPException(
                422,
                "start_time and end_time must be empty for a day off",
            )
    else:
        start = changes.get("start_time", row.start_time)
        end = changes.get("end_time", row.end_time)
        _check_order(start, end)
    if await repo.exception_exists_for_date(
        provider.id, exception_date, exclude_id=row.id
    ):
        raise HTTPException(
            status.HTTP_409_CONFLICT, "An exception already exists for this date"
        )
    row.exception_date, row.is_day_off = exception_date, is_day_off
    row.start_time, row.end_time, row.reason = start, end, reason
    await repo.save_exception(row)
    await session.commit()
    return row


async def delete_exception(
    session: AsyncSession, user_id: UUID, exception_id: UUID
) -> None:
    provider = await provider_service.get_provider_by_user(session, user_id)
    repo = AvailabilityRepository(session)
    row = await repo.get_exception(exception_id, provider.id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exception not found")
    await repo.delete_exception(row)
    await session.commit()
