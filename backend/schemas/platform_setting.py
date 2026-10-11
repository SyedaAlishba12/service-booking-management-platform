"""
Pydantic v2 schemas for the PlatformSetting resource.

Naming convention: PascalCase classes, snake_case fields.
str_strip_whitespace=True on all schemas that accept user input.

The `value` field in SettingResponse is typed: integers become int, booleans
become bool, JSON becomes a parsed object, and STRING/DECIMAL stay as str
(decimals are returned as strings to avoid floating-point precision loss).
"""

import json
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from models.platform_setting import SettingValueType


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class SettingUpdate(BaseModel):
    """Payload for PUT /api/admin/settings/{key}."""

    model_config = ConfigDict(str_strip_whitespace=True)

    value: str = Field(..., min_length=1)


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


def _cast_value(value_type: SettingValueType, raw: str) -> Any:
    """Convert raw stored text to the appropriate Python type for serialisation.

    This is schema-layer casting only; it assumes the stored value is already
    valid (the service validates before saving).
    """
    if value_type == SettingValueType.INTEGER:
        try:
            return int(raw)
        except (ValueError, TypeError):
            return raw
    if value_type == SettingValueType.BOOLEAN:
        return raw.lower() == "true"
    if value_type == SettingValueType.JSON:
        try:
            return json.loads(raw)
        except (ValueError, TypeError):
            return raw
    # STRING and DECIMAL — return as-is (str)
    return raw


class SettingResponse(BaseModel):
    """Shape of a single platform setting returned in API responses."""

    model_config = ConfigDict(from_attributes=True)

    key: str
    value: Any  # typed at serialisation time via model_validator
    value_type: SettingValueType
    setting_group: str
    description: str | None
    is_public: bool
    updated_by: uuid.UUID | None
    updated_at: datetime

    @classmethod
    def model_validate(cls, obj, **kwargs):  # type: ignore[override]
        """Override to cast `value` to the correct Python type after loading."""
        instance = super().model_validate(obj, **kwargs)
        # Cast value using the resolved value_type
        instance.value = _cast_value(instance.value_type, instance.value)
        return instance


# ---------------------------------------------------------------------------
# Envelope schemas (mirrors Category's pattern)
# ---------------------------------------------------------------------------


class SettingListResponse(BaseModel):
    """Envelope for list endpoints."""

    success: bool
    message: str
    data: list[SettingResponse]


class SettingDetailResponse(BaseModel):
    """Envelope for single-item endpoints."""

    success: bool
    message: str
    data: SettingResponse
