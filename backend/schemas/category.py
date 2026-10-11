"""
Pydantic v2 schemas for the Category resource.

Naming convention: PascalCase classes, snake_case fields.

Validation rules enforced here:
  - name: stripped by ConfigDict before min_length check; whitespace-only is rejected.
  - slug: normalised (strip + lowercase) BEFORE pattern check so "Home-Cleaning"
    becomes "home-cleaning" and is accepted; invalid chars are rejected.
    Pattern: ^[a-z0-9]+(?:-[a-z0-9]+)*$
  - CategoryUpdate: name, slug, display_order, is_active are NOT NULL in the DB;
    explicitly passing null for any of them raises a validation error.
    description and image_url may be null (clears the column).
"""

import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class CategoryCreate(BaseModel):
    """Payload for POST /api/admin/categories."""

    # str_strip_whitespace runs BEFORE Field constraints, so "   " -> "" fails
    # min_length=1 correctly instead of sneaking through as a single space.
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(..., min_length=1, max_length=100)
    slug: str | None = Field(
        default=None,
        max_length=120,
        description="URL-safe slug. Auto-generated from name if omitted.",
    )
    description: str | None = Field(default=None, max_length=2000)
    image_url: str | None = Field(default=None, max_length=500)
    display_order: int = Field(default=0, ge=0)

    @field_validator("slug", mode="before")
    @classmethod
    def slug_normalise_and_validate(cls, v: object) -> str | None:
        """Strip + lowercase first, then apply URL-safe pattern.

        mode='before' ensures normalisation happens before the Field max_length
        check and before type coercion, so "Home-Cleaning" -> "home-cleaning"
        is accepted while "Home Cleaning!" is rejected.
        """
        if v is None:
            return None
        v = str(v).strip().lower()
        if not v:
            return None
        if not _SLUG_RE.match(v):
            raise ValueError(
                "slug may only contain lowercase letters, digits, and single hyphens "
                r"(pattern: ^[a-z0-9]+(?:-[a-z0-9]+)*$)"
            )
        return v


class CategoryUpdate(BaseModel):
    """Payload for PUT /api/admin/categories/{id}.

    All fields are optional; only provided fields are updated (use
    .model_dump(exclude_unset=True) in the service layer).

    Nullable columns  : description, image_url  (may be set to null to clear).
    NOT NULL columns  : name, slug, display_order, is_active  (explicit null
                        is rejected with a validation error).
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=100)
    slug: str | None = Field(default=None, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    image_url: str | None = Field(default=None, max_length=500)
    display_order: int | None = Field(default=None, ge=0)
    is_active: bool | None = Field(default=None)

    # ------------------------------------------------------------------
    # Slug: normalise BEFORE pattern check (same logic as CategoryCreate)
    # ------------------------------------------------------------------

    @field_validator("slug", mode="before")
    @classmethod
    def slug_normalise_and_validate(cls, v: object) -> str | None:
        if v is None:
            return None
        v = str(v).strip().lower()
        if not v:
            return None
        if not _SLUG_RE.match(v):
            raise ValueError(
                "slug may only contain lowercase letters, digits, and single hyphens "
                r"(pattern: ^[a-z0-9]+(?:-[a-z0-9]+)*$)"
            )
        return v

    # ------------------------------------------------------------------
    # NOT NULL guard: runs AFTER type coercion, only when field is present
    # in the request payload (validate_default=False by default in v2).
    # ------------------------------------------------------------------

    @field_validator("name", "slug", "display_order", "is_active")
    @classmethod
    def reject_null(cls, v: object) -> object:
        """Reject explicitly provided null for NOT NULL columns.

        Pydantic v2 only calls this validator when the field appears in the
        input, so omitting a field (leaving it at its default of None) is
        still valid — the validator is never triggered.
        """
        if v is None:
            raise ValueError("this field cannot be set to null")
        return v


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class CategoryResponse(BaseModel):
    """Shape of a single category object returned in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    image_url: str | None
    display_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Envelope schemas
# ---------------------------------------------------------------------------


class CategoryListResponse(BaseModel):
    """Envelope for list endpoints."""

    success: bool
    message: str
    data: list[CategoryResponse]


class CategoryDetailResponse(BaseModel):
    """Envelope for single-item endpoints."""

    success: bool
    message: str
    data: CategoryResponse
