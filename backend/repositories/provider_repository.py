from uuid import UUID

from sqlalchemy import exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.provider import Provider, ProviderStatus
from models.service import Service
from schemas.provider import ProviderFilters


def _conditions(filters: ProviderFilters, public_only: bool) -> list:
    conds = []
    if public_only:
        conds.append(Provider.status == ProviderStatus.APPROVED)
        conds.append(Provider.is_active.is_(True))
    else:
        if filters.status is not None:
            conds.append(Provider.status == filters.status)
        if filters.is_active is not None:
            conds.append(Provider.is_active.is_(filters.is_active))
    if filters.q:
        like = f"%{filters.q}%"
        conds.append(
            or_(Provider.business_name.ilike(like), Provider.description.ilike(like))
        )
    if filters.city:
        conds.append(Provider.city.ilike(f"%{filters.city}%"))
    if filters.location:
        like = f"%{filters.location}%"
        conds.append(or_(Provider.location.ilike(like), Provider.city.ilike(like)))
    if filters.category_id:
        conds.append(
            exists().where(
                Service.provider_id == Provider.id,
                Service.category_id == filters.category_id,
                Service.is_active.is_(True),
            )
        )
    return conds


class ProviderRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, provider_id: UUID) -> Provider | None:
        return await self.session.get(Provider, provider_id)

    async def get_by_user_id(self, user_id: UUID) -> Provider | None:
        result = await self.session.execute(
            select(Provider).where(Provider.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def add(self, provider: Provider) -> Provider:
        self.session.add(provider)
        await self.session.flush()
        await self.session.refresh(provider)
        return provider

    async def save(self, provider: Provider) -> Provider:
        await self.session.flush()
        await self.session.refresh(provider)
        return provider

    async def list(
        self,
        filters: ProviderFilters,
        *,
        public_only: bool,
        limit: int,
        offset: int,
    ) -> tuple[list[Provider], int]:
        conds = _conditions(filters, public_only)
        total = (
            await self.session.execute(
                select(func.count()).select_from(Provider).where(*conds)
            )
        ).scalar_one()
        rows = await self.session.execute(
            select(Provider)
            .where(*conds)
            .order_by(Provider.business_name, Provider.id)
            .limit(limit)
            .offset(offset)
        )
        return list(rows.scalars().all()), total
