from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from common.responses import ok, paginated, ApiResponse, PaginatedData
import services.admin_service as svc
from schemas.admin import ProviderStatusUpdate, ServiceActiveUpdate
from schemas.provider import ProviderResponse
from schemas.service import ServiceResponse

async def list_providers(db: AsyncSession, status, is_active, q, page, page_size):
    items, total = await svc.list_providers_admin(db, status, is_active, q, page, page_size)
    return paginated(items, total, page, page_size)

async def get_provider(db: AsyncSession, id: UUID):
    p = await svc.get_provider_admin(db, id)
    return ok(p)

async def update_provider_status(db: AsyncSession, id: UUID, payload: ProviderStatusUpdate):
    p = await svc.update_provider_status(db, id, payload)
    return ok(p)

async def list_services(db: AsyncSession, category_id, provider_id, is_active, q, page, page_size):
    items, total = await svc.list_services_admin(db, category_id, provider_id, is_active, q, page, page_size)
    return paginated(items, total, page, page_size)

async def get_service(db: AsyncSession, id: UUID):
    s = await svc.get_service_admin(db, id)
    return ok(s)

async def set_service_active(db: AsyncSession, id: UUID, payload: ServiceActiveUpdate):
    s = await svc.set_service_active(db, id, payload.is_active)
    return ok(s)
