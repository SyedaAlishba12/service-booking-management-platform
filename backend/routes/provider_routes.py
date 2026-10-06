"""Provider routes. Path converter {provider_id:uuid} means static paths owned by other
modules (e.g. /api/providers/featured) are never mistaken for an id."""
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from common.auth_stub import CurrentUser, require_roles
from common.responses import ApiResponse, PaginatedData
from controllers import provider_controller
from database.session import get_db
from schemas.provider import (
    ProviderCreate,
    ProviderFilters,
    ProviderPublicResponse,
    ProviderResponse,
    ProviderUpdate,
)

router = APIRouter(prefix="/api/providers", tags=["Providers"])
provider_only = require_roles("PROVIDER")


@router.get("", response_model=ApiResponse[PaginatedData[ProviderPublicResponse]])
async def list_providers(
    q: str | None = None,
    city: str | None = None,
    location: str | None = None,
    category_id: UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
):
    filters = ProviderFilters(q=q, city=city, location=location, category_id=category_id)
    return await provider_controller.list_public_providers(session, filters, page, page_size)


@router.post(
    "",
    response_model=ApiResponse[ProviderResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_provider(
    data: ProviderCreate,
    user: CurrentUser = Depends(provider_only),
    session: AsyncSession = Depends(get_db),
):
    return await provider_controller.create_my_provider(session, user, data)


@router.get("/me", response_model=ApiResponse[ProviderResponse])
async def get_my_provider(
    user: CurrentUser = Depends(provider_only),
    session: AsyncSession = Depends(get_db),
):
    return await provider_controller.get_my_provider(session, user)


@router.put("/me", response_model=ApiResponse[ProviderResponse])
async def update_my_provider(
    data: ProviderUpdate,
    user: CurrentUser = Depends(provider_only),
    session: AsyncSession = Depends(get_db),
):
    return await provider_controller.update_my_provider(session, user, data)


@router.get("/{provider_id:uuid}", response_model=ApiResponse[ProviderPublicResponse])
async def get_provider(provider_id: UUID, session: AsyncSession = Depends(get_db)):
    return await provider_controller.get_public_provider(session, provider_id)
