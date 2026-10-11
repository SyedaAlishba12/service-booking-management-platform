"""
Pydantic v2 schemas for the Review resource.

Naming convention: PascalCase classes, snake_case fields.
str_strip_whitespace=True is set on all input schemas.

Validation rules:
  - ReviewCreate.rating:   1..5 (int).
  - ReviewCreate.comment:  max 2000 chars; empty string after stripping -> None.
  - ReviewUpdate.rating:   optional 1..5; explicit null is REJECTED (same
                           pattern as CategoryUpdate's NOT NULL guard).
  - ReviewUpdate.comment:  optional; null is accepted (clears the column).
  - ReviewVisibilityUpdate.is_visible: required bool.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class ReviewCreate(BaseModel):
    """Payload for POST /api/reviews."""

    model_config = ConfigDict(str_strip_whitespace=True)

    booking_id: uuid.UUID
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = Field(default=None, max_length=2000)

    @field_validator("comment", mode="before")
    @classmethod
    def empty_comment_to_none(cls, v: object) -> str | None:
        """Convert an empty (or whitespace-only) comment string to None."""
        if v is None:
            return None
        stripped = str(v).strip()
        return stripped if stripped else None


class ReviewUpdate(BaseModel):
    """Payload for PUT /api/reviews/{id}.

    All fields are optional; only provided fields are updated.

    NOT NULL columns: rating (explicit null rejected).
    Nullable columns: comment (explicit null accepted — clears the column).
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    rating: int | None = Field(default=None, ge=1, le=5)
    comment: str | None = Field(default=None, max_length=2000)

    # ------------------------------------------------------------------
    # NOT NULL guard: explicit null for rating is rejected.
    # Pydantic v2 only calls this when the field appears in the payload.
    # ------------------------------------------------------------------

    @field_validator("rating")
    @classmethod
    def reject_null_rating(cls, v: object) -> object:
        """Reject explicitly provided null for the NOT NULL rating column."""
        if v is None:
            raise ValueError("rating cannot be set to null")
        return v

    @field_validator("comment", mode="before")
    @classmethod
    def empty_comment_to_none(cls, v: object) -> str | None:
        """Convert an empty (or whitespace-only) comment string to None."""
        if v is None:
            return None
        stripped = str(v).strip()
        return stripped if stripped else None


class ReviewVisibilityUpdate(BaseModel):
    """Payload for PUT /api/admin/reviews/{id}/visibility."""

    is_visible: bool


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class ReviewResponse(BaseModel):
    """Shape of a single review object returned in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    booking_id: uuid.UUID
    user_id: uuid.UUID
    provider_id: uuid.UUID
    service_id: uuid.UUID
    rating: int
    comment: str | None
    is_visible: bool
    created_at: datetime
    updated_at: datetime


class RatingSummaryResponse(BaseModel):
    """Rating summary for a provider (visible reviews only).

    breakdown keys are always "1", "2", "3", "4", "5" — even when zero.
    average_rating is rounded to 2 decimal places.
    """

    provider_id: uuid.UUID
    average_rating: float
    total_reviews: int
    breakdown: dict[str, int]


# ---------------------------------------------------------------------------
# Envelope schemas
# ---------------------------------------------------------------------------


class ReviewListResponse(BaseModel):
    """Envelope for list endpoints."""

    success: bool
    message: str
    data: list[ReviewResponse]


class ReviewDetailResponse(BaseModel):
    """Envelope for single-item endpoints."""

    success: bool
    message: str
    data: ReviewResponse
