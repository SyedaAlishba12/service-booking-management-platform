"""
Category controller: maps service results / errors to HTTP responses.

Rules:
  - No business logic here. Call service, build envelope, return response.
  - Use JSONResponse with the error envelope (NOT HTTPException) so the
    {"success", "message", "data"} shape is preserved on errors.
  - HTTP status codes: 201 for create, 200 for everything else, 404/409/422
    for the three domain error types.
"""

import uuid

from fastapi import status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

import services.category_service as svc
from common.response import error_response
from common.responses import ok
from schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _serialise(obj) -> dict:
    """Convert a Category ORM object to the CategoryResponse dict."""
    return CategoryResponse.model_validate(obj).model_dump(mode="json")


def _serialise_list(objs) -> list[dict]:
    return [_serialise(o) for o in objs]


# ---------------------------------------------------------------------------
# Public endpoints
# ---------------------------------------------------------------------------


async def list_active_categories(db: AsyncSession):
    categories = await svc.get_public_categories(db)
    return ok(
        data=_serialise_list(categories),
        message="Categories retrieved successfully",
    )


async def get_active_category(db: AsyncSession, category_id: uuid.UUID):
    try:
        category = await svc.get_public_category(db, category_id)
    except svc.CategoryNotFoundError as exc:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=error_response(exc.message),
        )
    return ok(
        data=_serialise(category),
        message="Category retrieved successfully",
    )


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------


async def list_all_categories(db: AsyncSession):
    categories = await svc.get_admin_categories(db)
    return ok(
        data=_serialise_list(categories),
        message="Categories retrieved successfully",
    )


async def create_category(db: AsyncSession, payload: CategoryCreate):
    try:
        category = await svc.create_category(db, payload)
    except svc.CategoryConflictError as exc:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=error_response(exc.message),
        )
    except svc.CategoryValidationError as exc:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_response(exc.message),
        )
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=ok(
            data=_serialise(category),
            message="Category created successfully",
        ).model_dump(mode="json"),
    )


async def update_category(
    db: AsyncSession, category_id: uuid.UUID, payload: CategoryUpdate
):
    try:
        category = await svc.update_category(db, category_id, payload)
    except svc.CategoryNotFoundError as exc:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=error_response(exc.message),
        )
    except svc.CategoryConflictError as exc:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=error_response(exc.message),
        )
    except svc.CategoryValidationError as exc:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_response(exc.message),
        )
    return ok(
        data=_serialise(category),
        message="Category updated successfully",
    )


async def deactivate_category(db: AsyncSession, category_id: uuid.UUID):
    try:
        category = await svc.deactivate_category(db, category_id)
    except svc.CategoryNotFoundError as exc:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=error_response(exc.message),
        )
    return ok(
        data=_serialise(category),
        message="Category deactivated successfully",
    )
