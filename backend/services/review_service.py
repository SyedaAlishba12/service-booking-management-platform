"""
Review service: all business rules live here.

This layer owns commit and rollback. The repository handles only queries.

Exceptions defined here (not in a shared module) so the controller can
import them from a single, predictable location.

Rating interface for other modules
-----------------------------------
get_rating_summary, get_rating_summaries, and get_provider_ids_by_min_rating
are intended to be called by OTHER modules (e.g. search/discovery) that
need provider rating data. Only is_visible=True reviews count.
"""

import uuid
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

import repositories.review_repository as repo
from models.review import Review
from schemas.review import ReviewCreate, ReviewUpdate, ReviewVisibilityUpdate
from services.booking_eligibility import (
    EligibilityUnavailableError,
    get_review_eligibility,
)
from services.provider_service import get_provider
from services.notification_integration import notify


# ---------------------------------------------------------------------------
# Domain exceptions
# ---------------------------------------------------------------------------


class ReviewNotFoundError(Exception):
    """Raised when a requested review does not exist."""

    def __init__(
        self,
        review_id: uuid.UUID | None = None,
        message: str | None = None,
    ):
        self.message = message or (
            f"Review '{review_id}' not found" if review_id else "Review not found"
        )
        super().__init__(self.message)


class ReviewConflictError(Exception):
    """Raised when a booking already has a review."""

    def __init__(self, message: str = "A review for this booking already exists"):
        self.message = message
        super().__init__(self.message)


class ReviewForbiddenError(Exception):
    """Raised when the user does not own the review."""

    def __init__(self, message: str = "You do not have permission to perform this action"):
        self.message = message
        super().__init__(self.message)


