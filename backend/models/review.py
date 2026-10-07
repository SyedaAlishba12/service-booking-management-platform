"""
Review model.

Table: reviews
Stores customer reviews for completed bookings.
Each booking may receive at most one review (uq_reviews_booking_id).
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    SmallInteger,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from database.base import Base


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        # One review per booking
        UniqueConstraint("booking_id", name="uq_reviews_booking_id"),
        # Rating must be between 1 and 5
        CheckConstraint("rating BETWEEN 1 AND 5", name="ck_reviews_rating_range"),
        # Index for provider public listing: filter by visibility, order by date
        Index("ix_reviews_provider_visible_created", "provider_id", "is_visible", "created_at"),
        # Index for service-level rating queries
        Index("ix_reviews_service_visible", "service_id", "is_visible"),
        # Index for "my reviews" queries
        Index("ix_reviews_user_id", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    booking_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bookings.id", ondelete="RESTRICT"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    provider_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("providers.id", ondelete="RESTRICT"),
        nullable=False,
    )
    service_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("services.id", ondelete="RESTRICT"),
        nullable=False,
    )
    rating: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_visible: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
