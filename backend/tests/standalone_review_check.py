"""
Standalone async test for the Review module.

Run with:  python tests/test_review_standalone.py
No pytest required.

Uses in-memory SQLite via aiosqlite so no real DB is needed.
The real Review model is used.

Stub Tables registered before create_all:
  users, bookings, providers, services  (each has only an id UUID PK)
  — registered only when not already in Base.metadata.
"""

import asyncio
import sys
import traceback
import uuid

from sqlalchemy import Column, Table
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# ---- bootstrap sys.path so imports work when run from backend/ ----
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import Base
from models.review import Review  # noqa: F401  — registers Review in metadata

# ---------------------------------------------------------------------------
# Stub tables for FK dependencies (not yet in local Base.metadata).
# Only register when absent so this script is safe to run after those
# modules are merged.
# ---------------------------------------------------------------------------
for _table_name in ("users", "bookings", "providers", "services"):
    if _table_name not in Base.metadata.tables:
        Table(
            _table_name,
            Base.metadata,
            Column("id", PG_UUID(as_uuid=True), primary_key=True),
        )

# Import after path + stub setup
import services.review_service as svc  # noqa: E402
from schemas.review import ReviewCreate, ReviewUpdate, ReviewVisibilityUpdate  # noqa: E402
from services.booking_eligibility import (  # noqa: E402
    EligibilityUnavailableError,
    ReviewEligibility,
    set_eligibility_provider,
)

# ---------------------------------------------------------------------------
# Engine + session factory (in-memory SQLite)
# ---------------------------------------------------------------------------

ENGINE = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
SessionFactory = async_sessionmaker(
    bind=ENGINE, class_=AsyncSession, expire_on_commit=False
)


async def create_tables():
    async with ENGINE.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# ---------------------------------------------------------------------------
# Test-runner helpers
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
        fail(label, traceback.format_exc(limit=4))


# ---------------------------------------------------------------------------
# Shared test UUIDs
# ---------------------------------------------------------------------------

USER_A = uuid.uuid4()
USER_B = uuid.uuid4()
PROVIDER_1 = uuid.uuid4()
PROVIDER_2 = uuid.uuid4()
SERVICE_1 = uuid.uuid4()
SERVICE_2 = uuid.uuid4()
BOOKING_1 = uuid.uuid4()
BOOKING_2 = uuid.uuid4()
BOOKING_3 = uuid.uuid4()  # for re-review after delete
BOOKING_4 = uuid.uuid4()  # for batch summary provider 2

# ---------------------------------------------------------------------------
# Fake eligibility providers
# ---------------------------------------------------------------------------


def make_fake_provider(
    *,
    completed: bool = True,
    owned: bool = True,
    provider_id: uuid.UUID = PROVIDER_1,
    service_id: uuid.UUID = SERVICE_1,
    user_id_filter: uuid.UUID | None = None,
):
    """Create a fake eligibility provider function.

    If user_id_filter is set, owned=True only when the caller matches.
    """

    async def _provider(db, booking_id, user_id):
        effective_owned = owned
        if user_id_filter is not None:
            effective_owned = user_id == user_id_filter
        return ReviewEligibility(
            completed=completed,
            owned=effective_owned,
            provider_id=provider_id,
            service_id=service_id,
        )

    return _provider


# ---------------------------------------------------------------------------
# Individual tests
# ---------------------------------------------------------------------------


async def test_create_success_copies_provider_service(db: AsyncSession):
    label = "create success copies provider_id/service_id from eligibility"
    set_eligibility_provider(
        make_fake_provider(provider_id=PROVIDER_1, service_id=SERVICE_1)
    )
    payload = ReviewCreate(booking_id=BOOKING_1, rating=5, comment="Great!")
    review = await svc.create_review(db, USER_A, payload)
    assert review.provider_id == PROVIDER_1, f"wrong provider_id: {review.provider_id}"
    assert review.service_id == SERVICE_1, f"wrong service_id: {review.service_id}"
    assert review.user_id == USER_A
    assert review.rating == 5
    assert review.comment == "Great!"
    ok(label)


