"""Provider controllers: turn service results into the standard API response."""
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from common.auth_stub import CurrentUser
from common.responses import ApiResponse, ok, paginated
from schemas.provider import (
    ProviderCreate,
    ProviderFilters,
    ProviderPublicResponse,
    ProviderResponse,
    ProviderUpdate,
)
from services import provider_service


async def create_my_provider(
    session: AsyncSession, user: CurrentUser, data: ProviderCreate
) -> ApiResponse:
    provider = await provider_service.create_provider(session, user.id, data)
    return ok(ProviderResponse.model_validate(provider), "Provider profile created successfully")


async def get_my_provider(session: AsyncSession, user: CurrentUser) -> ApiResponse:
    provider = await provider_service.get_provider_by_user(session, user.id)
    return ok(ProviderResponse.model_validate(provider), "Provider profile fetched successfully")


async def update_my_provider(
    session: AsyncSession, user: CurrentUser, data: ProviderUpdate
) -> ApiResponse:
    provider = await provider_service.update_provider(session, user.id, data)
    return ok(ProviderResponse.model_validate(provider), "Provider profile updated successfully")


async def list_public_providers(
    session: AsyncSession, filters: ProviderFilters, page: int, page_size: int
) -> ApiResponse:
    providers, total = await provider_service.list_providers(
        session, filters, page, page_size, public_only=True
    )
    items = [ProviderPublicResponse.model_validate(p) for p in providers]
    return ok(paginated(items, total, page, page_size), "Providers fetched successfully")


async def get_public_provider(session: AsyncSession, provider_id: UUID) -> ApiResponse:
    provider = await provider_service.get_public_provider(session, provider_id)
    return ok(ProviderPublicResponse.model_validate(provider), "Provider fetched successfully")
