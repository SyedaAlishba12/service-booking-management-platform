"""
Complaint model.

Table: complaints
Stores complaints filed by users regarding bookings, providers, payments, etc.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from database.base import Base


class ComplaintType(str, enum.Enum):
    BOOKING = "BOOKING"
    PROVIDER = "PROVIDER"
    PAYMENT = "PAYMENT"
    PLATFORM = "PLATFORM"
    OTHER = "OTHER"


class ComplaintStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_REVIEW = "IN_REVIEW"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"


class Complaint(Base):
    __tablename__ = "complaints"
    __table_args__ = (
        CheckConstraint(
            "(complaint_type NOT IN ('BOOKING','PAYMENT') OR booking_id IS NOT NULL) AND "
            "(complaint_type <> 'PROVIDER' OR provider_id IS NOT NULL)",
            name="ck_complaints_type_refs",
        ),
        Index("ix_complaints_status_created", "status", "created_at"),
        Index("ix_complaints_user_id", "user_id"),
        Index("ix_complaints_booking_id", "booking_id"),
        Index("ix_complaints_provider_id", "provider_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    booking_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bookings.id", ondelete="RESTRICT"),
        nullable=True,
    )
    provider_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("providers.id", ondelete="RESTRICT"),
        nullable=True,
    )
    complaint_type: Mapped[ComplaintType] = mapped_column(
        Enum(ComplaintType, name="complaint_type"), nullable=False
    )
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ComplaintStatus] = mapped_column(
        Enum(ComplaintStatus, name="complaint_status"),
        nullable=False,
        default=ComplaintStatus.OPEN,
        server_default=ComplaintStatus.OPEN.value,
    )
    admin_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
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
