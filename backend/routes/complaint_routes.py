"""
Complaint routes.
"""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

import controllers.complaint_controller as ctrl
from database.session import get_db
from middleware.auth_stub import get_current_user_id, require_admin
from models.complaint import ComplaintStatus, ComplaintType
from schemas.complaint import (
    ComplaintAdminUpdate,
    ComplaintCreate,
    ComplaintDetailResponse,
    ComplaintListResponse,
)


complaints_router = APIRouter(prefix="/api/complaints", tags=["complaints"])


@complaints_router.post("", status_code=201)
async def create_complaint(
    payload: ComplaintCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    return await ctrl.create_complaint(db, user_id, payload)


@complaints_router.get("/me", response_model=ComplaintListResponse)
async def list_my_complaints(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    return await ctrl.list_my_complaints(db, user_id, limit, offset)


@complaints_router.get("/{id}", response_model=ComplaintDetailResponse)
async def get_my_complaint(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    return await ctrl.get_my_complaint(db, user_id, id)


admin_router = APIRouter(
    prefix="/api/admin/complaints",
    tags=["admin-complaints"],
    dependencies=[Depends(require_admin)],
)


@admin_router.get("", response_model=ComplaintListResponse)
async def list_admin_complaints(
    db: AsyncSession = Depends(get_db),
    status: ComplaintStatus | None = Query(default=None),
    complaint_type: ComplaintType | None = Query(default=None),
    provider_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    return await ctrl.list_admin_complaints(
        db, status, complaint_type, provider_id, limit, offset
    )


@admin_router.get("/{id}", response_model=ComplaintDetailResponse)
async def get_admin_complaint(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    return await ctrl.get_admin_complaint(db, id)


@admin_router.put("/{id}", response_model=ComplaintDetailResponse)
async def update_complaint_status(
    id: uuid.UUID,
    payload: ComplaintAdminUpdate,
    db: AsyncSession = Depends(get_db),
    admin_id: uuid.UUID = Depends(get_current_user_id),
):
    return await ctrl.update_complaint_status(db, admin_id, id, payload)
