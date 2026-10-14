from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from services.provider_service import list_providers, get_provider, set_provider_status
from services.service_service import search_services, get_service, admin_set_service_active
from services.notification_integration import notify
from schemas.provider import ProviderFilters
from schemas.service import ServiceFilters
from schemas.admin import ProviderStatusUpdate
from models.provider import ProviderStatus

async def list_providers_admin(db: AsyncSession, status, is_active, q, page, page_size):
    filters = ProviderFilters(status=status, is_active=is_active, q=q)
    return await list_providers(db, filters, page=page, page_size=page_size, public_only=False)

async def get_provider_admin(db: AsyncSession, id: UUID):
    return await get_provider(db, id)

async def update_provider_status(db: AsyncSession, provider_id: UUID, payload: ProviderStatusUpdate):
    provider = await set_provider_status(db, provider_id, status_value=payload.status, is_active=payload.is_active)
    
    if payload.status == ProviderStatus.APPROVED:
        msg = "Your provider account was approved."
    elif payload.status == ProviderStatus.SUSPENDED:
        msg = "Your provider account was suspended."
    elif payload.is_active is False:
        msg = "Your provider account was deactivated."
    elif payload.is_active is True:
        msg = "Your provider account was reactivated."
    else:
        msg = "Your provider account was updated."

    try:
        await notify(
            db,
            user_id=provider.user_id,
            notification_type="PROVIDER_UPDATE",
            title="Provider Status Update",
            message=msg,
            entity_type="provider",
            entity_id=provider.id
        )
        await db.commit()
    except Exception:
        await db.rollback()
    return provider

async def list_services_admin(db: AsyncSession, category_id, provider_id, is_active, q, page, page_size):
    filters = ServiceFilters(category_id=category_id, provider_id=provider_id, is_active=is_active, q=q)
    return await search_services(db, filters, page=page, page_size=page_size, public_only=False)

async def get_service_admin(db: AsyncSession, id: UUID):
    return await get_service(db, id)

async def set_service_active(db: AsyncSession, service_id: UUID, is_active: bool):
    return await admin_set_service_active(db, service_id, is_active)
