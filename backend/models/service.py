import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base


class ServiceType(str, enum.Enum):
    ON_SITE = "ON_SITE"
    AT_PROVIDER = "AT_PROVIDER"
    ONLINE = "ONLINE"


class Service(Base):
    __tablename__ = "services"
    __table_args__ = (
        CheckConstraint("price >= 0", name="ck_services_price_non_negative"),
        CheckConstraint(
            "duration_minutes > 0", name="ck_services_duration_positive"
        ),
        Index("ix_services_provider_id", "provider_id"),
        Index("ix_services_category_id_is_active", "category_id", "is_active"),
        Index("ix_services_price", "price"),
        Index("ix_services_service_type", "service_type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    provider_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("providers.id", ondelete="RESTRICT"),
        nullable=False,
    )

    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="RESTRICT"),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(String(150), nullable=False)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False
    )

    duration_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False
    )

    service_type: Mapped[ServiceType] = mapped_column(
        Enum(ServiceType, name="service_type"), nullable=False
    )

    location: Mapped[str | None] = mapped_column(
        String(255), nullable=True
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

    provider: Mapped["Provider"] = relationship(
        "Provider",
        back_populates="services",
    )
