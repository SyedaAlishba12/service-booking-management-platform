from datetime import date, time
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.availability import Availability, AvailabilityException


class AvailabilityRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    # ----- weekly schedule -----
    async def list_weekly(self, provider_id: UUID) -> list[Availability]:
        result = await self.session.execute(
            select(Availability)
            .where(Availability.provider_id == provider_id)
            .order_by(Availability.day_of_week, Availability.start_time)
        )
        return list(result.scalars().all())

    async def get_weekly(
        self, availability_id: UUID, provider_id: UUID
    ) -> Availability | None:
        result = await self.session.execute(
            select(Availability).where(
                Availability.id == availability_id,
                Availability.provider_id == provider_id,
            )
        )
        return result.scalar_one_or_none()

    async def has_overlap(
        self,
        provider_id: UUID,
        day_of_week: int,
        is_break: bool,
        start_time: time,
        end_time: time,
        exclude_id: UUID | None = None,
    ) -> bool:
        stmt = select(Availability.id).where(
            Availability.provider_id == provider_id,
            Availability.day_of_week == day_of_week,
            Availability.is_break.is_(is_break),
            Availability.start_time < end_time,
            Availability.end_time > start_time,
        )
        if exclude_id is not None:
            stmt = stmt.where(Availability.id != exclude_id)
        result = await self.session.execute(stmt.limit(1))
        return result.first() is not None

    async def add_weekly(self, row: Availability) -> Availability:
        self.session.add(row)
        await self.session.flush()
        await self.session.refresh(row)
        return row

    async def save_weekly(self, row: Availability) -> Availability:
        await self.session.flush()
        await self.session.refresh(row)
        return row

    async def delete_weekly(self, row: Availability) -> None:
        await self.session.delete(row)
        await self.session.flush()

    # ----- exceptions -----
    async def list_exceptions(
        self,
        provider_id: UUID,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> list[AvailabilityException]:
        stmt = select(AvailabilityException).where(
            AvailabilityException.provider_id == provider_id
        )
        if from_date is not None:
            stmt = stmt.where(AvailabilityException.exception_date >= from_date)
        if to_date is not None:
            stmt = stmt.where(AvailabilityException.exception_date <= to_date)
        result = await self.session.execute(
            stmt.order_by(AvailabilityException.exception_date)
        )
        return list(result.scalars().all())

    async def get_exception(
        self, exception_id: UUID, provider_id: UUID
    ) -> AvailabilityException | None:
        result = await self.session.execute(
            select(AvailabilityException).where(
                AvailabilityException.id == exception_id,
                AvailabilityException.provider_id == provider_id,
            )
        )
        return result.scalar_one_or_none()

    async def exception_exists_for_date(
        self,
        provider_id: UUID,
        exception_date: date,
        exclude_id: UUID | None = None,
    ) -> bool:
        stmt = select(AvailabilityException.id).where(
            AvailabilityException.provider_id == provider_id,
            AvailabilityException.exception_date == exception_date,
        )
        if exclude_id is not None:
            stmt = stmt.where(AvailabilityException.id != exclude_id)
        result = await self.session.execute(stmt.limit(1))
        return result.first() is not None

    async def add_exception(
        self, row: AvailabilityException
    ) -> AvailabilityException:
        self.session.add(row)
        await self.session.flush()
        await self.session.refresh(row)
        return row

    async def save_exception(
        self, row: AvailabilityException
    ) -> AvailabilityException:
        await self.session.flush()
        await self.session.refresh(row)
        return row

    async def delete_exception(self, row: AvailabilityException) -> None:
        await self.session.delete(row)
        await self.session.flush()
