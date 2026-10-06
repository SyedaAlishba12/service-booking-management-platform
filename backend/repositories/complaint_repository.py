"""
Complaint repository: raw database queries only.
"""

import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.complaint import Complaint, ComplaintStatus, ComplaintType


async def add(db: AsyncSession, complaint: Complaint) -> Complaint:
    db.add(complaint)
    await db.flush()
    return complaint


async def get_by_id(db: AsyncSession, complaint_id: uuid.UUID) -> Complaint | None:
    result = await db.execute(select(Complaint).where(Complaint.id == complaint_id))
    return result.scalar_one_or_none()


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
