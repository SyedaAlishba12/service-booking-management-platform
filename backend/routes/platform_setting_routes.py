"""
PlatformSetting routes: thin APIRouter wrappers only.

No business logic here. All logic lives in the controller ->
service -> repository layers.

Auth note
---------
TODO: Replace `require_admin` with Zainab's role-based dependency before
any deployment. The current stub does nothing and does NOT enforce auth.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

import controllers.platform_setting_controller as ctrl
from database.session import get_db
from middleware.auth_stub import require_admin
from schemas.platform_setting import SettingDetailResponse, SettingListResponse, SettingUpdate


# ---------------------------------------------------------------------------
# Public router  —  /api/settings
# ---------------------------------------------------------------------------

public_router = APIRouter(prefix="/api/settings", tags=["settings"])


@public_router.get("/public", response_model=SettingListResponse)
async def list_public_settings(db: AsyncSession = Depends(get_db)):
    return await ctrl.list_public_settings(db)


# ---------------------------------------------------------------------------
# Admin router  —  /api/admin/settings
# Entire router is guarded by the require_admin dependency (stub for now).
# ---------------------------------------------------------------------------

admin_router = APIRouter(
    prefix="/api/admin/settings",
    tags=["admin-settings"],
    dependencies=[Depends(require_admin)],
)


@admin_router.get("", response_model=SettingListResponse)
async def list_all_settings(db: AsyncSession = Depends(get_db)):
    return await ctrl.list_all_settings(db)


@admin_router.get("/{key}", response_model=SettingDetailResponse)
async def get_setting(key: str, db: AsyncSession = Depends(get_db)):
    return await ctrl.get_setting(db, key)


@admin_router.put("/{key}", response_model=SettingDetailResponse)
async def update_setting(
    key: str, payload: SettingUpdate, db: AsyncSession = Depends(get_db)
):
    return await ctrl.update_setting(db, key, payload)
