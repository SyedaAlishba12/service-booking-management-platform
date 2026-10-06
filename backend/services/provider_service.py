"""Provider business logic.

Conventions:
- Functions take an AsyncSession as first argument and commit themselves.
- Role checks (PROVIDER / ADMIN) are done in the route layer, not here.
- Errors are raised as fastapi.HTTPException so the global error handler can format them.
"""
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from models.provider import Provider, ProviderStatus
from repositories.provider_repository import ProviderRepository
from schemas.provider import (
    ProviderCreate,
    ProviderFilters,
    ProviderUpdate,
)

MAX_PAGE_SIZE = 100


def is_bookable(provider: Provider) -> bool:
    """A provider can receive bookings only when approved and active."""
    return provider.status == ProviderStatus.APPROVED and provider.is_active


def _paginate(page: int, page_size: int) -> tuple[int, int, int]:
    page = max(page, 1)
    page_size = min(max(page_size, 1), MAX_PAGE_SIZE)
    return page, page_size, (page - 1) * page_size


async def create_provider(
    session: AsyncSession, user_id: UUID, data: ProviderCreate
) -> Provider:
    repo = ProviderRepository(session)
    if await repo.get_by_user_id(user_id) is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Provider profile already exists for this user"
        )
    provider = Provider(user_id=user_id, **data.model_dump())
    try:
        await repo.add(provider)
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Could not create provider profile"
        )
    return provider


async def get_provider(session: AsyncSession, provider_id: UUID) -> Provider:
    provider = await ProviderRepository(session).get_by_id(provider_id)
    if provider is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Provider not found")
    return provider


async def get_public_provider(session: AsyncSession, provider_id: UUID) -> Provider:
    """Provider visible on the public site: approved and active only."""
    provider = await get_provider(session, provider_id)
    if not is_bookable(provider):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Provider not found")
    return provider


async def get_provider_by_user(session: AsyncSession, user_id: UUID) -> Provider:
    provider = await ProviderRepository(session).get_by_user_id(user_id)
    if provider is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Provider profile not found")
    return provider


async def update_provider(
    session: AsyncSession, user_id: UUID, data: ProviderUpdate
) -> Provider:
    repo = ProviderRepository(session)
    provider = await get_provider_by_user(session, user_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is None and field in {
            "business_name",
            "location",
            "timezone",
            "slot_interval_minutes",
            "buffer_minutes",
        }:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY, f"{field} cannot be empty"
            )
        setattr(provider, field, value)
    await repo.save(provider)
    await session.commit()
    return provider


async def list_providers(
    session: AsyncSession,
    filters: ProviderFilters,
    page: int = 1,
    page_size: int = 20,
    public_only: bool = True,
) -> tuple[list[Provider], int]:
    """public_only=True: approved + active providers only (public site and search).
    public_only=False: every provider, optionally filtered by status / is_active (admin)."""
    page, page_size, offset = _paginate(page, page_size)
    return await ProviderRepository(session).list(
        filters, public_only=public_only, limit=page_size, offset=offset
    )


async def set_provider_status(
    session: AsyncSession,
    provider_id: UUID,
    status_value: ProviderStatus | None = None,
    is_active: bool | None = None,
) -> Provider:
    """Admin approval workflow: approve / suspend / activate / deactivate a provider."""
    if status_value is None and is_active is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "Provide status and/or is_active"
        )
    repo = ProviderRepository(session)
    provider = await get_provider(session, provider_id)
    if status_value is not None:
        provider.status = status_value
    if is_active is not None:
        provider.is_active = is_active
    await repo.save(provider)
    await session.commit()
    return provider


async def ensure_provider_bookable(
    session: AsyncSession, provider_id: UUID
) -> Provider:
    """For Booking: provider must exist, be approved and active."""
    provider = await get_provider(session, provider_id)
    if not is_bookable(provider):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Provider is not available for booking"
        )
    return provider