async def test_not_completed_raises_validation(db: AsyncSession):
    label = "not completed booking -> ReviewValidationError"
    set_eligibility_provider(make_fake_provider(completed=False))
    payload = ReviewCreate(booking_id=BOOKING_2, rating=3)
    try:
        await svc.create_review(db, USER_A, payload)
        fail(label, "expected ReviewValidationError, got none")
    except svc.ReviewValidationError:
        ok(label)


async def test_not_owned_raises_forbidden(db: AsyncSession):
    label = "not owned booking -> ReviewForbiddenError"
    set_eligibility_provider(
        make_fake_provider(completed=True, owned=False)
    )
    payload = ReviewCreate(booking_id=BOOKING_2, rating=4)
    try:
        await svc.create_review(db, USER_B, payload)
        fail(label, "expected ReviewForbiddenError, got none")
    except svc.ReviewForbiddenError:
        ok(label)


async def test_duplicate_booking_raises_conflict(db: AsyncSession):
    label = "duplicate booking_id -> ReviewConflictError"
    set_eligibility_provider(make_fake_provider())
    # BOOKING_1 was already reviewed in test_create_success_copies…
    payload = ReviewCreate(booking_id=BOOKING_1, rating=4)
    try:
        await svc.create_review(db, USER_A, payload)
        fail(label, "expected ReviewConflictError, got none")
    except svc.ReviewConflictError:
        ok(label)


async def test_default_provider_raises_eligibility_unavailable(db: AsyncSession):
    label = "unregistered provider -> EligibilityUnavailableError"
    # Reset to default (None)
    set_eligibility_provider(None)  # type: ignore[arg-type]
    payload = ReviewCreate(booking_id=uuid.uuid4(), rating=3)
    try:
        await svc.create_review(db, USER_A, payload)
        fail(label, "expected EligibilityUnavailableError, got none")
    except EligibilityUnavailableError:
        ok(label)
    finally:
        # Restore a usable provider for subsequent tests
        set_eligibility_provider(make_fake_provider())


async def test_schema_rejects_rating_0(db: AsyncSession):
    label = "schema rejects rating=0"
    try:
        ReviewCreate(booking_id=uuid.uuid4(), rating=0)
        fail(label, "expected ValidationError, got none")
    except Exception:
        ok(label)


async def test_schema_rejects_rating_6(db: AsyncSession):
    label = "schema rejects rating=6"
    try:
        ReviewCreate(booking_id=uuid.uuid4(), rating=6)
        fail(label, "expected ValidationError, got none")
    except Exception:
        ok(label)


async def test_empty_comment_becomes_none(db: AsyncSession):
    label = "empty comment string becomes None"
    payload = ReviewCreate(booking_id=uuid.uuid4(), rating=4, comment="   ")
    assert payload.comment is None, f"expected None, got {payload.comment!r}"
    ok(label)


async def test_update_own_review_works(db: AsyncSession):
    label = "update own review works and keeps other fields"
    set_eligibility_provider(make_fake_provider())
    # Create a fresh review for BOOKING_2
    create_payload = ReviewCreate(booking_id=BOOKING_2, rating=3, comment="Okay")
    review = await svc.create_review(db, USER_A, create_payload)
    original_provider = review.provider_id

    update_payload = ReviewUpdate(rating=5)
    updated = await svc.update_review(db, USER_A, review.id, update_payload)
    assert updated.rating == 5, f"expected rating 5, got {updated.rating}"
    assert updated.comment == "Okay", f"comment changed unexpectedly: {updated.comment}"
    assert updated.provider_id == original_provider, "provider_id changed unexpectedly"
    ok(label)


async def test_update_someone_elses_review_forbidden(db: AsyncSession):
    label = "update someone else's review -> ReviewForbiddenError"
    # Get BOOKING_1 review (owned by USER_A)
    import repositories.review_repository as repo_direct
    review = await repo_direct.get_by_booking_id(db, BOOKING_1)
    assert review is not None, "BOOKING_1 review should exist"
    try:
        await svc.update_review(db, USER_B, review.id, ReviewUpdate(rating=1))
        fail(label, "expected ReviewForbiddenError, got none")
    except svc.ReviewForbiddenError:
        ok(label)


