"""Admin-side provider approval: list providers and approve / suspend / (de)activate them.
Uses the provider_service functions (the Provider model owner is Fatima)."""
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from common.responses import ApiResponse, ok, paginated
from schemas.provider import ProviderFilters, ProviderResponse, ProviderStatusUpdate
from services import provider_service


async def list_providers(
    session: AsyncSession, filters: ProviderFilters, page: int, page_size: int
) -> ApiResponse:
    providers, total = await provider_service.list_providers(
        session, filters, page, page_size, public_only=False
    )
    items = [ProviderResponse.model_validate(p) for p in providers]
    return ok(paginated(items, total, page, page_size), "Providers fetched successfully")


async def get_provider(session: AsyncSession, provider_id: UUID) -> ApiResponse:
    provider = await provider_service.get_provider(session, provider_id)
    return ok(ProviderResponse.model_validate(provider), "Provider fetched successfully")


async def update_provider_status(
    session: AsyncSession, provider_id: UUID, data: ProviderStatusUpdate
) -> ApiResponse:
    provider = await provider_service.set_provider_status(
        session, provider_id, data.status, data.is_active
    )
    return ok(ProviderResponse.model_validate(provider), "Provider updated successfully")
