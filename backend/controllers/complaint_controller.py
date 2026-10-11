"""
Complaint controller: maps service results / errors to HTTP responses.
"""

import uuid

from fastapi import status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

import services.complaint_service as svc
from common.response import error_response
from common.responses import ok, paginated
from schemas.complaint import ComplaintAdminUpdate, ComplaintCreate, ComplaintResponse


def _serialise(obj) -> dict:
    return ComplaintResponse.model_validate(obj).model_dump(mode="json")


def _serialise_list(objs) -> list[dict]:
    return [_serialise(o) for o in objs]


async def create_complaint(
    db: AsyncSession, user_id: uuid.UUID, payload: ComplaintCreate
):
    try:
        complaint = await svc.create_complaint(db, user_id, payload)
    except svc.ComplaintValidationError as exc:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_response(exc.message),
        )
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=ok(
            data=_serialise(complaint),
            message="Complaint submitted successfully",
        ).model_dump(mode="json"),
    )


async def list_my_complaints(
    db: AsyncSession, user_id: uuid.UUID, page: int, page_size: int
):
    complaints, total = await svc.list_my_complaints(db, user_id, page, page_size)
    return ok(
        data=paginated(_serialise_list(complaints), total, page, page_size),
        message="Complaints retrieved successfully",
    )


async def get_my_complaint(db: AsyncSession, user_id: uuid.UUID, complaint_id: uuid.UUID):
    try:
        complaint = await svc.get_my_complaint(db, user_id, complaint_id)
    except svc.ComplaintNotFoundError as exc:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=error_response(exc.message),
        )
    except svc.ComplaintForbiddenError as exc:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content=error_response(exc.message),
        )
    return ok(
        data=_serialise(complaint),
        message="Complaint retrieved successfully",
    )


async def list_admin_complaints(
    db: AsyncSession,
    status_enum,
    type_enum,
    provider_id: uuid.UUID | None = None,
    page: int = 1,
    page_size: int = 12,
):
    complaints, total = await svc.list_admin_complaints(
        db, status_enum, type_enum, provider_id, page, page_size
    )
    return ok(
        data=paginated(_serialise_list(complaints), total, page, page_size),
        message="Complaints retrieved successfully",
    )


async def get_admin_complaint(db: AsyncSession, complaint_id: uuid.UUID):
    try:
        complaint = await svc.get_admin_complaint(db, complaint_id)
    except svc.ComplaintNotFoundError as exc:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=error_response(exc.message),
        )
    return ok(
        data=_serialise(complaint),
        message="Complaint retrieved successfully",
    )


async def update_complaint_status(
    db: AsyncSession,
    admin_id: uuid.UUID,
    complaint_id: uuid.UUID,
    payload: ComplaintAdminUpdate,
):
    try:
        complaint = await svc.update_complaint_status(db, complaint_id, payload, admin_id)
    except svc.ComplaintNotFoundError as exc:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=error_response(exc.message),
        )
    except svc.ComplaintValidationError as exc:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_response(exc.message),
        )
    return ok(
        data=_serialise(complaint),
        message="Complaint updated successfully",
    )
