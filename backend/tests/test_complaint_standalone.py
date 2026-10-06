"""
Standalone async test for the Complaint module.
"""

import asyncio
import sys
import traceback
import uuid

from sqlalchemy import Column, Table
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.exc import IntegrityError

import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import Base
from models.complaint import Complaint, ComplaintStatus, ComplaintType

for _table_name in ("users", "bookings", "providers"):
    if _table_name not in Base.metadata.tables:
        Table(
            _table_name,
            Base.metadata,
            Column("id", PG_UUID(as_uuid=True), primary_key=True),
        )

import services.complaint_service as svc
from schemas.complaint import ComplaintAdminUpdate, ComplaintCreate
import repositories.complaint_repository as repo

ENGINE = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
SessionFactory = async_sessionmaker(
    bind=ENGINE, class_=AsyncSession, expire_on_commit=False
)

async def create_tables():
    async with ENGINE.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

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
    try:
        await coro
    except AssertionError as exc:
        fail(label, str(exc) or "AssertionError")
    except Exception:
        fail(label, traceback.format_exc(limit=4))

USER_1 = uuid.uuid4()
USER_2 = uuid.uuid4()
ADMIN_1 = uuid.uuid4()
BOOKING_1 = uuid.uuid4()
PROVIDER_1 = uuid.uuid4()

async def test_create_success_status_open(db: AsyncSession):
    label = "create success sets status OPEN and null resolved fields"
    payload = ComplaintCreate(
        complaint_type=ComplaintType.PLATFORM, 
        subject="Issue", 
        description="Something is broken"
    )
    comp = await svc.create_complaint(db, USER_1, payload)
    assert comp.status == ComplaintStatus.OPEN
    assert comp.resolved_at is None
    assert comp.resolved_by is None
    ok(label)

async def test_schema_rejects_booking_without_id(db: AsyncSession):
    label = "schema rejects BOOKING without booking_id"
    try:
        ComplaintCreate(complaint_type=ComplaintType.BOOKING, subject="Sub", description="Desc")
        fail(label, "Expected ValueError")
    except ValueError:
        ok(label)

async def test_schema_rejects_provider_without_id(db: AsyncSession):
    label = "schema rejects PROVIDER without provider_id"
    try:
        ComplaintCreate(complaint_type=ComplaintType.PROVIDER, subject="Sub", description="Desc")
        fail(label, "Expected ValueError")
    except ValueError:
        ok(label)

async def test_schema_platform_needs_neither(db: AsyncSession):
    label = "PLATFORM needs neither"
    comp = ComplaintCreate(complaint_type=ComplaintType.PLATFORM, subject="Sub", description="Desc")
    assert comp.booking_id is None
    assert comp.provider_id is None
    ok(label)

async def test_subject_empty_rejected(db: AsyncSession):
    label = "subject empty rejected"
    try:
        ComplaintCreate(complaint_type=ComplaintType.PLATFORM, subject="", description="Desc")
        fail(label, "Expected ValidationError")
    except ValueError:
        ok(label)

async def test_owner_can_read_own(db: AsyncSession):
    label = "owner can read own"
    payload = ComplaintCreate(complaint_type=ComplaintType.PLATFORM, subject="My Issue", description="Desc")
    comp = await svc.create_complaint(db, USER_2, payload)
    read_comp = await svc.get_my_complaint(db, USER_2, comp.id)
    assert read_comp.id == comp.id
    ok(label)

async def test_reading_someone_else_forbidden(db: AsyncSession):
    label = "reading someone else's -> forbidden"
    payload = ComplaintCreate(complaint_type=ComplaintType.PLATFORM, subject="User 1 issue", description="Desc")
    comp = await svc.create_complaint(db, USER_1, payload)
    try:
        await svc.get_my_complaint(db, USER_2, comp.id)
        fail(label, "Expected ForbiddenError")
    except svc.ComplaintForbiddenError:
        ok(label)

async def test_my_list_returns_only_mine(db: AsyncSession):
    label = "my list returns only mine"
    my_list = await svc.list_my_complaints(db, USER_2)
    assert len(my_list) == 1
    assert my_list[0].subject == "My Issue"
    ok(label)

async def test_admin_list_filters(db: AsyncSession):
    label = "admin list filters by status and by type"
    lst = await svc.list_admin_complaints(db, status=ComplaintStatus.OPEN, complaint_type=ComplaintType.PLATFORM)
    assert len(lst) >= 2 
    lst_empty = await svc.list_admin_complaints(db, status=ComplaintStatus.RESOLVED)
    assert len(lst_empty) == 0
    ok(label)

async def test_open_to_in_review(db: AsyncSession):
    label = "OPEN->IN_REVIEW with response keeps resolved_at None"
    payload = ComplaintCreate(complaint_type=ComplaintType.PLATFORM, subject="Issue", description="Desc")
    comp = await svc.create_complaint(db, USER_1, payload)
    upd = ComplaintAdminUpdate(status=ComplaintStatus.IN_REVIEW, admin_response="Looking into it")
    updated = await svc.update_complaint_status(db, comp.id, upd, ADMIN_1)
    assert updated.status == ComplaintStatus.IN_REVIEW
    assert updated.admin_response == "Looking into it"
    assert updated.resolved_at is None
    ok(label)

