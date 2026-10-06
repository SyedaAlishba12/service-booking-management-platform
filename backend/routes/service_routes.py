"""Service routes (provider-owned services)."""
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from common.auth_stub import CurrentUser, require_roles
from common.responses import ApiResponse, PaginatedData
from controllers import service_controller
from database.session import get_db
from models.service import ServiceType
from schemas.service import (
    ServiceCreate,
    ServicePublicResponse,
    ServiceResponse,
    ServiceStatusUpdate,
    ServiceUpdate,
)

router = APIRouter(prefix="/api", tags=["Services"])
provider_only = require_roles("PROVIDER")


@router.get("/services", response_model=ApiResponse[PaginatedData[ServicePublicResponse]])
async def list_services(
    q: str | None = None,
    provider_id: UUID | None = None,
    category_id: UUID | None = None,
    min_price: Decimal | None = Query(None, ge=0),
    max_price: Decimal | None = Query(None, ge=0),
    service_type: ServiceType | None = None,
    location: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
):
    filters = service_controller.build_filters(
        q=q,
        provider_id=provider_id,
        category_id=category_id,
        min_price=min_price,
        max_price=max_price,
        service_type=service_type,
        location=location,
    )
    return await service_controller.search_public_services(session, filters, page, page_size)


@router.post(
    "/services",
    response_model=ApiResponse[ServiceResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_service(
    data: ServiceCreate,
    user: CurrentUser = Depends(provider_only),
    session: AsyncSession = Depends(get_db),
):
    return await service_controller.create_my_service(session, user, data)


@router.get("/services/me", response_model=ApiResponse[list[ServiceResponse]])
async def list_my_services(
    include_inactive: bool = True,
    user: CurrentUser = Depends(provider_only),
    session: AsyncSession = Depends(get_db),
):
    return await service_controller.list_my_services(session, user, include_inactive)


@router.get("/services/{service_id:uuid}", response_model=ApiResponse[ServicePublicResponse])
async def get_service(service_id: UUID, session: AsyncSession = Depends(get_db)):
    return await service_controller.get_public_service(session, service_id)


@router.put("/services/{service_id:uuid}", response_model=ApiResponse[ServiceResponse])
async def update_service(
    service_id: UUID,
    data: ServiceUpdate,
    user: CurrentUser = Depends(provider_only),
    session: AsyncSession = Depends(get_db),
):
    return await service_controller.update_my_service(session, user, service_id, data)


@router.put("/services/{service_id:uuid}/status", response_model=ApiResponse[ServiceResponse])
async def set_service_status(
    service_id: UUID,
    data: ServiceStatusUpdate,
    user: CurrentUser = Depends(provider_only),
    session: AsyncSession = Depends(get_db),
):
    """Enable or disable a service (soft delete)."""
    return await service_controller.set_my_service_active(
        session, user, service_id, data.is_active
    )


@router.delete("/services/{service_id:uuid}", response_model=ApiResponse[ServiceResponse])
async def delete_service(
    service_id: UUID,
    user: CurrentUser = Depends(provider_only),
    session: AsyncSession = Depends(get_db),
):
    """Services are never hard-deleted: this deactivates the service (is_active=false)."""
    return await service_controller.set_my_service_active(session, user, service_id, False)


@router.get(
    "/providers/{provider_id:uuid}/services",
    response_model=ApiResponse[list[ServiceResponse]],
)
async def list_provider_services(provider_id: UUID, session: AsyncSession = Depends(get_db)):
    return await service_controller.list_services_of_provider(session, provider_id)
