import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base


class ProviderStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    SUSPENDED = "SUSPENDED"


class Provider(Base):
    __tablename__ = "providers"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_providers_user_id"),
        CheckConstraint(
            "slot_interval_minutes > 0", name="ck_providers_slot_interval_positive"
        ),
        CheckConstraint(
            "buffer_minutes >= 0", name="ck_providers_buffer_non_negative"
        ),
        Index("ix_providers_status_is_active", "status", "is_active"),
        Index("ix_providers_location", "location"),
        Index("ix_providers_city", "city"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    business_name: Mapped[str] = mapped_column(String(150), nullable=False)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    profile_image_url: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )

    location: Mapped[str] = mapped_column(String(255), nullable=False)

    city: Mapped[str | None] = mapped_column(String(100), nullable=True)

    contact_phone: Mapped[str | None] = mapped_column(
        String(30), nullable=True
    )

    contact_email: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )

    timezone: Mapped[str] = mapped_column(String(64), nullable=False)

    slot_interval_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False
    )

    buffer_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )

    status: Mapped[ProviderStatus] = mapped_column(
        Enum(ProviderStatus, name="provider_status"),
        nullable=False,
        default=ProviderStatus.PENDING,
        server_default=ProviderStatus.PENDING.value,
    )

    is_active: Mapped[bool] = mapped_column(
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

    user: Mapped["User"] = relationship(
        "User",
        back_populates="provider_profile",
    )

    services: Mapped[list["Service"]] = relationship(
        "Service", back_populates="provider"
    )

    availabilities: Mapped[list["Availability"]] = relationship(
        "Availability",
        back_populates="provider",
        cascade="all, delete-orphan",
    )

    availability_exceptions: Mapped[list["AvailabilityException"]] = relationship(
        "AvailabilityException",
        back_populates="provider",
        cascade="all, delete-orphan",
    )

