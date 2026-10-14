"""Admin provider approval routes (admin only).

GET /api/admin/providers              list all providers (filter by status / is_active)
GET /api/admin/providers/{id}         one provider
PUT /api/admin/providers/{id}/status  approve / suspend / activate / deactivate

Register in main.py:
    from routes import admin_provider_routes
    app.include_router(admin_provider_routes.router)
"""
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from common.auth import require_roles
from common.responses import ApiResponse, PaginatedData
from controllers import admin_provider_controller
from database.session import get_db
from models.provider import ProviderStatus
from schemas.provider import ProviderFilters, ProviderResponse, ProviderStatusUpdate

router = APIRouter(
    prefix="/api/admin/providers",
    tags=["Admin - Providers"],
    dependencies=[Depends(require_roles("ADMIN"))],
)


@router.get("", response_model=ApiResponse[PaginatedData[ProviderResponse]])
async def list_providers(
    q: str | None = None,
    status: ProviderStatus | None = None,
    is_active: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
):
    filters = ProviderFilters(q=q, status=status, is_active=is_active)
    return await admin_provider_controller.list_providers(session, filters, page, page_size)


@router.get("/{provider_id:uuid}", response_model=ApiResponse[ProviderResponse])
async def get_provider(provider_id: UUID, session: AsyncSession = Depends(get_db)):
    return await admin_provider_controller.get_provider(session, provider_id)


@router.put("/{provider_id:uuid}/status", response_model=ApiResponse[ProviderResponse])
async def update_provider_status(
    provider_id: UUID,
    data: ProviderStatusUpdate,
    session: AsyncSession = Depends(get_db),
):
    return await admin_provider_controller.update_provider_status(session, provider_id, data)
