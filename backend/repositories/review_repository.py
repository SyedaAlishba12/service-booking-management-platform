"""
Review repository: raw database queries only.

Rules:
  - No business logic, no commit, no rollback.
  - Every function accepts an AsyncSession and returns ORM objects or
    raw aggregate data.
  - The service layer is responsible for commit/rollback.
"""

import uuid
from typing import Any

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.review import Review


# ---------------------------------------------------------------------------
# Write helpers
# ---------------------------------------------------------------------------


async def add(db: AsyncSession, review: Review) -> Review:
    """Add a new Review to the session and flush to obtain DB defaults.

    Does NOT commit. The service layer is responsible for commit/rollback.
    """
    db.add(review)
    await db.flush()
    return review


async def apply_updates(
    db: AsyncSession, review: Review, updates: dict[str, Any]
) -> Review:
    """Apply a dict of field updates to an existing Review and flush.

    Does NOT commit. Only the keys present in `updates` are written.
    """
    for field, value in updates.items():
        setattr(review, field, value)
    await db.flush()
    return review


async def delete(db: AsyncSession, review: Review) -> None:
    """Hard-delete a Review from the session and flush.

    Does NOT commit.
    """
    await db.delete(review)
    await db.flush()


# ---------------------------------------------------------------------------
# Single-row look-ups
# ---------------------------------------------------------------------------


async def get_by_id(db: AsyncSession, review_id: uuid.UUID) -> Review | None:
    """Return the review with the given primary key, or None."""
    result = await db.execute(select(Review).where(Review.id == review_id))
    return result.scalar_one_or_none()


async def get_by_booking_id(
    db: AsyncSession, booking_id: uuid.UUID
) -> Review | None:
    """Return the review for a specific booking, or None."""
    result = await db.execute(
        select(Review).where(Review.booking_id == booking_id)
    )
    return result.scalar_one_or_none()


# ---------------------------------------------------------------------------
# List queries
# ---------------------------------------------------------------------------


