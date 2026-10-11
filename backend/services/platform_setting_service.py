"""
PlatformSetting service: all business rules live here.

This layer owns commit and rollback. The repository handles only queries.

Exceptions defined here (not in a shared module) so the controller can
import them from a single, predictable location.

Cross-module interface
----------------------
Other modules (e.g. Sayeel's bookings/payments) should call:
  - get_setting_value(db, key)          -> typed Python value for one key
  - get_setting_values(db, keys)        -> dict[str, typed value] for many keys

These functions perform a single DB query each and apply the same type
casting as the admin read path. There is no in-process cache; add one at
this layer if performance profiling identifies a need.
"""

import json
import uuid
from decimal import Decimal, InvalidOperation

from sqlalchemy.ext.asyncio import AsyncSession

import repositories.platform_setting_repository as repo
from models.platform_setting import PlatformSetting, SettingValueType


# ---------------------------------------------------------------------------
# Domain exceptions
# ---------------------------------------------------------------------------


class SettingNotFoundError(Exception):
    """Raised when a requested setting key does not exist."""

    def __init__(self, key: str | None = None, message: str | None = None):
        self.message = message or (
            f"Setting '{key}' not found" if key else "Setting not found"
        )
        super().__init__(self.message)


class SettingValidationError(Exception):
    """Raised for business-rule validation failures (wrong type, out-of-range, etc.)."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


# ---------------------------------------------------------------------------
# Type parsing / casting
# ---------------------------------------------------------------------------


def parse_value(value_type: SettingValueType, raw: str):
    """Parse and validate `raw` against `value_type`.

    Returns a typed Python value on success.
    Raises SettingValidationError with a descriptive message on failure.

    Supported conversions:
      STRING  -> str  (any non-empty string; caller ensures non-empty via schema)
      INTEGER -> int
      DECIMAL -> Decimal
      BOOLEAN -> bool; only "true" / "false" (case-insensitive) accepted
      JSON    -> parsed Python object (dict / list / scalar)

    BOOLEAN is also normalised in storage: the service saves "true" or "false"
    (lowercase) regardless of input capitalisation.
    """
    if value_type == SettingValueType.STRING:
        return raw  # schema already ensures min_length=1

    if value_type == SettingValueType.INTEGER:
        try:
            return int(raw)
        except (ValueError, TypeError):
            raise SettingValidationError(
                f"Value '{raw}' is not a valid integer for INTEGER setting."
            )

    if value_type == SettingValueType.DECIMAL:
        try:
            return Decimal(raw)
        except (InvalidOperation, ValueError, TypeError):
            raise SettingValidationError(
                f"Value '{raw}' is not a valid decimal number for DECIMAL setting."
            )

    if value_type == SettingValueType.BOOLEAN:
        normalised = raw.strip().lower()
        if normalised not in ("true", "false"):
            raise SettingValidationError(
                f"Value '{raw}' is not valid for BOOLEAN setting. "
                "Expected 'true' or 'false' (case-insensitive)."
            )
        return normalised == "true"

    if value_type == SettingValueType.JSON:
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, ValueError, TypeError):
            raise SettingValidationError(
                f"Value '{raw}' is not valid JSON for JSON setting."
            )

    raise SettingValidationError(f"Unknown value_type: {value_type!r}")


def _cast_to_typed(setting: PlatformSetting):
    """Return the setting's value cast to the appropriate Python type.

    Used by the cross-module interface functions.
    """
    return parse_value(setting.value_type, setting.value)


# ---------------------------------------------------------------------------
# Per-key business rules
# ---------------------------------------------------------------------------

# Rules are checked AFTER type parsing. Each entry is a callable that takes
# the typed value and raises SettingValidationError if the rule is violated.
# Unknown keys have no extra rule.

def _rule_commission(typed_value: Decimal):
    if not (Decimal("0") <= typed_value <= Decimal("100")):
        raise SettingValidationError(
            "platform_commission must be between 0 and 100 (inclusive)."
        )


def _rule_min_cancellation(typed_value: int):
    if typed_value < 0:
        raise SettingValidationError(
            "minimum_cancellation_hours must be >= 0."
        )


def _rule_min_reschedule(typed_value: int):
    if typed_value < 0:
        raise SettingValidationError(
            "minimum_reschedule_hours must be >= 0."
        )


def _rule_payment_hold(typed_value: int):
    if typed_value < 1:
        raise SettingValidationError(
            "payment_hold_minutes must be >= 1."
        )


def _rule_refund_policy(typed_value: str):
    if len(typed_value) > 2000:
        raise SettingValidationError(
            "refund_policy must be at most 2000 characters."
        )


_PER_KEY_RULES: dict[str, callable] = {
    "platform_commission": _rule_commission,
    "minimum_cancellation_hours": _rule_min_cancellation,
    "minimum_reschedule_hours": _rule_min_reschedule,
    "payment_hold_minutes": _rule_payment_hold,
    "refund_policy": _rule_refund_policy,
}


def _apply_key_rule(key: str, typed_value) -> None:
    """Apply the per-key business rule if one exists. No-op for unknown keys."""
    rule = _PER_KEY_RULES.get(key)
    if rule is not None:
        rule(typed_value)


# ---------------------------------------------------------------------------
# Cross-module interface (for Sayeel's bookings/payments and other modules)
# ---------------------------------------------------------------------------


async def get_setting_value(db: AsyncSession, key: str):
    """Return the typed value of a single setting by key.

    This is the primary cross-module interface. Other services should call
    this function to read platform configuration — do not query the repository
    directly.

    Raises SettingNotFoundError if the key does not exist.
    """
    setting = await repo.get_by_key(db, key)
    if setting is None:
        raise SettingNotFoundError(key)
    return _cast_to_typed(setting)


async def get_setting_values(db: AsyncSession, keys: list[str]) -> dict:
    """Return a dict mapping each requested key to its typed value.

    Issues a single DB query for all keys. This is the batch cross-module
    interface — prefer this over multiple get_setting_value calls.

    Raises SettingNotFoundError for the first missing key detected.
    """
    settings = await repo.get_many_by_keys(db, keys)
    found = {s.key: _cast_to_typed(s) for s in settings}
    for key in keys:
        if key not in found:
            raise SettingNotFoundError(key)
    return found


# ---------------------------------------------------------------------------
# Admin read operations
# ---------------------------------------------------------------------------


async def list_settings(db: AsyncSession) -> list[PlatformSetting]:
    """Return all platform settings (admin)."""
    return await repo.list_all(db)


async def get_setting(db: AsyncSession, key: str) -> PlatformSetting:
    """Return one setting by key (admin).

    Raises SettingNotFoundError if the key does not exist.
    """
    setting = await repo.get_by_key(db, key)
    if setting is None:
        raise SettingNotFoundError(key)
    return setting


async def update_setting_value(
    db: AsyncSession,
    key: str,
    raw_value: str,
    updated_by: uuid.UUID | None = None,
) -> PlatformSetting:
    """Update the value of an existing setting.

    Only `value` and `updated_by` are changeable. The key, value_type, and
    setting_group can NEVER be changed via this function (and no function
    in this service exposes such an operation).

    Validates:
      1. The key exists.
      2. The raw_value parses to the stored value_type.
      3. Per-key business rules (range, length, etc.) pass.

    Commits and refreshes on success. Rolls back on error.
    """
    setting = await repo.get_by_key(db, key)
    if setting is None:
        raise SettingNotFoundError(key)

    # Type validation
    typed_value = parse_value(setting.value_type, raw_value)

    # Per-key business rule
    _apply_key_rule(key, typed_value)

    # Normalise BOOLEAN storage to lowercase "true"/"false"
    if setting.value_type == SettingValueType.BOOLEAN:
        normalised_raw = "true" if typed_value else "false"
    else:
        normalised_raw = raw_value

    updates = {"value": normalised_raw, "updated_by": updated_by}
    await repo.apply_updates(db, setting, updates)
    await db.commit()
    await db.refresh(setting)
    return setting


# ---------------------------------------------------------------------------
# Public read operations
# ---------------------------------------------------------------------------


async def list_public_settings(db: AsyncSession) -> list[PlatformSetting]:
    """Return only public settings (is_public=True)."""
    return await repo.list_public(db)


# ---------------------------------------------------------------------------
# Seed function (idempotent — call from migration/seed step only)
# ---------------------------------------------------------------------------

_SEED_SETTINGS = [
    {
        "key": "platform_commission",
        "value": "10.00",
        "value_type": SettingValueType.DECIMAL,
        "setting_group": "payment",
        "is_public": False,
        "description": "Percent of each paid booking taken by the platform",
    },
    {
        "key": "minimum_cancellation_hours",
        "value": "24",
        "value_type": SettingValueType.INTEGER,
        "setting_group": "booking",
        "is_public": False,
        "description": "Minimum hours before start time a customer may cancel",
    },
    {
        "key": "minimum_reschedule_hours",
        "value": "12",
        "value_type": SettingValueType.INTEGER,
        "setting_group": "booking",
        "is_public": False,
        "description": "Minimum hours before start time a customer may reschedule",
    },
    {
        "key": "refund_policy",
        "value": (
            "Full refund if cancelled at least 24 hours before the appointment; "
            "no refund after that."
        ),
        "value_type": SettingValueType.STRING,
        "setting_group": "payment",
        "is_public": True,
        "description": "Refund policy text shown to customers",
    },
    {
        "key": "payment_hold_minutes",
        "value": "15",
        "value_type": SettingValueType.INTEGER,
        "setting_group": "payment",
        "is_public": False,
        "description": "How long a pending payment holds the slot",
    },
]


async def seed_default_settings(db: AsyncSession) -> None:
    """Insert the five default settings if they do not exist yet.

    Idempotent: keys that already exist are left untouched (values are never
    overwritten). Call this from Alishba's seed/migration step — do NOT call
    it on application startup.
    """
    for entry in _SEED_SETTINGS:
        existing = await repo.get_by_key(db, entry["key"])
        if existing is not None:
            continue  # already seeded — never overwrite
        setting = PlatformSetting(
            key=entry["key"],
            value=entry["value"],
            value_type=entry["value_type"],
            setting_group=entry["setting_group"],
            is_public=entry["is_public"],
            description=entry["description"],
        )
        await repo.add(db, setting)

    await db.commit()