async def test_in_review_to_resolved(db: AsyncSession):
    label = "IN_REVIEW->RESOLVED requires admin_response (schema) and sets resolved_at and resolved_by"
    # Find the one in IN_REVIEW
    lst = await svc.list_admin_complaints(db, status=ComplaintStatus.IN_REVIEW)
    comp = lst[0]
    
    try:
        ComplaintAdminUpdate(status=ComplaintStatus.RESOLVED)
        fail(label, "Schema should reject resolved without response")
    except ValueError:
        pass

    upd = ComplaintAdminUpdate(status=ComplaintStatus.RESOLVED, admin_response="Fixed")
    updated = await svc.update_complaint_status(db, comp.id, upd, ADMIN_1)
    assert updated.status == ComplaintStatus.RESOLVED
    assert updated.resolved_at is not None
    assert updated.resolved_by == ADMIN_1
    ok(label)

async def test_resolved_to_in_review_rejected(db: AsyncSession):
    label = "RESOLVED->IN_REVIEW rejected"
    lst = await svc.list_admin_complaints(db, status=ComplaintStatus.RESOLVED)
    comp = lst[0]
    upd = ComplaintAdminUpdate(status=ComplaintStatus.IN_REVIEW, admin_response="Wait")
    try:
        await svc.update_complaint_status(db, comp.id, upd, ADMIN_1)
        fail(label, "Expected ValidationError")
    except svc.ComplaintValidationError:
        ok(label)

async def test_rejected_to_resolved_rejected(db: AsyncSession):
    label = "REJECTED->RESOLVED rejected"
    payload = ComplaintCreate(complaint_type=ComplaintType.PLATFORM, subject="Another", description="Desc")
    comp = await svc.create_complaint(db, USER_1, payload)
    
    upd_rej = ComplaintAdminUpdate(status=ComplaintStatus.REJECTED, admin_response="No")
    updated_rej = await svc.update_complaint_status(db, comp.id, upd_rej, ADMIN_1)
    
    upd_res = ComplaintAdminUpdate(status=ComplaintStatus.RESOLVED, admin_response="Yes")
    try:
        await svc.update_complaint_status(db, updated_rej.id, upd_res, ADMIN_1)
        fail(label, "Expected ValidationError")
    except svc.ComplaintValidationError:
        ok(label)

async def test_open_to_resolved(db: AsyncSession):
    label = "OPEN->RESOLVED directly allowed with response"
    payload = ComplaintCreate(complaint_type=ComplaintType.PLATFORM, subject="Direct resolve", description="Desc")
    comp = await svc.create_complaint(db, USER_1, payload)
    
    upd = ComplaintAdminUpdate(status=ComplaintStatus.RESOLVED, admin_response="Done")
    updated = await svc.update_complaint_status(db, comp.id, upd, ADMIN_1)
    assert updated.status == ComplaintStatus.RESOLVED
    assert updated.resolved_at is not None
    ok(label)

async def test_counts_by_status(db: AsyncSession):
    label = "counts_by_status returns all four keys including zeros"
    counts = await svc.get_complaint_counts_by_status(db)
    assert set(counts.keys()) == {"OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"}
    assert counts["RESOLVED"] >= 2
    assert counts["REJECTED"] >= 1
    assert counts["IN_REVIEW"] == 0
    ok(label)

async def test_db_check_constraint(db: AsyncSession):
    label = "the DB CheckConstraint itself rejects a BOOKING row with null booking_id inserted directly"
    comp = Complaint(
        user_id=USER_1,
        complaint_type=ComplaintType.BOOKING,
        subject="DB reject",
        description="test",
        status=ComplaintStatus.OPEN
    )
    try:
        await repo.add(db, comp)
        await db.commit()
        fail(label, "Expected IntegrityError")
    except IntegrityError:
        await db.rollback()
        ok(label)

async def test_update_status_omits_admin_response_keeps_existing(db: AsyncSession):
    label = "IN_REVIEW->IN_REVIEW omitting admin_response keeps existing"
    payload = ComplaintCreate(complaint_type=ComplaintType.PLATFORM, subject="Test response", description="Desc")
    comp = await svc.create_complaint(db, USER_1, payload)
    
    # First set to IN_REVIEW with a response
    upd1 = ComplaintAdminUpdate(status=ComplaintStatus.IN_REVIEW, admin_response="Looking into it")
    updated1 = await svc.update_complaint_status(db, comp.id, upd1, ADMIN_1)
    assert updated1.admin_response == "Looking into it"
    
    # Now set to IN_REVIEW but omit the response
    upd2 = ComplaintAdminUpdate.model_validate({"status": "IN_REVIEW"})
    updated2 = await svc.update_complaint_status(db, comp.id, upd2, ADMIN_1)
    assert updated2.admin_response == "Looking into it"
    
    # Explicitly clear it
    upd3 = ComplaintAdminUpdate.model_validate({"status": "IN_REVIEW", "admin_response": None})
    updated3 = await svc.update_complaint_status(db, comp.id, upd3, ADMIN_1)
    assert updated3.admin_response is None
    ok(label)

TESTS = [
    test_create_success_status_open,
    test_schema_rejects_booking_without_id,
    test_schema_rejects_provider_without_id,
    test_schema_platform_needs_neither,
    test_subject_empty_rejected,
    test_owner_can_read_own,
    test_reading_someone_else_forbidden,
    test_my_list_returns_only_mine,
    test_admin_list_filters,
    test_open_to_in_review,
    test_in_review_to_resolved,
    test_resolved_to_in_review_rejected,
    test_rejected_to_resolved_rejected,
    test_open_to_resolved,
    test_counts_by_status,
    test_db_check_constraint,
    test_update_status_omits_admin_response_keeps_existing
]

async def main():
    await create_tables()
    async with SessionFactory() as db:
        for test_fn in TESTS:
            await run_test(test_fn.__name__, test_fn(db))

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
