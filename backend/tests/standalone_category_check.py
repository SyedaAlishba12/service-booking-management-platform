"""
Standalone async test for the Category module.

Run with:  python tests/test_category_standalone.py
No pytest required.

Uses in-memory SQLite via aiosqlite so no real DB is needed.
The real Category model is used (SQLite supports the lower() functional index).
"""

import asyncio
import sys
import traceback
import uuid

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# ---- bootstrap sys.path so imports work when run from backend/ ----
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import Base
from models.category import Category  # noqa: F401 – registers table with Base
from schemas.category import CategoryCreate, CategoryUpdate
import services.category_service as svc

# ---------------------------------------------------------------------------
# Engine + session factory (in-memory SQLite)
# ---------------------------------------------------------------------------

ENGINE = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
SessionFactory = async_sessionmaker(bind=ENGINE, class_=AsyncSession, expire_on_commit=False)


async def create_tables():
    async with ENGINE.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# ---------------------------------------------------------------------------
# Test runner helpers
# ---------------------------------------------------------------------------

PASS = 0
FAIL = 0


def ok(label: str):
    global PASS
    PASS += 1
    print(f"  PASS  {label}")


def fail(label: str, reason: str):
    global FAIL
    FAIL += 1
    print(f"  FAIL  {label}: {reason}")


async def run_test(label: str, coro):
    """Run a coroutine; catch unexpected exceptions and mark as FAIL."""
    try:
        await coro
    except AssertionError as exc:
        fail(label, str(exc) or "AssertionError")
    except Exception:
        fail(label, traceback.format_exc(limit=3))


# ---------------------------------------------------------------------------
# Individual tests
# ---------------------------------------------------------------------------


async def test_create_basic(db: AsyncSession):
    label = "create basic category"
    cat = await svc.create_category(db, CategoryCreate(name="Home Cleaning", display_order=1))
    assert cat.id is not None, "id is None"
    assert cat.name == "Home Cleaning", f"name={cat.name!r}"
    assert cat.slug == "home-cleaning", f"slug={cat.slug!r}"
    assert cat.is_active is True, "is_active should be True"
    assert cat.created_at is not None, "created_at is None"
    ok(label)


async def test_auto_slug(db: AsyncSession):
    label = "auto-slug generation from name"
    cat = await svc.create_category(db, CategoryCreate(name="Lawn & Garden Care!"))
    assert cat.slug == "lawn-garden-care", f"slug={cat.slug!r}"
    ok(label)


async def test_auto_slug_collision(db: AsyncSession):
    label = "auto-slug collision appends -2"
    # "home-cleaning" already exists from test_create_basic
    cat = await svc.create_category(db, CategoryCreate(name="Home-Cleaning"))
    # name is different case but slug would collide; expect home-cleaning-2
    assert cat.slug == "home-cleaning-2", f"slug={cat.slug!r}"
    ok(label)


async def test_duplicate_name_ci(db: AsyncSession):
    label = "duplicate name (case-insensitive) -> conflict"
    try:
        await svc.create_category(db, CategoryCreate(name="home cleaning"))
        fail(label, "expected CategoryConflictError, got none")
    except svc.CategoryConflictError:
        ok(label)


async def test_explicit_slug_taken(db: AsyncSession):
    label = "explicit duplicate slug -> conflict"
    try:
        await svc.create_category(db, CategoryCreate(name="New Cat", slug="home-cleaning"))
        fail(label, "expected CategoryConflictError, got none")
    except svc.CategoryConflictError:
        ok(label)


async def test_update_description_only(db: AsyncSession):
    label = "update description only keeps other fields intact"
    # Use the category created in test_create_basic
    cats = await svc.get_admin_categories(db)
    target = next(c for c in cats if c.slug == "home-cleaning")
    original_name = target.name
    original_slug = target.slug
    original_order = target.display_order

    updated = await svc.update_category(
        db, target.id, CategoryUpdate(description="Best cleaning service")
    )
    assert updated.description == "Best cleaning service", f"desc={updated.description!r}"
    assert updated.name == original_name, "name changed unexpectedly"
    assert updated.slug == original_slug, "slug changed unexpectedly"
    assert updated.display_order == original_order, "display_order changed"
    ok(label)


