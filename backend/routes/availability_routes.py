"""Availability routes: provider's own schedule (weekly rows + exceptions) and public read."""
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from common.auth_stub import CurrentUser, require_roles
from common.responses import ApiResponse
from controllers import availability_controller
from database.session import get_db
from schemas.availability import (
    AvailabilityCreate,
    AvailabilityExceptionCreate,
    AvailabilityExceptionResponse,
    AvailabilityExceptionUpdate,
    AvailabilityResponse,
    AvailabilityUpdate,
    ProviderAvailabilityResponse,
)

router = APIRouter(prefix="/api/providers", tags=["Availability"])
provider_only = require_roles("PROVIDER")


# ---------- provider's own schedule ----------
@router.get("/me/availability", response_model=ApiResponse[ProviderAvailabilityResponse])
async def get_my_availability(
    user: CurrentUser = Depends(provider_only),
    session: AsyncSession = Depends(get_db),
):
    """Weekly working hours and breaks, plus date exceptions, timezone, interval, buffer."""
    return await availability_controller.get_my_availability(session, user)


@router.post(
    "/me/availability",
    response_model=ApiResponse[AvailabilityResponse],
    status_code=status.HTTP_201_CREATED,
)
async def add_availability(
    data: AvailabilityCreate,
    user: CurrentUser = Depends(provider_only),
    session: AsyncSession = Depends(get_db),
):
    return await availability_controller.add_my_availability(session, user, data)


@router.put("/me/availability/{availability_id:uuid}", response_model=ApiResponse[AvailabilityResponse])
async def update_availability(
    availability_id: UUID,
    data: AvailabilityUpdate,
    user: CurrentUser = Depends(provider_only),
    session: AsyncSession = Depends(get_db),
):
    return await availability_controller.update_my_availability(
        session, user, availability_id, data
    )


@router.delete("/me/availability/{availability_id:uuid}", response_model=ApiResponse[None])
async def delete_availability(
    availability_id: UUID,
    user: CurrentUser = Depends(provider_only),
    session: AsyncSession = Depends(get_db),
):
    return await availability_controller.delete_my_availability(session, user, availability_id)


# ---------- exceptions: days off, holidays, custom hours ----------
@router.post(
    "/me/availability-exceptions",
    response_model=ApiResponse[AvailabilityExceptionResponse],
    status_code=status.HTTP_201_CREATED,
)
async def add_exception(
    data: AvailabilityExceptionCreate,
    user: CurrentUser = Depends(provider_only),
    session: AsyncSession = Depends(get_db),
):
    return await availability_controller.add_my_exception(session, user, data)


@router.put(
    "/me/availability-exceptions/{exception_id:uuid}",
    response_model=ApiResponse[AvailabilityExceptionResponse],
)
async def update_exception(
    exception_id: UUID,
    data: AvailabilityExceptionUpdate,
    user: CurrentUser = Depends(provider_only),
    session: AsyncSession = Depends(get_db),
):
    return await availability_controller.update_my_exception(session, user, exception_id, data)


@router.delete("/me/availability-exceptions/{exception_id:uuid}", response_model=ApiResponse[None])
async def delete_exception(
    exception_id: UUID,
    user: CurrentUser = Depends(provider_only),
    session: AsyncSession = Depends(get_db),
):
    return await availability_controller.delete_my_exception(session, user, exception_id)


# ---------- public read ----------
@router.get(
    "/{provider_id:uuid}/availability",
    response_model=ApiResponse[ProviderAvailabilityResponse],
)
async def get_provider_availability(
    provider_id: UUID,
    from_date: date | None = None,
    to_date: date | None = None,
    session: AsyncSession = Depends(get_db),
):
    return await availability_controller.get_public_provider_availability(
        session, provider_id, from_date, to_date
    )
