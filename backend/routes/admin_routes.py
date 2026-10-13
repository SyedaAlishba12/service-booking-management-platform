from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database.session import get_db
from middleware.admin_guard import require_admin
from middleware.auth_middleware import get_current_user
from common.responses import ApiResponse, PaginatedData, ok, paginated
from schemas.provider import ProviderResponse
from schemas.service import ServiceResponse
from schemas.admin import (
    AdminUserDetailResponse,
    AdminUserResponse,
    ProviderStatusUpdate,
    ServiceActiveUpdate,
    UserStatusUpdate,
)
import controllers.admin_controller as ctrl
import services.admin_user_service as user_svc
from models.provider import ProviderStatus
from models.user import User

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


# ---------------------------------------------------------------------------
# User management endpoints
# ---------------------------------------------------------------------------

@admin_router.get(
    "/users",
    response_model=ApiResponse[PaginatedData[AdminUserResponse]],
    summary="List all users (admin)",
)
async def list_users(
    q: str | None = Query(None, description="Search by full name or email"),
    role: str | None = Query(None, description="Filter by role (CUSTOMER, PROVIDER, ADMIN)"),
    is_active: bool | None = Query(None, description="Filter by active status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    items, total = await user_svc.list_users_admin(
        db,
        page=page,
        page_size=page_size,
        q=q,
        role=role,
        is_active=is_active,
    )
    return ok(paginated(items, total, page, page_size))


@admin_router.get(
    "/users/{user_id}",
    response_model=ApiResponse[AdminUserDetailResponse],
    summary="Get user detail with activity counts (admin)",
)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    detail = await user_svc.get_user_detail_admin(db, user_id)
    return ok(detail)


@admin_router.put(
    "/users/{user_id}/status",
    response_model=ApiResponse[AdminUserResponse],
    summary="Activate or deactivate a user account (admin)",
)
async def update_user_status(
    user_id: UUID,
    payload: UserStatusUpdate,
    db: AsyncSession = Depends(get_db),
    # require_admin already ran as a router-level dependency and validated the role.
    # We need the actual User object to forward to UserService, so we inject
    # get_current_user directly here (it is already resolved by the router guard,
    # FastAPI reuses the cached result – no extra DB query).
    current_admin: User = Depends(get_current_user),
):
    result = await user_svc.update_user_status_admin(
        db=db,
        user_id=user_id,
        is_active=payload.is_active,
        requesting_admin=current_admin,
    )
    action = "activated" if payload.is_active else "deactivated"
    return ok(result, message=f"User account {action} successfully")
