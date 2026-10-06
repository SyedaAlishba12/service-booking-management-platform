"""
Review routes: thin APIRouter wrappers only.

No business logic here. All logic lives in the controller -> service ->
repository layers.

Router structure
----------------
reviews_router          prefix=/api/reviews           (user-facing)
provider_reviews_router prefix=/api/providers         (public)
admin_router            prefix=/api/admin/reviews     (admin-guarded)

Auth note
---------
get_current_user_id: NOT SECURE, DEV ONLY.
TODO: Replace with Zainab's authenticated-user dependency before any deployment.

require_admin: NOT SECURE, DEV ONLY.
TODO: Replace with Zainab's role-based dependency before any deployment.
"""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

import controllers.review_controller as ctrl
from database.session import get_db
from middleware.auth_stub import get_current_user_id, require_admin
from schemas.review import (
    ReviewCreate,
    ReviewDetailResponse,
    ReviewListResponse,
    ReviewUpdate,
    ReviewVisibilityUpdate,
    RatingSummaryResponse,
)
from common.response import success_response


# ---------------------------------------------------------------------------
# User-facing router  —  /api/reviews
# ---------------------------------------------------------------------------

reviews_router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@reviews_router.post("", status_code=201)
async def create_review(
    payload: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    return await ctrl.create_review(db, user_id, payload)


# IMPORTANT: /me MUST be declared BEFORE /{id} to avoid FastAPI matching
# the literal "me" as a UUID path parameter.
@reviews_router.get("/me", response_model=ReviewListResponse)
async def list_my_reviews(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    return await ctrl.list_my_reviews(db, user_id, limit, offset)


@reviews_router.put("/{id}", response_model=ReviewDetailResponse)
async def update_review(
    id: uuid.UUID,
    payload: ReviewUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    return await ctrl.update_review(db, user_id, id, payload)


@reviews_router.delete("/{id}")
async def delete_review(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    return await ctrl.delete_review(db, user_id, id)


# ---------------------------------------------------------------------------
# Public provider router  —  /api/providers
# ---------------------------------------------------------------------------

provider_reviews_router = APIRouter(prefix="/api/providers", tags=["provider-reviews"])


@provider_reviews_router.get(
    "/{provider_id}/reviews", response_model=ReviewListResponse
)
async def list_provider_reviews(
    provider_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    return await ctrl.list_provider_reviews(db, provider_id, limit, offset)


@provider_reviews_router.get("/{provider_id}/rating")
async def get_provider_rating(
    provider_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    return await ctrl.get_provider_rating(db, provider_id)


# ---------------------------------------------------------------------------
# Admin router  —  /api/admin/reviews
# Entire router is guarded by the require_admin dependency (stub for now).
# ---------------------------------------------------------------------------

admin_router = APIRouter(
    prefix="/api/admin/reviews",
    tags=["admin-reviews"],
    dependencies=[Depends(require_admin)],
)


@admin_router.get("", response_model=ReviewListResponse)
async def list_admin_reviews(
    db: AsyncSession = Depends(get_db),
    provider_id: uuid.UUID | None = Query(default=None),
    rating: int | None = Query(default=None, ge=1, le=5),
    is_visible: bool | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    return await ctrl.list_admin_reviews(
        db, provider_id, rating, is_visible, limit, offset
    )


@admin_router.put("/{id}/visibility", response_model=ReviewDetailResponse)
async def set_review_visibility(
    id: uuid.UUID,
    payload: ReviewVisibilityUpdate,
    db: AsyncSession = Depends(get_db),
):
    return await ctrl.set_review_visibility(db, id, payload)