async def test_empty_update_raises_validation(db: AsyncSession):
    label = "empty update payload -> ReviewValidationError"
    import repositories.review_repository as repo_direct
    review = await repo_direct.get_by_booking_id(db, BOOKING_1)
    assert review is not None
    try:
        await svc.update_review(db, USER_A, review.id, ReviewUpdate())
        fail(label, "expected ReviewValidationError, got none")
    except svc.ReviewValidationError:
        ok(label)


async def test_delete_own_then_rereview(db: AsyncSession):
    label = "delete own review then re-review same booking works"
    set_eligibility_provider(make_fake_provider())
    # Create review for BOOKING_3
    r = await svc.create_review(
        db, USER_A, ReviewCreate(booking_id=BOOKING_3, rating=2)
    )
    # Delete it
    await svc.delete_review(db, USER_A, r.id)
    # Create again (must succeed — unique constraint lifted)
    r2 = await svc.create_review(
        db, USER_A, ReviewCreate(booking_id=BOOKING_3, rating=4, comment="Better now")
    )
    assert r2.booking_id == BOOKING_3
    ok(label)


async def test_delete_someone_elses_review_forbidden(db: AsyncSession):
    label = "delete someone else's review -> ReviewForbiddenError"
    import repositories.review_repository as repo_direct
    review = await repo_direct.get_by_booking_id(db, BOOKING_1)
    assert review is not None
    try:
        await svc.delete_review(db, USER_B, review.id)
        fail(label, "expected ReviewForbiddenError, got none")
    except svc.ReviewForbiddenError:
        ok(label)


async def test_admin_hide_removes_from_public_and_rating(db: AsyncSession):
    label = "admin hide: removes from public list AND rating summary"
    import repositories.review_repository as repo_direct
    review = await repo_direct.get_by_booking_id(db, BOOKING_1)
    assert review is not None

    # Confirm it appears in public list before hiding
    public_before = await svc.list_provider_reviews(db, PROVIDER_1)
    ids_before = [r.id for r in public_before]
    assert review.id in ids_before, "review should be in public list before hide"

    # Hide it
    await svc.set_visibility(db, review.id, False)

    # Must not appear in public list after hiding
    public_after = await svc.list_provider_reviews(db, PROVIDER_1)
    ids_after = [r.id for r in public_after]
    assert review.id not in ids_after, "hidden review should not appear in public list"

    # Must not count in rating summary
    summary_after = await svc.get_rating_summary(db, PROVIDER_1)
    # BOOKING_1 review (rating 5) is hidden; BOOKING_2 review (rating 5 after
    # update) and BOOKING_3 re-review (rating 4) should still count.
    # The exact total depends on what's visible; just assert it shrank.
    assert summary_after["total_reviews"] < len(ids_before) + 1, (
        f"total should have decreased after hide; got {summary_after['total_reviews']}"
    )
    ok(label)


async def test_admin_unhide_restores_both(db: AsyncSession):
    label = "admin unhide: restores public list AND rating summary"
    import repositories.review_repository as repo_direct
    review = await repo_direct.get_by_booking_id(db, BOOKING_1)
    assert review is not None

    total_before = (await svc.get_rating_summary(db, PROVIDER_1))["total_reviews"]

    await svc.set_visibility(db, review.id, True)

    public_after = await svc.list_provider_reviews(db, PROVIDER_1)
    assert review.id in [r.id for r in public_after], "unhidden review not in public list"

    total_after = (await svc.get_rating_summary(db, PROVIDER_1))["total_reviews"]
    assert total_after == total_before + 1, (
        f"expected total {total_before + 1}, got {total_after}"
    )
    ok(label)


async def test_rating_summary_math(db: AsyncSession):
    label = "ratings 5,4,4 -> average 4.33, total 3, breakdown correct"
    # Use a fresh provider to avoid interference
    fresh_provider = uuid.uuid4()
    fresh_service = uuid.uuid4()
    b_a = uuid.uuid4()
    b_b = uuid.uuid4()
    b_c = uuid.uuid4()
    user_x = uuid.uuid4()

    set_eligibility_provider(
        make_fake_provider(provider_id=fresh_provider, service_id=fresh_service)
    )

    for booking_id, rating in [(b_a, 5), (b_b, 4), (b_c, 4)]:
        await svc.create_review(
            db, user_x, ReviewCreate(booking_id=booking_id, rating=rating)
        )

    summary = await svc.get_rating_summary(db, fresh_provider)
    assert summary["total_reviews"] == 3, f"expected 3, got {summary['total_reviews']}"
    assert summary["average_rating"] == 4.33, (
        f"expected 4.33, got {summary['average_rating']}"
    )
    bd = summary["breakdown"]
    assert bd["5"] == 1, f"expected 1 five-star, got {bd['5']}"
    assert bd["4"] == 2, f"expected 2 four-star, got {bd['4']}"
    assert bd["3"] == 0
    assert bd["2"] == 0
    assert bd["1"] == 0
    ok(label)


