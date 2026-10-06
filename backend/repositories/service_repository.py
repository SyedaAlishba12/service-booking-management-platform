from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import contains_eager, joinedload

from models.provider import Provider, ProviderStatus
from models.service import Service
from schemas.service import ServiceFilters


def _conditions(filters: ServiceFilters, public_only: bool) -> list:
    """Conditions on Service joined with Provider."""
    conds = []
    if public_only:
        # Only active services of approved, active providers are publicly visible.
        conds.append(Service.is_active.is_(True))
        conds.append(Provider.status == ProviderStatus.APPROVED)
        conds.append(Provider.is_active.is_(True))
    elif filters.is_active is not None:
        conds.append(Service.is_active.is_(filters.is_active))
    if filters.provider_id:
        conds.append(Service.provider_id == filters.provider_id)
    if filters.category_id:
        conds.append(Service.category_id == filters.category_id)
    if filters.service_type is not None:
        conds.append(Service.service_type == filters.service_type)
    if filters.min_price is not None:
        conds.append(Service.price >= filters.min_price)
    if filters.max_price is not None:
        conds.append(Service.price <= filters.max_price)
    if filters.q:
        like = f"%{filters.q}%"
        conds.append(or_(Service.name.ilike(like), Service.description.ilike(like)))
    if filters.location:
        like = f"%{filters.location}%"
        conds.append(
            or_(
                Service.location.ilike(like),
                Provider.location.ilike(like),
                Provider.city.ilike(like),
            )
        )
    return conds


class ServiceRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, service_id: UUID) -> Service | None:
        return await self.session.get(Service, service_id)

    async def get_with_provider(self, service_id: UUID) -> Service | None:
        result = await self.session.execute(
            select(Service)
            .options(joinedload(Service.provider))
            .where(Service.id == service_id)
        )
        return result.scalar_one_or_none()

    async def list_by_provider(
        self, provider_id: UUID, *, include_inactive: bool
    ) -> list[Service]:
        stmt = select(Service).where(Service.provider_id == provider_id)
        if not include_inactive:
            stmt = stmt.where(Service.is_active.is_(True))
        result = await self.session.execute(stmt.order_by(Service.name, Service.id))
        return list(result.scalars().all())

    async def add(self, service: Service) -> Service:
        self.session.add(service)
        await self.session.flush()
        await self.session.refresh(service)
        return service

    async def save(self, service: Service) -> Service:
        await self.session.flush()
        await self.session.refresh(service)
        return service

    async def search(
        self,
        filters: ServiceFilters,
        *,
        public_only: bool,
        limit: int,
        offset: int,
    ) -> tuple[list[Service], int]:
        conds = _conditions(filters, public_only)
        join_on = Service.provider_id == Provider.id
        total = (
            await self.session.execute(
                select(func.count())
                .select_from(Service)
                .join(Provider, join_on)
                .where(*conds)
            )
        ).scalar_one()
        rows = await self.session.execute(
            select(Service)
            .join(Provider, join_on)
            .options(contains_eager(Service.provider))
            .where(*conds)
            .order_by(Service.name, Service.id)
            .limit(limit)
            .offset(offset)
        )
        return list(rows.scalars().unique().all()), total
