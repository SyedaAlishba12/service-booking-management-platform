"""
Review controller: maps service results / errors to HTTP responses.

Rules:
  - No business logic here. Call service, build envelope, return response.
  - Use JSONResponse with the error envelope (NOT HTTPException) so the
    {"success", "message", "data"} shape is preserved on errors.
  - HTTP status codes: 201 for create, 200 for everything else.
  - Error codes: 404 NotFound, 403 Forbidden, 409 Conflict, 422 Validation,
                 503 EligibilityUnavailable.
"""

import uuid

from fastapi import status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

import services.review_service as svc
from common.response import error_response
from common.responses import ok, paginated
from schemas.review import (
    ReviewCreate,
    ReviewResponse,
    ReviewUpdate,
    ReviewVisibilityUpdate,
    RatingSummaryResponse,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _serialise(obj) -> dict:
    """Convert a Review ORM object to the ReviewResponse dict."""
    return ReviewResponse.model_validate(obj).model_dump(mode="json")


def _serialise_list(objs) -> list[dict]:
    return [_serialise(o) for o in objs]


def _serialise_summary(raw: dict) -> dict:
    """Convert a rating summary dict to a RatingSummaryResponse dict."""
    return RatingSummaryResponse(**raw).model_dump(mode="json")


# ---------------------------------------------------------------------------
# User endpoints
# ---------------------------------------------------------------------------


async def create_review(
    db: AsyncSession, user_id: uuid.UUID, payload: ReviewCreate
):
    try:
        review = await svc.create_review(db, user_id, payload)
    except svc.EligibilityUnavailableError as exc:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=error_response(exc.message),
        )
    except svc.ReviewForbiddenError as exc:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content=error_response(exc.message),
        )
    except svc.ReviewValidationError as exc:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_response(exc.message),
        )
    except svc.ReviewConflictError as exc:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=error_response(exc.message),
        )
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=ok(
            data=_serialise(review),
            message="Review created successfully",
        ).model_dump(mode="json"),
    )


async def list_my_reviews(
    db: AsyncSession,
    user_id: uuid.UUID,
    page: int = 1,
    page_size: int = 12,
):
    reviews, total = await svc.list_my_reviews(db, user_id, page, page_size)
    return ok(
        data=paginated(_serialise_list(reviews), total, page, page_size),
        message="Reviews retrieved successfully",
    )


async def update_review(
    db: AsyncSession,
    user_id: uuid.UUID,
    review_id: uuid.UUID,
    payload: ReviewUpdate,
):
    try:
        review = await svc.update_review(db, user_id, review_id, payload)
    except svc.ReviewNotFoundError as exc:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=error_response(exc.message),
        )
    except svc.ReviewForbiddenError as exc:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content=error_response(exc.message),
        )
    except svc.ReviewValidationError as exc:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_response(exc.message),
        )
    return ok(
        data=_serialise(review),
        message="Review updated successfully",
    )


async def delete_review(
    db: AsyncSession, user_id: uuid.UUID, review_id: uuid.UUID
):
    try:
        await svc.delete_review(db, user_id, review_id)
    except svc.ReviewNotFoundError as exc:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=error_response(exc.message),
        )
    except svc.ReviewForbiddenError as exc:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content=error_response(exc.message),
        )
    return ok(
        data=None,
        message="Review deleted successfully",
    )


# ---------------------------------------------------------------------------
# Public provider endpoints
# ---------------------------------------------------------------------------


async def list_provider_reviews(
    db: AsyncSession,
    provider_id: uuid.UUID,
    page: int = 1,
    page_size: int = 12,
):
    reviews, total = await svc.list_provider_reviews(db, provider_id, page, page_size)
    return ok(
        data=paginated(_serialise_list(reviews), total, page, page_size),
        message="Provider reviews retrieved successfully",
    )


async def get_provider_rating(db: AsyncSession, provider_id: uuid.UUID):
    summary = await svc.get_rating_summary(db, provider_id)
    return ok(
        data=_serialise_summary(summary),
        message="Rating summary retrieved successfully",
    )


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------


async def list_admin_reviews(
    db: AsyncSession,
    provider_id: uuid.UUID | None = None,
    rating: int | None = None,
    is_visible: bool | None = None,
    page: int = 1,
    page_size: int = 12,
):
    reviews, total = await svc.list_admin_reviews(
        db, provider_id, rating, is_visible, page, page_size
    )
    return ok(
        data=paginated(_serialise_list(reviews), total, page, page_size),
        message="Reviews retrieved successfully",
    )


async def set_review_visibility(
    db: AsyncSession,
    review_id: uuid.UUID,
    payload: ReviewVisibilityUpdate,
):
    try:
        review = await svc.set_visibility(db, review_id, payload.is_visible)
    except svc.ReviewNotFoundError as exc:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=error_response(exc.message),
        )
    return ok(
        data=_serialise(review),
        message="Review visibility updated successfully",
    )
