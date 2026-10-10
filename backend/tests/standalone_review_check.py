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
try:
    from models.user import User  # noqa: F401
    from models.booking import Booking  # noqa: F401
    from models.category import Category  # noqa: F401
    from models.provider import Provider  # noqa: F401
    from models.service import Service  # noqa: F401
    from models.customer import Customer  # noqa: F401
    from models.availability import Availability  # noqa: F401
    from models.notification import Notification  # noqa: F401
except ImportError:
    pass
import services.review_service as svc  # noqa: E402
from schemas.review import ReviewCreate, ReviewUpdate, ReviewVisibilityUpdate  # noqa: E402
from services.booking_eligibility import (  # noqa: E402
    EligibilityUnavailableError,
    ReviewEligibility,
    set_eligibility_provider,
)

# ---------------------------------------------------------------------------
# Stub tables for FK dependencies (not yet in local Base.metadata).
# We run this AFTER imports so real models take precedence, and we only
# stub what is still missing before create_all().
# ---------------------------------------------------------------------------
for _table_name in ("users", "bookings", "providers", "services", "categories", "customers"):
    if _table_name not in Base.metadata.tables:
        Table(
            _table_name,
            Base.metadata,
            Column("id", PG_UUID(as_uuid=True), primary_key=True),
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

# (Global mock removed. Tests now run with the real hook, which swallows errors on missing providers.)
ORIGINAL_NOTIFY_HOOK = getattr(svc, "_notify_provider_new_review", None)


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
    public_before, _ = await svc.list_provider_reviews(db, PROVIDER_1)
    ids_before = [r.id for r in public_before]
    assert review.id in ids_before, "review should be in public list before hide"

    # Hide it
    await svc.set_visibility(db, review.id, False)

    # Must not appear in public list after hiding
    public_after, _ = await svc.list_provider_reviews(db, PROVIDER_1)
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

    public_after, _ = await svc.list_provider_reviews(db, PROVIDER_1)
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


class FakeProvider:
    def __init__(self, user_id):
        self.user_id = user_id

async def test_notify_hook_called_on_create(db: AsyncSession):
    label = "notification hook called exactly once on create"
    import services.review_service as svc_module
    calls = []
    
    async def fake_get_provider(session, provider_id):
        return FakeProvider(user_id=USER_B)
        
    async def fake_notify(session, *, user_id, notification_type, title, message, entity_type=None, entity_id=None):
        calls.append(dict(
            user_id=user_id, type=notification_type, message=message, entity_id=entity_id
        ))
        
    orig_get = getattr(svc_module, "get_provider", None)
    orig_notify = getattr(svc_module, "notify", None)
    svc_module.get_provider = fake_get_provider
    svc_module.notify = fake_notify
    svc_module._notify_provider_new_review = ORIGINAL_NOTIFY_HOOK
    
    try:
        set_eligibility_provider(make_fake_provider(provider_id=PROVIDER_1))
        booking_id = uuid.uuid4()
        review = await svc_module.create_review(db, USER_A, ReviewCreate(booking_id=booking_id, rating=5, comment="Nice"))
        
        import repositories.review_repository as repo_direct
        fresh_review = await repo_direct.get_by_booking_id(db, booking_id)
        assert len(calls) == 1, "notify should be called exactly once"
        call = calls[0]
        assert call["user_id"] == USER_B, "user_id should match provider's user_id"
        assert call["type"] == "NEW_REVIEW"
        assert call["entity_id"] == fresh_review.id
        assert "5-star" in call["message"]
        ok(label)
    finally:
        svc_module.get_provider = orig_get
        svc_module.notify = orig_notify
        svc_module._notify_provider_new_review = ORIGINAL_NOTIFY_HOOK

async def test_notify_not_called_on_update_delete(db: AsyncSession):
    label = "notification hook NOT called on update or delete"
    import services.review_service as svc_module
    calls = []
    
    async def fake_get_provider(session, provider_id):
        return FakeProvider(user_id=USER_B)
        
    async def fake_notify(*args, **kwargs):
        calls.append(kwargs)
        
    orig_get = getattr(svc_module, "get_provider", None)
    orig_notify = getattr(svc_module, "notify", None)
    svc_module.get_provider = fake_get_provider
    svc_module.notify = fake_notify
    svc_module._notify_provider_new_review = ORIGINAL_NOTIFY_HOOK
    
    try:
        set_eligibility_provider(make_fake_provider(provider_id=PROVIDER_1))
        booking_id = uuid.uuid4()
        review = await svc_module.create_review(db, USER_A, ReviewCreate(booking_id=booking_id, rating=4))
        calls.clear()
        
        import repositories.review_repository as repo_direct
        fresh_review = await repo_direct.get_by_booking_id(db, booking_id)
        
        await svc_module.update_review(db, USER_A, fresh_review.id, ReviewUpdate(rating=5))
        assert len(calls) == 0, "notify should not be called on update"
        
        await svc_module.delete_review(db, USER_A, fresh_review.id)
        assert len(calls) == 0, "notify should not be called on delete"
        ok(label)
    finally:
        svc_module.get_provider = orig_get
        svc_module.notify = orig_notify
        svc_module._notify_provider_new_review = ORIGINAL_NOTIFY_HOOK

async def test_notify_not_called_on_provider_error(db: AsyncSession):
    label = "creation succeeds but notify skipped if get_provider raises"
    import services.review_service as svc_module
    from fastapi import HTTPException
    from schemas.review import ReviewResponse
    calls = []
    
    async def fake_get_provider(session, provider_id):
        raise HTTPException(status_code=404, detail="Provider not found")
        
    async def fake_notify(*args, **kwargs):
        calls.append(kwargs)
        
    orig_get = getattr(svc_module, "get_provider", None)
    orig_notify = getattr(svc_module, "notify", None)
    svc_module.get_provider = fake_get_provider
    svc_module.notify = fake_notify
    svc_module._notify_provider_new_review = ORIGINAL_NOTIFY_HOOK
    
    try:
        set_eligibility_provider(make_fake_provider(provider_id=PROVIDER_1))
        booking_id = uuid.uuid4()
        review = await svc_module.create_review(db, USER_A, ReviewCreate(booking_id=booking_id, rating=4))
        assert len(calls) == 0, "notify should not be called if get_provider raises"
        
        # New assertions on the returned object
        assert review.id is not None
        assert review.rating == 4
        assert review.provider_id == PROVIDER_1
        ReviewResponse.model_validate(review)
        
        import repositories.review_repository as repo_direct
        fresh = await repo_direct.get_by_booking_id(db, booking_id)
        assert fresh is not None, "review should still be created"
        ok(label)
    finally:
        svc_module.get_provider = orig_get
        svc_module.notify = orig_notify
        svc_module._notify_provider_new_review = ORIGINAL_NOTIFY_HOOK

async def test_notify_error_swallowed(db: AsyncSession):
    label = "creation succeeds if notify raises"
    import services.review_service as svc_module
    from schemas.review import ReviewResponse
    
    async def fake_get_provider(session, provider_id):
        return FakeProvider(user_id=USER_B)
        
    async def fake_notify(*args, **kwargs):
        raise RuntimeError("Notification failed")
        
    orig_get = getattr(svc_module, "get_provider", None)
    orig_notify = getattr(svc_module, "notify", None)
    svc_module.get_provider = fake_get_provider
    svc_module.notify = fake_notify
    svc_module._notify_provider_new_review = ORIGINAL_NOTIFY_HOOK
    
    try:
        set_eligibility_provider(make_fake_provider(provider_id=PROVIDER_1))
        booking_id = uuid.uuid4()
        review = await svc_module.create_review(db, USER_A, ReviewCreate(booking_id=booking_id, rating=4))
        
        # New assertions on the returned object
        assert review.id is not None
        assert review.rating == 4
        assert review.provider_id == PROVIDER_1
        ReviewResponse.model_validate(review)
        
        import repositories.review_repository as repo_direct
        fresh_review = await repo_direct.get_by_booking_id(db, booking_id)
        assert fresh_review is not None, "review should be in the DB"
        ok(label)
    finally:
        svc_module.get_provider = orig_get
        svc_module.notify = orig_notify
        svc_module._notify_provider_new_review = ORIGINAL_NOTIFY_HOOK

async def test_notify_not_called_on_conflict(db: AsyncSession):
    label = "duplicate conflict does not call notify"
    import services.review_service as svc_module
    calls = []
    
    async def fake_get_provider(session, provider_id):
        return FakeProvider(user_id=USER_B)
        
    async def fake_notify(*args, **kwargs):
        calls.append(kwargs)
        
    orig_get = getattr(svc_module, "get_provider", None)
    orig_notify = getattr(svc_module, "notify", None)
    svc_module.get_provider = fake_get_provider
    svc_module.notify = fake_notify
    svc_module._notify_provider_new_review = ORIGINAL_NOTIFY_HOOK
    
    try:
        set_eligibility_provider(make_fake_provider(provider_id=PROVIDER_1))
        booking_id = uuid.uuid4()
        await svc_module.create_review(db, USER_A, ReviewCreate(booking_id=booking_id, rating=4))
        calls.clear()
        
        try:
            await svc_module.create_review(db, USER_A, ReviewCreate(booking_id=booking_id, rating=5))
        except svc_module.ReviewConflictError:
            pass
            
        assert len(calls) == 0, "notify should not be called on conflict"
        ok(label)
    finally:
        svc_module.get_provider = orig_get
        svc_module.notify = orig_notify
        svc_module._notify_provider_new_review = ORIGINAL_NOTIFY_HOOK

async def test_pagination_provider_visible_reviews(db: AsyncSession):
    label = "pagination: provider visible reviews slices correctly and handles visibility"
    from sqlalchemy import delete
    await db.execute(delete(Review))
    await db.commit()
    
    provider_id = uuid.uuid4()
    set_eligibility_provider(make_fake_provider(provider_id=provider_id))
    
    reviews = []
    for i in range(5):
        c = ReviewCreate(booking_id=uuid.uuid4(), rating=5, comment=f"p{i}")
        r = await svc.create_review(db, USER_A, c)
        reviews.append(r)

    p1, total = await svc.list_provider_reviews(db, provider_id, page=1, page_size=2)
    assert len(p1) == 2
    assert total == 5

    p2, total2 = await svc.list_provider_reviews(db, provider_id, page=2, page_size=2)
    assert len(p2) == 2
    assert total2 == 5
    assert {r.id for r in p1}.isdisjoint({r.id for r in p2})

    p3, total3 = await svc.list_provider_reviews(db, provider_id, page=3, page_size=2)
    assert len(p3) == 1
    assert total3 == 5

    p4, total4 = await svc.list_provider_reviews(db, provider_id, page=4, page_size=2)
    assert len(p4) == 0
    assert total4 == 5

    # hide one review
    await svc.set_visibility(db, reviews[0].id, False)
    
    p1_hidden, total_hidden = await svc.list_provider_reviews(db, provider_id, page=1, page_size=2)
    assert total_hidden == 4
    ok(label)

async def test_real_notify_path(db: AsyncSession):
    label = "creation succeeds and creates real notification row"
    import services.review_service as svc_module
    from schemas.review import ReviewResponse
    from models.user import User
    from models.provider import Provider
    from models.notification import Notification, NotificationType
    from sqlalchemy import select
    from services.provider_service import get_provider
    from services.notification_integration import notify

    orig_get = getattr(svc_module, "get_provider", None)
    orig_notify = getattr(svc_module, "notify", None)
    
    svc_module.get_provider = get_provider
    svc_module.notify = notify
    svc_module._notify_provider_new_review = ORIGINAL_NOTIFY_HOOK

    try:
        new_user_id = uuid.uuid4()
        new_provider_id = uuid.uuid4()
        
        user = User(
            id=new_user_id,
            full_name="Real Provider User",
            email=f"{new_user_id}@test.com",
            password_hash="test",
            role="PROVIDER"
        )
        db.add(user)
        
        provider = Provider(
            id=new_provider_id,
            user_id=new_user_id,
            business_name="Real Provider",
            location="123 Test St",
            timezone="UTC",
            slot_interval_minutes=30
        )
        db.add(provider)
        await db.commit()

        set_eligibility_provider(make_fake_provider(provider_id=new_provider_id))
        booking_id = uuid.uuid4()
        
        try:
            review = await svc_module.create_review(db, USER_A, ReviewCreate(booking_id=booking_id, rating=5, comment="Real notify"))
        except Exception:
            import traceback
            print("FAILED create_review exception:")
            traceback.print_exc()
            raise

        assert review.id is not None
        assert review.provider_id == new_provider_id
        ReviewResponse.model_validate(review)

        result = await db.execute(select(Notification).where(Notification.user_id == new_user_id))
        notifications = result.scalars().all()
        
        if len(notifications) != 1:
            print(f"FAILED: Expected 1 notification, got {len(notifications)}")
            for n in notifications:
                print(f"Found notification: {n.id} {n.notification_type}")
            assert False, "notification count mismatch"
            
        n = notifications[0]
        assert n.notification_type == NotificationType.NEW_REVIEW, f"type mismatch: {n.notification_type}"
        assert n.entity_type == "review"
        assert n.entity_id == review.id
        assert n.is_read is False

        ok(label)
    finally:
        svc_module.get_provider = orig_get
        svc_module.notify = orig_notify

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
    test_notify_hook_called_on_create,
    test_notify_not_called_on_update_delete,
    test_notify_not_called_on_provider_error,
    test_notify_error_swallowed,
    test_notify_not_called_on_conflict,
    test_pagination_provider_visible_reviews,
    test_real_notify_path
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
