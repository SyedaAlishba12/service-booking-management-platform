"""
Complaint repository: raw database queries only.
"""

import uuid
from typing import Any

from sqlalchemy import Column, MetaData, Table, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.complaint import Complaint, ComplaintStatus, ComplaintType

_booking_metadata = MetaData()
_bookings = Table(
    "bookings",
    _booking_metadata,
    Column("id"),
    Column("customer_id"),
    Column("provider_id"),
)
_customers = Table(
    "customers",
    _booking_metadata,
    Column("id"),
    Column("user_id"),
)
_providers = Table(
    "providers",
    _booking_metadata,
    Column("id"),
    Column("user_id"),
)


async def add(db: AsyncSession, complaint: Complaint) -> Complaint:
    db.add(complaint)
    await db.flush()
    return complaint


async def get_by_id(db: AsyncSession, complaint_id: uuid.UUID) -> Complaint | None:
    result = await db.execute(select(Complaint).where(Complaint.id == complaint_id))
    return result.scalar_one_or_none()


async def get_booking_participants(
    db: AsyncSession, booking_id: uuid.UUID
) -> tuple[uuid.UUID, uuid.UUID] | None:
    """Return the customer and provider user IDs for a booking."""
    stmt = (
        select(_customers.c.user_id, _providers.c.user_id)
        .select_from(
            _bookings
            .join(_customers, _bookings.c.customer_id == _customers.c.id)
            .join(_providers, _bookings.c.provider_id == _providers.c.id)
        )
        .where(_bookings.c.id == booking_id)
    )
    row = (await db.execute(stmt)).one_or_none()
    return (
        uuid.UUID(str(row[0])),
        uuid.UUID(str(row[1])),
    ) if row is not None else None


async def list_by_user(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int = 20,
    offset: int = 0,
) -> list[Complaint]:
    result = await db.execute(
        select(Complaint)
        .where(Complaint.user_id == user_id)
        .order_by(Complaint.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


async def list_admin(
    db: AsyncSession,
    status: ComplaintStatus | None = None,
    complaint_type: ComplaintType | None = None,
    provider_id: uuid.UUID | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[Complaint]:
    stmt = select(Complaint)
    if status is not None:
        stmt = stmt.where(Complaint.status == status)
    if complaint_type is not None:
        stmt = stmt.where(Complaint.complaint_type == complaint_type)
    if provider_id is not None:
        stmt = stmt.where(Complaint.provider_id == provider_id)
    stmt = stmt.order_by(Complaint.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def count_by_user(db: AsyncSession, user_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.count(Complaint.id)).where(Complaint.user_id == user_id)
    )
    return result.scalar_one()


async def count_admin(
    db: AsyncSession,
    status: ComplaintStatus | None = None,
    complaint_type: ComplaintType | None = None,
    provider_id: uuid.UUID | None = None,
) -> int:
    stmt = select(func.count(Complaint.id))
    if status is not None:
        stmt = stmt.where(Complaint.status == status)
    if complaint_type is not None:
        stmt = stmt.where(Complaint.complaint_type == complaint_type)
    if provider_id is not None:
        stmt = stmt.where(Complaint.provider_id == provider_id)
    result = await db.execute(stmt)
    return result.scalar_one()



async def apply_updates(
    db: AsyncSession, complaint: Complaint, updates: dict[str, Any]
) -> Complaint:
    for field, value in updates.items():
        setattr(complaint, field, value)
    await db.flush()
    return complaint


async def count_by_status(db: AsyncSession) -> dict[str, int]:
    result = await db.execute(
        select(Complaint.status, func.count(Complaint.id)).group_by(Complaint.status)
    )
    rows = result.all()
    # rows is list of (Enum, int) or (str, int) depending on driver
    return {getattr(status, "value", status): count for status, count in rows}
