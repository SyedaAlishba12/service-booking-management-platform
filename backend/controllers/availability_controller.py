"""Availability controllers: turn service results into the standard API response."""
from datetime import date
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from common.auth_stub import CurrentUser
from common.responses import ApiResponse, ok
from schemas.availability import (
    AvailabilityCreate,
    AvailabilityExceptionCreate,
    AvailabilityExceptionResponse,
    AvailabilityExceptionUpdate,
    AvailabilityResponse,
    AvailabilityUpdate,
)
from services import availability_service, provider_service


# ---------- weekly schedule ----------
async def get_my_availability(session: AsyncSession, user: CurrentUser) -> ApiResponse:
    data = await availability_service.list_my_availability(session, user.id)
    return ok(data, "Availability fetched successfully")


async def add_my_availability(
    session: AsyncSession, user: CurrentUser, data: AvailabilityCreate
) -> ApiResponse:
    row = await availability_service.add_availability(session, user.id, data)
    return ok(AvailabilityResponse.model_validate(row), "Availability added successfully")


async def update_my_availability(
    session: AsyncSession, user: CurrentUser, availability_id: UUID, data: AvailabilityUpdate
) -> ApiResponse:
    row = await availability_service.update_availability(session, user.id, availability_id, data)
    return ok(AvailabilityResponse.model_validate(row), "Availability updated successfully")


async def delete_my_availability(
    session: AsyncSession, user: CurrentUser, availability_id: UUID
) -> ApiResponse:
    await availability_service.delete_availability(session, user.id, availability_id)
    return ok(None, "Availability deleted successfully")


# ---------- exceptions (days off, holidays, custom hours) ----------
async def add_my_exception(
    session: AsyncSession, user: CurrentUser, data: AvailabilityExceptionCreate
) -> ApiResponse:
    row = await availability_service.add_exception(session, user.id, data)
    return ok(AvailabilityExceptionResponse.model_validate(row), "Exception added successfully")


async def update_my_exception(
    session: AsyncSession,
    user: CurrentUser,
    exception_id: UUID,
    data: AvailabilityExceptionUpdate,
) -> ApiResponse:
    row = await availability_service.update_exception(session, user.id, exception_id, data)
    return ok(AvailabilityExceptionResponse.model_validate(row), "Exception updated successfully")


async def delete_my_exception(
    session: AsyncSession, user: CurrentUser, exception_id: UUID
) -> ApiResponse:
    await availability_service.delete_exception(session, user.id, exception_id)
    return ok(None, "Exception deleted successfully")


# ---------- public read ----------
async def get_public_provider_availability(
    session: AsyncSession,
    provider_id: UUID,
    from_date: date | None,
    to_date: date | None,
) -> ApiResponse:
    # Only approved + active providers expose their schedule publicly.
    await provider_service.get_public_provider(session, provider_id)
    data = await availability_service.get_provider_availability(
        session, provider_id, from_date, to_date
    )
    return ok(data, "Availability fetched successfully")
