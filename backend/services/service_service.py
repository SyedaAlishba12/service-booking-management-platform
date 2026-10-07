"""Service (offering) business logic. See provider_service.py for conventions."""
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from models.service import Service
from repositories.service_repository import ServiceRepository
from schemas.service import ServiceCreate, ServiceFilters, ServiceUpdate
from services import provider_service
from services.provider_service import MAX_PAGE_SIZE

_REQUIRED_FIELDS = {
    "category_id",
    "name",
    "price",
    "duration_minutes",
    "service_type",
}


async def _get_owned_service(
    session: AsyncSession, user_id: UUID, service_id: UUID
) -> Service:
    provider = await provider_service.get_provider_by_user(session, user_id)
    service = await ServiceRepository(session).get_by_id(service_id)
    # Same error for "missing" and "not yours" so ids cannot be probed.
    if service is None or service.provider_id != provider.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Service not found")
    return service


async def create_service(
    session: AsyncSession, user_id: UUID, data: ServiceCreate
) -> Service:
    provider = await provider_service.get_provider_by_user(session, user_id)
    repo = ServiceRepository(session)
    service = Service(provider_id=provider.id, **data.model_dump())
    try:
        await repo.add(service)
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid category")
    return service


async def update_service(
    session: AsyncSession, user_id: UUID, service_id: UUID, data: ServiceUpdate
) -> Service:
    service = await _get_owned_service(session, user_id, service_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is None and field in _REQUIRED_FIELDS:
            raise HTTPException(
                422, f"{field} cannot be empty"
            )
        setattr(service, field, value)
    repo = ServiceRepository(session)
    try:
        await repo.save(service)
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid category")
    return service


async def set_service_active(
    session: AsyncSession, user_id: UUID, service_id: UUID, is_active: bool
) -> Service:
    """Provider enables / disables (soft delete) their own service."""
    service = await _get_owned_service(session, user_id, service_id)
    service.is_active = is_active
    await ServiceRepository(session).save(service)
    await session.commit()
    return service


async def admin_set_service_active(
    session: AsyncSession, service_id: UUID, is_active: bool
) -> Service:
    """Admin enables / disables any service."""
    service = await get_service(session, service_id)
    service.is_active = is_active
    await ServiceRepository(session).save(service)
    await session.commit()
    return service


async def get_service(session: AsyncSession, service_id: UUID) -> Service:
    service = await ServiceRepository(session).get_by_id(service_id)
    if service is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Service not found")
    return service


async def get_public_service(session: AsyncSession, service_id: UUID) -> Service:
    """Service plus its provider, only if publicly visible (active service,
    approved and active provider)."""
    service = await ServiceRepository(session).get_with_provider(service_id)
    if (
        service is None
        or not service.is_active
        or not provider_service.is_bookable(service.provider)
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Service not found")
    return service


async def list_my_services(
    session: AsyncSession, user_id: UUID, include_inactive: bool = True
) -> list[Service]:
    provider = await provider_service.get_provider_by_user(session, user_id)
    return await ServiceRepository(session).list_by_provider(
        provider.id, include_inactive=include_inactive
    )


async def list_provider_services(
    session: AsyncSession, provider_id: UUID
) -> list[Service]:
    """Active services of a publicly visible provider (provider profile page)."""
    await provider_service.get_public_provider(session, provider_id)
    return await ServiceRepository(session).list_by_provider(
        provider_id, include_inactive=False
    )


async def search_services(
    session: AsyncSession,
    filters: ServiceFilters,
    page: int = 1,
    page_size: int = 20,
    public_only: bool = True,
) -> tuple[list[Service], int]:
    """public_only=True: active services of approved + active providers (public search).
    public_only=False: everything, optionally filtered by is_active (admin).
    Returned services have .provider loaded."""
    page = max(page, 1)
    page_size = min(max(page_size, 1), MAX_PAGE_SIZE)
    return await ServiceRepository(session).search(
        filters,
        public_only=public_only,
        limit=page_size,
        offset=(page - 1) * page_size,
    )


async def ensure_service_bookable(
    session: AsyncSession, service_id: UUID, provider_id: UUID
) -> Service:
    """For Booking: the service must exist, belong to this provider and be active,
    and the provider must be approved and active."""
    await provider_service.ensure_provider_bookable(session, provider_id)
    service = await get_service(session, service_id)
    if service.provider_id != provider_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Service does not belong to this provider"
        )
    if not service.is_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Service is not active")
    return service
