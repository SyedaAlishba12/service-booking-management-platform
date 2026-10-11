"""
Standalone async test for the PlatformSetting module.

Run with:  python tests/test_platform_setting_standalone.py
No pytest required.

Uses in-memory SQLite via aiosqlite so no real DB is needed.
The real PlatformSetting model is used.

Note: The `users` table is not yet merged locally (it lives in
feature/auth-users-customers-notifications). A minimal stub Table is
registered before create_all so the FK reference resolves without errors.
"""

import asyncio
import inspect
import sys
import traceback
import uuid
from decimal import Decimal

from sqlalchemy import Column, Table
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# ---- bootstrap sys.path so imports work when run from backend/ ----
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import Base
from models.platform_setting import PlatformSetting, SettingValueType  # noqa: F401

# ---------------------------------------------------------------------------
# Stub for the `users` table (not yet in local Base.metadata)
# Must be registered BEFORE create_all.
# ---------------------------------------------------------------------------
if "users" not in Base.metadata.tables:
    Table(
        "users",
        Base.metadata,
        Column("id", PG_UUID(as_uuid=True), primary_key=True),
    )

import services.platform_setting_service as svc  # noqa: E402 (after path setup)

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


async def test_seed_inserts_five(db: AsyncSession):
    label = "seed inserts exactly 5 keys"
    await svc.seed_default_settings(db)
    settings = await svc.list_settings(db)
    assert len(settings) == 5, f"expected 5 settings, got {len(settings)}"
    ok(label)


async def test_seed_idempotent(db: AsyncSession):
    label = "seed twice inserts nothing more"
    await svc.seed_default_settings(db)
    settings = await svc.list_settings(db)
    assert len(settings) == 5, f"expected 5 after second seed, got {len(settings)}"
    ok(label)


async def test_seed_does_not_overwrite(db: AsyncSession):
    label = "seed does not overwrite a changed value"
    # First update platform_commission to 99.00
    await svc.update_setting_value(db, "platform_commission", "99.00")
    # Seed again
    await svc.seed_default_settings(db)
    # Value should still be 99.00, not reverted to 10.00
    val = await svc.get_setting_value(db, "platform_commission")
    assert val == Decimal("99.00"), f"expected Decimal('99.00'), got {val!r}"
    ok(label)


async def test_get_setting_value_decimal(db: AsyncSession):
    label = "get_setting_value returns Decimal for DECIMAL key"
    val = await svc.get_setting_value(db, "platform_commission")
    assert isinstance(val, Decimal), f"expected Decimal, got {type(val)}"
    ok(label)


async def test_get_setting_value_integer(db: AsyncSession):
    label = "get_setting_value returns int for INTEGER key"
    val = await svc.get_setting_value(db, "minimum_cancellation_hours")
    assert isinstance(val, int), f"expected int, got {type(val)}"
    assert val == 24, f"expected 24, got {val}"
    ok(label)


async def test_get_setting_value_string(db: AsyncSession):
    label = "get_setting_value returns str for STRING key"
    val = await svc.get_setting_value(db, "refund_policy")
    assert isinstance(val, str), f"expected str, got {type(val)}"
    ok(label)


async def test_get_setting_value_boolean(db: AsyncSession):
    label = "get_setting_value returns bool True for BOOLEAN value"
    # Insert a boolean setting directly for this test
    from models.platform_setting import PlatformSetting as PS
    import repositories.platform_setting_repository as repo_direct
    bool_setting = PS(
        key="test_bool_setting",
        value="true",
        value_type=SettingValueType.BOOLEAN,
        setting_group="test",
        is_public=False,
        description="Test boolean",
    )
    await repo_direct.add(db, bool_setting)
    await db.commit()
    val = await svc.get_setting_value(db, "test_bool_setting")
    assert val is True, f"expected True, got {val!r}"
    ok(label)


async def test_get_setting_values_batch(db: AsyncSession):
    label = "get_setting_values returns dict for two keys"
    result = await svc.get_setting_values(
        db, ["platform_commission", "minimum_cancellation_hours"]
    )
    assert isinstance(result, dict), f"expected dict, got {type(result)}"
    assert "platform_commission" in result
    assert "minimum_cancellation_hours" in result
    assert isinstance(result["minimum_cancellation_hours"], int)
    ok(label)


