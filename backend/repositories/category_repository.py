"""
Category repository: raw database queries only.

Rules:
  - No business logic, no commit, no rollback.
  - Every function accepts an AsyncSession and returns ORM objects or None.
  - Lists are ordered by display_order ASC, name ASC.
"""

import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.category import Category


async def list_active(db: AsyncSession) -> list[Category]:
    """Return all active categories ordered by display_order, name."""
    result = await db.execute(
        select(Category)
        .where(Category.is_active.is_(True))
        .order_by(Category.display_order.asc(), Category.name.asc())
    )
    return list(result.scalars().all())


async def list_all(db: AsyncSession) -> list[Category]:
    """Return every category (including inactive) ordered by display_order, name."""
    result = await db.execute(
        select(Category).order_by(Category.display_order.asc(), Category.name.asc())
    )
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, category_id: uuid.UUID) -> Category | None:
    """Return the category with the given primary key, or None."""
    result = await db.execute(
        select(Category).where(Category.id == category_id)
    )
    return result.scalar_one_or_none()


async def get_by_name_ci(
    db: AsyncSession, name: str, exclude_id: uuid.UUID | None = None
) -> Category | None:
    """Case-insensitive name look-up.

    Pass exclude_id to skip a specific row (used when updating a category so
    its own current name never triggers a false conflict).
    """
    stmt = select(Category).where(func.lower(Category.name) == func.lower(name))
    if exclude_id is not None:
        stmt = stmt.where(Category.id != exclude_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_by_slug(
    db: AsyncSession, slug: str, exclude_id: uuid.UUID | None = None
) -> Category | None:
    """Exact slug look-up (slugs are already normalised to lowercase).

    Pass exclude_id to skip the category being updated.
    """
    stmt = select(Category).where(Category.slug == slug)
    if exclude_id is not None:
        stmt = stmt.where(Category.id != exclude_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def add(db: AsyncSession, category: Category) -> Category:
    """Add a new Category to the session and flush to get DB-generated values.

    Does NOT commit. The service layer is responsible for commit/rollback.
    flush() sends the INSERT so that DB defaults (created_at, id default, etc.)
    are populated; the caller must await db.refresh(category) after commit to
    read those values safely.
    """
    db.add(category)
    await db.flush()
    return category


async def apply_updates(
    db: AsyncSession, category: Category, updates: dict[str, Any]
) -> Category:
    """Apply a dict of field updates to an existing Category and flush.

    Does NOT commit. Only the keys present in `updates` are written.
    """
    for field, value in updates.items():
        setattr(category, field, value)
    await db.flush()
    return category