class ReviewValidationError(Exception):
    """Raised for business-rule validation failures."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


# Re-export so the controller can import EligibilityUnavailableError from here.
__all__ = [
    "ReviewNotFoundError",
    "ReviewConflictError",
    "ReviewForbiddenError",
    "ReviewValidationError",
    "EligibilityUnavailableError",
    "create_review",
    "update_review",
    "delete_review",
    "list_provider_reviews",
    "list_my_reviews",
    "list_admin_reviews",
    "set_visibility",
    "get_rating_summary",
    "get_rating_summaries",
    "get_provider_ids_by_min_rating",
]


# ---------------------------------------------------------------------------
# Notification hook (no-op stub)
# ---------------------------------------------------------------------------

async def _notify_provider_new_review(db: AsyncSession, review: Review) -> None:  # noqa: RUF029
    """Real notification hook called after a review is created."""
    try:
        async with db.begin_nested():
            provider = await get_provider(db, review.provider_id)
            await notify(
                db,
                user_id=provider.user_id,
                notification_type="NEW_REVIEW",
                title="New review received",
                message=f"You received a new {review.rating}-star review.",
                entity_type="review",
                entity_id=review.id,
            )
        await db.commit()
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Write operations
# ---------------------------------------------------------------------------


async def create_review(
    db: AsyncSession,
    user_id: uuid.UUID,
    payload: ReviewCreate,
) -> Review:
    """Create a new review for a completed booking.

    Flow:
      1. Check booking eligibility (may raise EligibilityUnavailableError).
      2. Verify the caller owns the booking (-> ReviewForbiddenError).
      3. Verify the booking is completed (-> ReviewValidationError).
      4. Check for an existing review for this booking (-> ReviewConflictError).
      5. Copy provider_id and service_id from eligibility result.
      6. Persist, commit, refresh.
      7. Fire the notification hook (failure is swallowed — NEVER fails the review).
    """
    eligibility = await get_review_eligibility(db, payload.booking_id, user_id)

    if not eligibility.owned:
        raise ReviewForbiddenError(
            "You can only review bookings that belong to you."
        )

    if not eligibility.completed:
        raise ReviewValidationError(
            "Only completed bookings can be reviewed."
        )

    existing = await repo.get_by_booking_id(db, payload.booking_id)
    if existing is not None:
        raise ReviewConflictError(
            "A review for this booking already exists."
        )

    review = Review(
        booking_id=payload.booking_id,
        user_id=user_id,
        provider_id=eligibility.provider_id,
        service_id=eligibility.service_id,
        rating=payload.rating,
        comment=payload.comment,
    )

    try:
        await repo.add(db, review)
        await db.commit()
        await db.refresh(review)
    except IntegrityError:
        await db.rollback()
        raise ReviewConflictError(
            "A review for this booking already exists (DB constraint)."
        )

    # Notification hook: swallow all errors so a notification failure
    # NEVER fails the review creation.
    try:
        await _notify_provider_new_review(db, review)
    except Exception:  # noqa: BLE001
        pass

    return review


async def update_review(
    db: AsyncSession,
    user_id: uuid.UUID,
    review_id: uuid.UUID,
    payload: ReviewUpdate,
) -> Review:
    """Update only the fields present in the payload.

    Rules:
      - Empty payload -> ReviewValidationError.
      - Caller must own the review -> ReviewForbiddenError.
      - Not found -> ReviewNotFoundError.
    """
    updates: dict[str, Any] = payload.model_dump(exclude_unset=True)
    if not updates:
        raise ReviewValidationError("No fields provided for update.")

    review = await repo.get_by_id(db, review_id)
    if review is None:
        raise ReviewNotFoundError(review_id)

    if review.user_id != user_id:
        raise ReviewForbiddenError(
            "You can only edit your own reviews."
        )

    await repo.apply_updates(db, review, updates)
    await db.commit()
    await db.refresh(review)
    return review


async def delete_review(
    db: AsyncSession,
    user_id: uuid.UUID,
    review_id: uuid.UUID,
) -> None:
    """Hard-delete a review (owner only).

    After deletion the same booking can be reviewed again (the unique
    constraint is lifted once the row is gone).

    Raises:
      ReviewNotFoundError: review does not exist.
      ReviewForbiddenError: caller does not own the review.
    """
    review = await repo.get_by_id(db, review_id)
    if review is None:
        raise ReviewNotFoundError(review_id)

    if review.user_id != user_id:
        raise ReviewForbiddenError(
            "You can only delete your own reviews."
        )

    await repo.delete(db, review)
    await db.commit()


# ---------------------------------------------------------------------------
# Public read operations
# ---------------------------------------------------------------------------


async def list_provider_reviews(
    db: AsyncSession,
    provider_id: uuid.UUID,
    page: int = 1,
    page_size: int = 12,
) -> tuple[list[Review], int]:
    """Return visible reviews for a provider (public endpoint)."""
    offset = (page - 1) * page_size
    items = await repo.list_by_provider_visible(db, provider_id, page_size, offset)
    total = await repo.count_by_provider_visible(db, provider_id)
    return items, total


async def list_my_reviews(
    db: AsyncSession,
    user_id: uuid.UUID,
    page: int = 1,
    page_size: int = 12,
) -> tuple[list[Review], int]:
    """Return all reviews written by the current user."""
    offset = (page - 1) * page_size
    items = await repo.list_by_user(db, user_id, page_size, offset)
    total = await repo.count_by_user(db, user_id)
    return items, total


# ---------------------------------------------------------------------------
# Admin operations
# ---------------------------------------------------------------------------


async def list_admin_reviews(
    db: AsyncSession,
    provider_id: uuid.UUID | None = None,
    rating: int | None = None,
    is_visible: bool | None = None,
    page: int = 1,
    page_size: int = 12,
) -> tuple[list[Review], int]:
    """Return reviews with optional filters (admin only)."""
    offset = (page - 1) * page_size
    items = await repo.list_admin(db, provider_id, rating, is_visible, page_size, offset)
    total = await repo.count_admin(db, provider_id, rating, is_visible)
    return items, total


async def set_visibility(
    db: AsyncSession,
    review_id: uuid.UUID,
    is_visible: bool,
) -> Review:
    """Set the visibility of a review (admin only).

    Raises ReviewNotFoundError if the review does not exist.
    """
    review = await repo.get_by_id(db, review_id)
    if review is None:
        raise ReviewNotFoundError(review_id)

    await repo.apply_updates(db, review, {"is_visible": is_visible})
    await db.commit()
    await db.refresh(review)
    return review


# ---------------------------------------------------------------------------
# Rating interface — intended for use by OTHER modules
# ---------------------------------------------------------------------------


def _zero_summary(provider_id: uuid.UUID) -> dict:
    """Return a zero-value summary dict for a provider with no reviews."""
    return {
        "provider_id": provider_id,
        "average_rating": 0.0,
        "total_reviews": 0,
        "breakdown": {str(i): 0 for i in range(1, 6)},
    }


async def get_rating_summary(
    db: AsyncSession,
    provider_id: uuid.UUID,
) -> dict:
    """Return rating summary for a single provider (visible reviews only).

    Intended to be called by other modules that need provider rating data.
    Returns a dict compatible with RatingSummaryResponse.
    average_rating is rounded to 2 decimal places.
    """
    raw = await repo.rating_aggregate(db, provider_id)
    return {
        "provider_id": provider_id,
        "average_rating": round(raw["average"], 2),
        "total_reviews": raw["total"],
        "breakdown": raw["breakdown"],
    }


async def get_rating_summaries(
    db: AsyncSession,
    provider_ids: list[uuid.UUID],
) -> dict[uuid.UUID, dict]:
    """Return rating summaries for multiple providers (visible reviews only).

    Intended to be called by other modules (e.g. search/discovery).
    EVERY requested provider_id is present in the result — providers with
    no visible reviews receive total=0, average=0.0, zero-filled breakdown.
    average_rating is rounded to 2 decimal places.
    """
    raw_map = await repo.rating_aggregates(db, provider_ids)
    result: dict[uuid.UUID, dict] = {}
    for pid in provider_ids:
        if pid in raw_map:
            raw = raw_map[pid]
            result[pid] = {
                "provider_id": pid,
                "average_rating": round(raw["average"], 2),
                "total_reviews": raw["total"],
                "breakdown": raw["breakdown"],
            }
        else:
            result[pid] = _zero_summary(pid)
    return result


async def get_provider_ids_by_min_rating(
    db: AsyncSession,
    min_rating: float,
) -> list[uuid.UUID]:
    """Return provider_ids whose average visible rating >= min_rating.

    Intended to be called by search/discovery modules to filter providers
    by minimum rating.
    """
    return await repo.provider_ids_with_min_rating(db, min_rating)