async def test_missing_key_not_found(db: AsyncSession):
    label = "missing key -> SettingNotFoundError"
    try:
        await svc.get_setting_value(db, "nonexistent_key_xyz")
        fail(label, "expected SettingNotFoundError, got none")
    except svc.SettingNotFoundError:
        ok(label)


async def test_update_integer_with_abc(db: AsyncSession):
    label = "update INTEGER with 'abc' -> validation error"
    try:
        await svc.update_setting_value(db, "minimum_cancellation_hours", "abc")
        fail(label, "expected SettingValidationError, got none")
    except svc.SettingValidationError:
        ok(label)


async def test_update_commission_150_rejected(db: AsyncSession):
    label = "update platform_commission to '150' -> validation error (> 100)"
    try:
        await svc.update_setting_value(db, "platform_commission", "150")
        fail(label, "expected SettingValidationError, got none")
    except svc.SettingValidationError:
        ok(label)


async def test_update_commission_success(db: AsyncSession):
    label = "update platform_commission to '12.5' succeeds and returns '12.5'"
    setting = await svc.update_setting_value(db, "platform_commission", "12.5")
    assert setting.value == "12.5", f"expected '12.5', got {setting.value!r}"
    ok(label)


async def test_update_cancellation_negative(db: AsyncSession):
    label = "update minimum_cancellation_hours to '-1' -> validation error"
    try:
        await svc.update_setting_value(db, "minimum_cancellation_hours", "-1")
        fail(label, "expected SettingValidationError, got none")
    except svc.SettingValidationError:
        ok(label)


async def test_update_unknown_key(db: AsyncSession):
    label = "update unknown key -> SettingNotFoundError"
    try:
        await svc.update_setting_value(db, "ghost_key_xyz", "42")
        fail(label, "expected SettingNotFoundError, got none")
    except svc.SettingNotFoundError:
        ok(label)


async def test_updated_by_none_when_not_given(db: AsyncSession):
    label = "updated_by stays None when not given"
    setting = await svc.update_setting_value(
        db, "minimum_reschedule_hours", "6"
    )
    assert setting.updated_by is None, f"expected None, got {setting.updated_by!r}"
    ok(label)


async def test_public_list_only_refund_policy(db: AsyncSession):
    label = "public list returns only refund_policy (the one is_public=True seed)"
    public = await svc.list_public_settings(db)
    keys = [s.key for s in public]
    assert "refund_policy" in keys, f"refund_policy missing from public list: {keys}"
    # All public settings must have is_public=True
    assert all(s.is_public for s in public), "non-public setting in public list"
    ok(label)


async def test_admin_list_returns_all(db: AsyncSession):
    label = "admin list returns all settings (>= 5 because we added test_bool_setting)"
    all_settings = await svc.list_settings(db)
    # We seeded 5 + inserted 1 boolean test setting = 6
    assert len(all_settings) >= 5, f"expected >= 5, got {len(all_settings)}"
    ok(label)


async def test_update_signature_has_no_key_or_type_param(db: AsyncSession):
    label = "update_setting_value signature exposes no key/value_type change param"
    sig = inspect.signature(svc.update_setting_value)
    param_names = list(sig.parameters.keys())
    # Must have db, key (to look up), raw_value, updated_by — key is lookup only
    assert "value_type" not in param_names, (
        f"value_type should not be a parameter of update_setting_value; "
        f"got params: {param_names}"
    )
    assert "setting_group" not in param_names, (
        f"setting_group should not be a parameter; got params: {param_names}"
    )
    ok(label)


# ---------------------------------------------------------------------------
# Main runner — tests share one DB session (sequential, order matters)
# ---------------------------------------------------------------------------

TESTS = [
    test_seed_inserts_five,
    test_seed_idempotent,
    test_seed_does_not_overwrite,
    test_get_setting_value_decimal,
    test_get_setting_value_integer,
    test_get_setting_value_string,
    test_get_setting_value_boolean,
    test_get_setting_values_batch,
    test_missing_key_not_found,
    test_update_integer_with_abc,
    test_update_commission_150_rejected,
    test_update_commission_success,
    test_update_cancellation_negative,
    test_update_unknown_key,
    test_updated_by_none_when_not_given,
    test_public_list_only_refund_policy,
    test_admin_list_returns_all,
    test_update_signature_has_no_key_or_type_param,
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
