"""
PlatformSetting repository: raw database queries only.

Rules:
  - No business logic, no commit, no rollback.
  - Every function accepts an AsyncSession and returns ORM objects or None.
  - Lists are ordered by setting_group ASC, key ASC.
"""

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.platform_setting import PlatformSetting


async def list_all(db: AsyncSession) -> list[PlatformSetting]:
    """Return every platform setting ordered by setting_group, key."""
    result = await db.execute(
        select(PlatformSetting).order_by(
            PlatformSetting.setting_group.asc(), PlatformSetting.key.asc()
        )
    )
    return list(result.scalars().all())


async def list_public(db: AsyncSession) -> list[PlatformSetting]:
    """Return only publicly visible settings (is_public=True), ordered by group, key."""
    result = await db.execute(
        select(PlatformSetting)
        .where(PlatformSetting.is_public.is_(True))
        .order_by(PlatformSetting.setting_group.asc(), PlatformSetting.key.asc())
    )
    return list(result.scalars().all())


async def get_by_key(db: AsyncSession, key: str) -> PlatformSetting | None:
    """Return the setting with the given key, or None."""
    result = await db.execute(
        select(PlatformSetting).where(PlatformSetting.key == key)
    )
    return result.scalar_one_or_none()


async def get_many_by_keys(
    db: AsyncSession, keys: list[str]
) -> list[PlatformSetting]:
    """Return all settings whose key is in the given list (single query)."""
    if not keys:
        return []
    result = await db.execute(
        select(PlatformSetting).where(PlatformSetting.key.in_(keys))
    )
    return list(result.scalars().all())


async def add(db: AsyncSession, setting: PlatformSetting) -> PlatformSetting:
    """Add a new PlatformSetting to the session and flush.

    Does NOT commit. The service layer is responsible for commit/rollback.
    flush() sends the INSERT so that DB defaults (created_at, id, etc.)
    are populated; the caller must await db.refresh(setting) after commit.
    """
    db.add(setting)
    await db.flush()
    return setting


async def apply_updates(
    db: AsyncSession, setting: PlatformSetting, updates: dict[str, Any]
) -> PlatformSetting:
    """Apply a dict of field updates to an existing PlatformSetting and flush.

    Does NOT commit. Only the keys present in `updates` are written.
    """
    for field, value in updates.items():
        setattr(setting, field, value)
    await db.flush()
    return setting