async def test_update_own_name_and_slug(db: AsyncSession):
    label = "update to own current name+slug -> no conflict"
    cats = await svc.get_admin_categories(db)
    target = next(c for c in cats if c.slug == "home-cleaning")
    updated = await svc.update_category(
        db,
        target.id,
        CategoryUpdate(name=target.name, slug=target.slug),
    )
    assert updated.id == target.id, "id changed"
    ok(label)


async def test_update_to_another_name_conflict(db: AsyncSession):
    label = "update to another category name -> conflict"
    cats = await svc.get_admin_categories(db)
    # "lawn-garden-care" and "home-cleaning" both exist
    lawn = next(c for c in cats if c.slug == "lawn-garden-care")
    try:
        await svc.update_category(
            db, lawn.id, CategoryUpdate(name="Home Cleaning")
        )
        fail(label, "expected CategoryConflictError, got none")
    except svc.CategoryConflictError:
        ok(label)


async def test_empty_update(db: AsyncSession):
    label = "empty update payload -> validation error"
    cats = await svc.get_admin_categories(db)
    target = cats[0]
    try:
        await svc.update_category(db, target.id, CategoryUpdate())
        fail(label, "expected CategoryValidationError, got none")
    except svc.CategoryValidationError:
        ok(label)


async def test_deactivate(db: AsyncSession):
    label = "soft delete sets is_active=False"
    cats = await svc.get_admin_categories(db)
    target = next(c for c in cats if c.slug == "home-cleaning")
    result = await svc.deactivate_category(db, target.id)
    assert result.is_active is False, f"is_active={result.is_active!r}"
    ok(label)


async def test_deactivate_twice(db: AsyncSession):
    label = "deactivate already-inactive category -> still succeeds (idempotent)"
    cats = await svc.get_admin_categories(db)
    target = next(c for c in cats if c.slug == "home-cleaning")
    assert target.is_active is False, "precondition: should already be inactive"
    result = await svc.deactivate_category(db, target.id)
    assert result.is_active is False, f"is_active={result.is_active!r}"
    ok(label)


async def test_public_get_inactive_is_404(db: AsyncSession):
    label = "public get of inactive category -> not found"
    cats = await svc.get_admin_categories(db)
    inactive = next(c for c in cats if not c.is_active)
    try:
        await svc.get_public_category(db, inactive.id)
        fail(label, "expected CategoryNotFoundError, got none")
    except svc.CategoryNotFoundError:
        ok(label)


async def test_public_list_excludes_inactive(db: AsyncSession):
    label = "public list excludes inactive categories"
    public = await svc.get_public_categories(db)
    assert all(c.is_active for c in public), "inactive category found in public list"
    ok(label)


async def test_admin_list_includes_inactive(db: AsyncSession):
    label = "admin list includes inactive categories"
    admin_all = await svc.get_admin_categories(db)
    inactive = [c for c in admin_all if not c.is_active]
    assert len(inactive) > 0, "no inactive categories found in admin list"
    ok(label)


async def test_unknown_id_not_found(db: AsyncSession):
    label = "unknown id -> not found"
    ghost_id = uuid.uuid4()
    try:
        await svc.get_admin_category(db, ghost_id)
        fail(label, "expected CategoryNotFoundError, got none")
    except svc.CategoryNotFoundError:
        ok(label)


# ---------------------------------------------------------------------------
# Main runner — tests share one DB session (sequential, order matters)
# ---------------------------------------------------------------------------

TESTS = [
    test_create_basic,
    test_auto_slug,
    test_auto_slug_collision,
    test_duplicate_name_ci,
    test_explicit_slug_taken,
    test_update_description_only,
    test_update_own_name_and_slug,
    test_update_to_another_name_conflict,
    test_empty_update,
    test_deactivate,
    test_deactivate_twice,
    test_public_get_inactive_is_404,
    test_public_list_excludes_inactive,
    test_admin_list_includes_inactive,
    test_unknown_id_not_found,
]


async def main():
    await create_tables()
    async with SessionFactory() as db:
        for test_fn in TESTS:
            await run_test(test_fn.__name__.replace("test_", ""), test_fn(db))

    total = PASS + FAIL
    print(f"\n{'='*50}")
    print(f"Results: {PASS}/{total} passed", "(all OK)" if FAIL == 0 else f"  ({FAIL} FAILED)")
    if FAIL > 0:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
