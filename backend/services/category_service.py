"""
Category service: all business rules live here.

This layer owns commit and rollback. The repository handles only queries.

Exceptions defined here (not in a shared module) so the controller can
import them from a single, predictable location.
"""

import re
import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

import repositories.category_repository as repo
from models.category import Category
from schemas.category import CategoryCreate, CategoryUpdate


# ---------------------------------------------------------------------------
# Domain exceptions
# ---------------------------------------------------------------------------


class CategoryNotFoundError(Exception):
    """Raised when a requested category does not exist (or is inactive for
    public endpoints)."""

    def __init__(self, category_id: uuid.UUID | None = None, message: str | None = None):
        self.message = message or (
            f"Category '{category_id}' not found" if category_id else "Category not found"
        )
        super().__init__(self.message)


class CategoryConflictError(Exception):
    """Raised when a name or slug collides with an existing category."""

    def __init__(self, message: str = "A category with that name or slug already exists"):
        self.message = message
        super().__init__(self.message)


class CategoryValidationError(Exception):
    """Raised for business-rule validation failures (e.g. empty update payload,
    un-sluggable name)."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_NON_ALPHANUMERIC_RE = re.compile(r"[^a-z0-9]+")


def _slugify(name: str) -> str:
    """Convert a name to a URL-safe slug.

    Steps:
      1. Lowercase.
      2. Replace every run of non-alphanumeric characters with a single hyphen.
      3. Strip leading/trailing hyphens.

    Returns an empty string if the result is empty (caller should raise
    CategoryValidationError).
    """
    lowered = name.lower()
    slugified = _NON_ALPHANUMERIC_RE.sub("-", lowered).strip("-")
    return slugified


async def _unique_slug(db: AsyncSession, base: str, exclude_id: uuid.UUID | None = None) -> str:
    """Return `base` if it is free, otherwise append -2, -3, ... until free."""
    candidate = base
    counter = 2
    while True:
        existing = await repo.get_by_slug(db, candidate, exclude_id=exclude_id)
        if existing is None:
            return candidate
        candidate = f"{base}-{counter}"
        counter += 1


# ---------------------------------------------------------------------------
# Public-facing read operations
# ---------------------------------------------------------------------------


async def get_public_categories(db: AsyncSession) -> list[Category]:
    """Return all ACTIVE categories ordered by display_order, name."""
    return await repo.list_active(db)


async def get_public_category(db: AsyncSession, category_id: uuid.UUID) -> Category:
    """Return one active category by id.

    Raises CategoryNotFoundError if missing OR inactive.
    """
    category = await repo.get_by_id(db, category_id)
    if category is None or not category.is_active:
        raise CategoryNotFoundError(category_id)
    return category


# ---------------------------------------------------------------------------
# Admin read operations
# ---------------------------------------------------------------------------


async def get_admin_categories(db: AsyncSession) -> list[Category]:
    """Return ALL categories (including inactive)."""
    return await repo.list_all(db)


async def get_admin_category(db: AsyncSession, category_id: uuid.UUID) -> Category:
    """Return any category by id (active or not).

    Raises CategoryNotFoundError if the id does not exist at all.
    """
    category = await repo.get_by_id(db, category_id)
    if category is None:
        raise CategoryNotFoundError(category_id)
    return category


# ---------------------------------------------------------------------------
# Write operations
# ---------------------------------------------------------------------------


async def create_category(db: AsyncSession, payload: CategoryCreate) -> Category:
    """Create a new category.

    Slug behaviour:
      - Omitted -> auto-generated from name; if taken, appends -2, -3, ...
      - Provided -> used as-is; if taken -> CategoryConflictError.

    Name duplicate (case-insensitive) -> CategoryConflictError.
    IntegrityError from DB unique indexes -> CategoryConflictError (safety net).
    """
    # --- name uniqueness ---
    if await repo.get_by_name_ci(db, payload.name) is not None:
        raise CategoryConflictError(
            f"A category named '{payload.name}' already exists (case-insensitive)."
        )

    # --- slug resolution ---
    explicit_slug = payload.slug is not None
    if explicit_slug:
        if await repo.get_by_slug(db, payload.slug) is not None:  # type: ignore[arg-type]
            raise CategoryConflictError(
                f"The slug '{payload.slug}' is already taken."
            )
        slug = payload.slug  # type: ignore[assignment]
    else:
        base = _slugify(payload.name)
        if not base:
            raise CategoryValidationError(
                f"Cannot generate a valid slug from name '{payload.name}'."
            )
        slug = await _unique_slug(db, base)

    category = Category(
        name=payload.name,
        slug=slug,
        description=payload.description,
        image_url=payload.image_url,
        display_order=payload.display_order,
        is_active=True,
    )

    try:
        await repo.add(db, category)
        await db.commit()
        await db.refresh(category)
    except IntegrityError:
        await db.rollback()
        raise CategoryConflictError(
            "A category with that name or slug already exists (DB constraint)."
        )

    return category


async def update_category(
    db: AsyncSession, category_id: uuid.UUID, payload: CategoryUpdate
) -> Category:
    """Update only the fields present in the payload.

    Rules:
      - Empty payload -> CategoryValidationError.
      - Slug is NOT auto-regenerated when name changes (admin controls slug).
      - Uniqueness checks exclude the category being updated.
      - IntegrityError -> CategoryConflictError.
    """
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise CategoryValidationError("No fields provided for update.")

    category = await repo.get_by_id(db, category_id)
    if category is None:
        raise CategoryNotFoundError(category_id)

    # --- name uniqueness (exclude self) ---
    if "name" in updates:
        conflict = await repo.get_by_name_ci(db, updates["name"], exclude_id=category_id)
        if conflict is not None:
            raise CategoryConflictError(
                f"A category named '{updates['name']}' already exists (case-insensitive)."
            )

    # --- slug uniqueness (exclude self) ---
    if "slug" in updates:
        conflict = await repo.get_by_slug(db, updates["slug"], exclude_id=category_id)
        if conflict is not None:
            raise CategoryConflictError(
                f"The slug '{updates['slug']}' is already taken."
            )

    try:
        await repo.apply_updates(db, category, updates)
        await db.commit()
        await db.refresh(category)
    except IntegrityError:
        await db.rollback()
        raise CategoryConflictError(
            "A category with that name or slug already exists (DB constraint)."
        )

    return category


async def deactivate_category(db: AsyncSession, category_id: uuid.UUID) -> Category:
    """Soft-delete: set is_active=False.

    Idempotent: deactivating an already-inactive category succeeds.
    Raises CategoryNotFoundError if the id does not exist at all.
    """
    category = await repo.get_by_id(db, category_id)
    if category is None:
        raise CategoryNotFoundError(category_id)

    if category.is_active:
        await repo.apply_updates(db, category, {"is_active": False})
        await db.commit()
        await db.refresh(category)

    return category
