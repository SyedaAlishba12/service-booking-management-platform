"""
PlatformSetting model.

Table: platform_settings
Stores global key/value configuration pairs used throughout the platform.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
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


# ---------------------------------------------------------------------------
# Python enum
# ---------------------------------------------------------------------------


class SettingValueType(str, enum.Enum):
    STRING = "STRING"
    INTEGER = "INTEGER"
    DECIMAL = "DECIMAL"
    BOOLEAN = "BOOLEAN"
    JSON = "JSON"


# ---------------------------------------------------------------------------
# ORM model
# ---------------------------------------------------------------------------


class PlatformSetting(Base):
    __tablename__ = "platform_settings"
    __table_args__ = (
        # Index for group-based look-ups
        Index("ix_platform_settings_setting_group", "setting_group"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    key: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    value_type: Mapped[SettingValueType] = mapped_column(
        Enum(SettingValueType, name="setting_value_type"),
        nullable=False,
        default=SettingValueType.STRING,
        server_default=SettingValueType.STRING.value,
    )
    # "group" is a reserved SQL keyword; use setting_group.
    setting_group: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_public: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
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
