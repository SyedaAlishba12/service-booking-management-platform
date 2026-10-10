from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database.session import get_db
from middleware.auth_stub import require_admin
from common.responses import ApiResponse, PaginatedData
from schemas.provider import ProviderResponse
from schemas.service import ServiceResponse
from schemas.admin import ProviderStatusUpdate, ServiceActiveUpdate
import controllers.admin_controller as ctrl
from models.provider import ProviderStatus

admin_router = APIRouter(prefix="/api/admin", tags=["Admin"], dependencies=[Depends(require_admin)])

@admin_router.get("/providers", response_model=ApiResponse[PaginatedData[ProviderResponse]])
async def list_providers(
    status: ProviderStatus | None = None,
    is_active: bool | None = None,
    q: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    return await ctrl.list_providers(db, status, is_active, q, page, page_size)

@admin_router.get("/providers/{id}", response_model=ApiResponse[ProviderResponse])
async def get_provider(id: UUID, db: AsyncSession = Depends(get_db)):
    return await ctrl.get_provider(db, id)

@admin_router.put("/providers/{id}/status", response_model=ApiResponse[ProviderResponse])
async def update_provider_status(id: UUID, payload: ProviderStatusUpdate, db: AsyncSession = Depends(get_db)):
    return await ctrl.update_provider_status(db, id, payload)

@admin_router.get("/services", response_model=ApiResponse[PaginatedData[ServiceResponse]])
async def list_services(
    category_id: UUID | None = None,
    provider_id: UUID | None = None,
    is_active: bool | None = None,
    q: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    return await ctrl.list_services(db, category_id, provider_id, is_active, q, page, page_size)

@admin_router.get("/services/{id}", response_model=ApiResponse[ServiceResponse])
async def get_service(id: UUID, db: AsyncSession = Depends(get_db)):
    return await ctrl.get_service(db, id)

@admin_router.put("/services/{id}/active", response_model=ApiResponse[ServiceResponse])
async def set_service_active(id: UUID, payload: ServiceActiveUpdate, db: AsyncSession = Depends(get_db)):
    return await ctrl.set_service_active(db, id, payload)