async def list_by_provider_visible(
    db: AsyncSession,
    provider_id: uuid.UUID,
    limit: int = 20,
    offset: int = 0,
) -> list[Review]:
    """Return visible reviews for a provider, newest first."""
    result = await db.execute(
        select(Review)
        .where(
            and_(
                Review.provider_id == provider_id,
                Review.is_visible.is_(True),
            )
        )
        .order_by(Review.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


async def list_by_user(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int = 20,
    offset: int = 0,
) -> list[Review]:
    """Return all reviews written by a user, newest first."""
    result = await db.execute(
        select(Review)
        .where(Review.user_id == user_id)
        .order_by(Review.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


async def list_admin(
    db: AsyncSession,
    provider_id: uuid.UUID | None = None,
    rating: int | None = None,
    is_visible: bool | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[Review]:
    """Return reviews with optional filters (admin endpoint), newest first."""
    stmt = select(Review)
    if provider_id is not None:
        stmt = stmt.where(Review.provider_id == provider_id)
    if rating is not None:
        stmt = stmt.where(Review.rating == rating)
    if is_visible is not None:
        stmt = stmt.where(Review.is_visible.is_(is_visible))
    stmt = stmt.order_by(Review.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def count_by_provider_visible(
    db: AsyncSession,
    provider_id: uuid.UUID,
) -> int:
    result = await db.execute(
        select(func.count(Review.id))
        .where(
            and_(
                Review.provider_id == provider_id,
                Review.is_visible.is_(True),
            )
        )
    )
    return result.scalar_one()


async def count_by_user(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> int:
    result = await db.execute(
        select(func.count(Review.id)).where(Review.user_id == user_id)
    )
    return result.scalar_one()


async def count_admin(
    db: AsyncSession,
    provider_id: uuid.UUID | None = None,
    rating: int | None = None,
    is_visible: bool | None = None,
) -> int:
    stmt = select(func.count(Review.id))
    if provider_id is not None:
        stmt = stmt.where(Review.provider_id == provider_id)
    if rating is not None:
        stmt = stmt.where(Review.rating == rating)
    if is_visible is not None:
        stmt = stmt.where(Review.is_visible.is_(is_visible))
    result = await db.execute(stmt)
    return result.scalar_one()


# ---------------------------------------------------------------------------
# Aggregate queries  (visible reviews only)
# ---------------------------------------------------------------------------


async def rating_aggregate(
    db: AsyncSession, provider_id: uuid.UUID
) -> dict:
    """Return raw aggregate data for one provider's visible reviews.

    Returns a dict:
        {"total": int, "average": float, "breakdown": {"1":int, ..., "5":int}}
    """
    # Total and average
    agg_result = await db.execute(
        select(func.count(Review.id), func.avg(Review.rating)).where(
            and_(
                Review.provider_id == provider_id,
                Review.is_visible.is_(True),
            )
        )
    )
    total_count, avg_rating = agg_result.one()

    # Per-rating breakdown
    breakdown_result = await db.execute(
        select(Review.rating, func.count(Review.id))
        .where(
            and_(
                Review.provider_id == provider_id,
                Review.is_visible.is_(True),
            )
        )
        .group_by(Review.rating)
    )
    breakdown_rows = breakdown_result.all()

    breakdown: dict[str, int] = {str(i): 0 for i in range(1, 6)}
    for rating_val, cnt in breakdown_rows:
        breakdown[str(rating_val)] = cnt

    return {
        "total": total_count or 0,
        "average": float(avg_rating) if avg_rating is not None else 0.0,
        "breakdown": breakdown,
    }


async def rating_aggregates(
    db: AsyncSession, provider_ids: list[uuid.UUID]
) -> dict[uuid.UUID, dict]:
    """Return raw aggregate data for multiple providers (visible reviews only).

    Returns a dict keyed by provider_id. Providers with no visible reviews
    are NOT included — the caller is responsible for filling missing entries
    with zero values.
    """
    if not provider_ids:
        return {}

    # Total and average per provider
    agg_result = await db.execute(
        select(
            Review.provider_id,
            func.count(Review.id),
            func.avg(Review.rating),
        )
        .where(
            and_(
                Review.provider_id.in_(provider_ids),
                Review.is_visible.is_(True),
            )
        )
        .group_by(Review.provider_id)
    )
    agg_rows = agg_result.all()

    # Per-rating breakdown per provider
    breakdown_result = await db.execute(
        select(Review.provider_id, Review.rating, func.count(Review.id))
        .where(
            and_(
                Review.provider_id.in_(provider_ids),
                Review.is_visible.is_(True),
            )
        )
        .group_by(Review.provider_id, Review.rating)
    )
    breakdown_rows = breakdown_result.all()

    # Build breakdown maps
    breakdown_map: dict[uuid.UUID, dict[str, int]] = {}
    for pid, rating_val, cnt in breakdown_rows:
        if pid not in breakdown_map:
            breakdown_map[pid] = {str(i): 0 for i in range(1, 6)}
        breakdown_map[pid][str(rating_val)] = cnt

    result: dict[uuid.UUID, dict] = {}
    for pid, total_count, avg_rating in agg_rows:
        result[pid] = {
            "total": total_count or 0,
            "average": float(avg_rating) if avg_rating is not None else 0.0,
            "breakdown": breakdown_map.get(pid, {str(i): 0 for i in range(1, 6)}),
        }

    return result


async def provider_ids_with_min_rating(
    db: AsyncSession, min_rating: float
) -> list[uuid.UUID]:
    """Return provider_ids whose average visible rating >= min_rating."""
    result = await db.execute(
        select(Review.provider_id)
        .where(Review.is_visible.is_(True))
        .group_by(Review.provider_id)
        .having(func.avg(Review.rating) >= min_rating)
    )
    return list(result.scalars().all())
