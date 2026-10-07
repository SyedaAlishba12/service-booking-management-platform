"""
Complaint service: all business rules live here.
"""

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

import repositories.complaint_repository as repo
from models.complaint import Complaint, ComplaintStatus, ComplaintType
from schemas.complaint import ComplaintAdminUpdate, ComplaintCreate


class ComplaintNotFoundError(Exception):
    def __init__(self, message: str = "Complaint not found"):
        self.message = message
        super().__init__(self.message)


class ComplaintForbiddenError(Exception):
    def __init__(self, message: str = "You do not have permission to perform this action"):
        self.message = message
        super().__init__(self.message)


class ComplaintValidationError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


async def create_complaint(
    db: AsyncSession,
    user_id: uuid.UUID,
    payload: ComplaintCreate,
) -> Complaint:
    # TODO: verify the booking belongs to this user via Sayeel's booking service
    # TODO: call Zainab's notify() when status changes (ask her about complaint event)
    
    complaint = Complaint(
        user_id=user_id,
        booking_id=payload.booking_id,
        provider_id=payload.provider_id,
        complaint_type=payload.complaint_type,
        subject=payload.subject,
        description=payload.description,
        status=ComplaintStatus.OPEN,
    )

    try:
        await repo.add(db, complaint)
        await db.commit()
        await db.refresh(complaint)
    except IntegrityError:
        await db.rollback()
        raise ComplaintValidationError("Invalid foreign key references for the given complaint type")

    return complaint


async def get_my_complaint(
    db: AsyncSession, user_id: uuid.UUID, complaint_id: uuid.UUID
) -> Complaint:
    complaint = await repo.get_by_id(db, complaint_id)
    if complaint is None:
        raise ComplaintNotFoundError()
    if complaint.user_id != user_id:
        raise ComplaintForbiddenError()
    return complaint


async def list_my_complaints(
    db: AsyncSession, user_id: uuid.UUID, page: int, page_size: int
) -> tuple[list[Complaint], int]:
    offset = (page - 1) * page_size
    items = await repo.list_by_user(db, user_id, page_size, offset)
    total = await repo.count_by_user(db, user_id)
    return items, total


async def list_admin_complaints(
    db: AsyncSession,
    status: ComplaintStatus | None = None,
    complaint_type: ComplaintType | None = None,
    provider_id: uuid.UUID | None = None,
    page: int = 1,
    page_size: int = 12,
) -> tuple[list[Complaint], int]:
    offset = (page - 1) * page_size
    items = await repo.list_admin(db, status, complaint_type, provider_id, page_size, offset)
    total = await repo.count_admin(db, status, complaint_type, provider_id)
    return items, total


async def get_admin_complaint(db: AsyncSession, complaint_id: uuid.UUID) -> Complaint:
    complaint = await repo.get_by_id(db, complaint_id)
    if complaint is None:
        raise ComplaintNotFoundError()
    return complaint


async def update_complaint_status(
    db: AsyncSession,
    complaint_id: uuid.UUID,
    payload: ComplaintAdminUpdate,
    resolved_by: uuid.UUID | None = None,
) -> Complaint:
    """
    Allowed transitions:
    OPEN -> IN_REVIEW
    OPEN -> RESOLVED
    OPEN -> REJECTED
    IN_REVIEW -> RESOLVED
    IN_REVIEW -> REJECTED
    IN_REVIEW -> IN_REVIEW (update admin_response)
    Terminal: RESOLVED, REJECTED
    """
    complaint = await repo.get_by_id(db, complaint_id)
    if complaint is None:
        raise ComplaintNotFoundError()

    current_status = complaint.status
    new_status = payload.status

    if current_status in (ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED):
        raise ComplaintValidationError("Cannot modify a terminal complaint")

    valid_transitions = {
        ComplaintStatus.OPEN: {
            ComplaintStatus.IN_REVIEW,
            ComplaintStatus.RESOLVED,
            ComplaintStatus.REJECTED,
        },
        ComplaintStatus.IN_REVIEW: {
            ComplaintStatus.IN_REVIEW,
            ComplaintStatus.RESOLVED,
            ComplaintStatus.REJECTED,
        },
    }

    if new_status not in valid_transitions.get(current_status, set()):
        raise ComplaintValidationError(
            f"Invalid transition from {current_status.value} to {new_status.value}"
        )

    updates: dict[str, Any] = {
        "status": new_status,
    }
    if "admin_response" in payload.model_fields_set:
        updates["admin_response"] = payload.admin_response

    if new_status in (ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED):
        updates["resolved_at"] = datetime.now(timezone.utc)
        updates["resolved_by"] = resolved_by

    await repo.apply_updates(db, complaint, updates)
    await db.commit()
    await db.refresh(complaint)
    
    # TODO: call Zainab's notify() when status changes

    return complaint


async def get_complaint_counts_by_status(db: AsyncSession) -> dict[str, int]:
    """
    Returns counts by status. 
    Interface for the admin dashboard.
    """
    raw_counts = await repo.count_by_status(db)
    result = {status.value: 0 for status in ComplaintStatus}
    for status_str, count in raw_counts.items():
        if status_str in result:
            result[status_str] = count
    return result
