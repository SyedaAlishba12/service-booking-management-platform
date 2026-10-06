"""Service controllers: turn service results into the standard API response."""
from uuid import UUID

from fastapi import HTTPException, status
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from common.auth_stub import CurrentUser
from common.responses import ApiResponse, ok, paginated
from schemas.service import (
    ServiceCreate,
    ServiceFilters,
    ServicePublicResponse,
    ServiceResponse,
    ServiceUpdate,
)
from services import service_service


def build_filters(**params) -> ServiceFilters:
    """Build ServiceFilters from query params; a bad combination becomes a 422."""
    try:
        return ServiceFilters(**params)
    except ValidationError as exc:
        message = str(exc.errors()[0]["msg"]).removeprefix("Value error, ")
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, message)


async def create_my_service(
    session: AsyncSession, user: CurrentUser, data: ServiceCreate
) -> ApiResponse:
    service = await service_service.create_service(session, user.id, data)
    return ok(ServiceResponse.model_validate(service), "Service created successfully")


async def update_my_service(
    session: AsyncSession, user: CurrentUser, service_id: UUID, data: ServiceUpdate
) -> ApiResponse:
    service = await service_service.update_service(session, user.id, service_id, data)
    return ok(ServiceResponse.model_validate(service), "Service updated successfully")


async def set_my_service_active(
    session: AsyncSession, user: CurrentUser, service_id: UUID, is_active: bool
) -> ApiResponse:
    service = await service_service.set_service_active(session, user.id, service_id, is_active)
    message = "Service enabled successfully" if is_active else "Service deactivated successfully"
    return ok(ServiceResponse.model_validate(service), message)


async def list_my_services(
    session: AsyncSession, user: CurrentUser, include_inactive: bool
) -> ApiResponse:
    services = await service_service.list_my_services(session, user.id, include_inactive)
    items = [ServiceResponse.model_validate(s) for s in services]
    return ok(items, "Services fetched successfully")


async def search_public_services(
    session: AsyncSession, filters: ServiceFilters, page: int, page_size: int
) -> ApiResponse:
    services, total = await service_service.search_services(
        session, filters, page, page_size, public_only=True
    )
    items = [ServicePublicResponse.model_validate(s) for s in services]
    return ok(paginated(items, total, page, page_size), "Services fetched successfully")


async def get_public_service(session: AsyncSession, service_id: UUID) -> ApiResponse:
    service = await service_service.get_public_service(session, service_id)
    return ok(ServicePublicResponse.model_validate(service), "Service fetched successfully")


async def list_services_of_provider(session: AsyncSession, provider_id: UUID) -> ApiResponse:
    services = await service_service.list_provider_services(session, provider_id)
    items = [ServiceResponse.model_validate(s) for s in services]
    return ok(items, "Services fetched successfully")
