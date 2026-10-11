import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from database.base import Base


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        # Case-insensitive uniqueness: unique functional index on lower(name)
        Index("ix_categories_name_lower", text("lower(name)"), unique=True),
        # Composite index for active-category listing / ordering queries
        Index("ix_categories_is_active_display_order", "is_active", "display_order"),
        # Unique slug enforced at DB level
        UniqueConstraint("slug", name="uq_categories_slug"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    display_order: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
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