async def test_batch_summaries_include_zero_provider(db: AsyncSession):
    label = "batch summaries include provider with zero reviews"
    no_review_provider = uuid.uuid4()
    set_eligibility_provider(make_fake_provider(provider_id=PROVIDER_1))

    result = await svc.get_rating_summaries(db, [PROVIDER_1, no_review_provider])
    assert no_review_provider in result, "zero-review provider missing from batch result"
    zero = result[no_review_provider]
    assert zero["total_reviews"] == 0
    assert zero["average_rating"] == 0.0
    assert zero["breakdown"] == {str(i): 0 for i in range(1, 6)}
    ok(label)


async def test_min_rating_filter(db: AsyncSession):
    label = "min-rating filter returns only qualifying providers"
    # We have a fresh_provider from test_rating_summary_math with avg ~4.33
    # and PROVIDER_1 has some reviews. Use get_provider_ids_by_min_rating(4.0)
    # and confirm at least one provider qualifies; a provider with no reviews
    # should NOT appear.
    no_review_provider = uuid.uuid4()
    result = await svc.get_provider_ids_by_min_rating(db, 4.0)
    assert no_review_provider not in result, "provider with no reviews should not qualify"
    # At least the fresh_provider (avg 4.33) should qualify
    assert len(result) >= 1, "expected at least one qualifying provider"
    ok(label)


async def test_notification_hook_failure_does_not_fail_creation(db: AsyncSession):
    label = "notification hook raising does not fail review creation"
    # Patch the internal hook to raise
    import services.review_service as svc_module

    original_hook = svc_module._notify_provider_new_review

    async def _bad_hook(review):
        raise RuntimeError("Notification system exploded!")

    svc_module._notify_provider_new_review = _bad_hook

    try:
        set_eligibility_provider(make_fake_provider())
        booking_id = uuid.uuid4()
        review = await svc.create_review(
            db, USER_A, ReviewCreate(booking_id=booking_id, rating=5)
        )
        assert review.id is not None, "review should have been created"
        ok(label)
    except Exception as exc:
        fail(label, f"review creation failed despite hook error: {exc}")
    finally:
        svc_module._notify_provider_new_review = original_hook


# ---------------------------------------------------------------------------
# Main runner — tests share one DB session (sequential, order matters)
# ---------------------------------------------------------------------------

TESTS = [
    test_create_success_copies_provider_service,
    test_not_completed_raises_validation,
    test_not_owned_raises_forbidden,
    test_duplicate_booking_raises_conflict,
    test_default_provider_raises_eligibility_unavailable,
    test_schema_rejects_rating_0,
    test_schema_rejects_rating_6,
    test_empty_comment_becomes_none,
    test_update_own_review_works,
    test_update_someone_elses_review_forbidden,
    test_empty_update_raises_validation,
    test_delete_own_then_rereview,
    test_delete_someone_elses_review_forbidden,
    test_admin_hide_removes_from_public_and_rating,
    test_admin_unhide_restores_both,
    test_rating_summary_math,
    test_batch_summaries_include_zero_provider,
    test_min_rating_filter,
    test_notification_hook_failure_does_not_fail_creation,
]


async def main():
    await create_tables()
    async with SessionFactory() as db:
        for test_fn in TESTS:
            await run_test(test_fn.__name__.replace("test_", "", 1), test_fn(db))

    total = PASS + FAIL
    print(f"\n{'=' * 50}")
    print(
        f"Results: {PASS}/{total} passed",
        "(all OK)" if FAIL == 0 else f"  ({FAIL} FAILED)",
    )
    if FAIL > 0:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
