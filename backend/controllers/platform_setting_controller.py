"""
PlatformSetting controller: maps service results / errors to HTTP responses.

Rules:
  - No business logic here. Call service, build envelope, return response.
  - Use JSONResponse with the error envelope (NOT HTTPException) so the
    {"success", "message", "data"} shape is preserved on errors.
  - HTTP status codes: 200 for all successes, 404/422 for domain errors.
"""

import uuid

from fastapi import status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

import services.platform_setting_service as svc
from common.response import error_response, success_response
from schemas.platform_setting import SettingResponse, SettingUpdate


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _serialise(obj) -> dict:
    """Convert a PlatformSetting ORM object to the SettingResponse dict."""
    return SettingResponse.model_validate(obj).model_dump(mode="json")


def _serialise_list(objs) -> list[dict]:
    return [_serialise(o) for o in objs]


# ---------------------------------------------------------------------------
# Public endpoints
# ---------------------------------------------------------------------------


async def list_public_settings(db: AsyncSession):
    settings = await svc.list_public_settings(db)
    return success_response(
        data=_serialise_list(settings),
        message="Settings retrieved successfully",
    )


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------


async def list_all_settings(db: AsyncSession):
    settings = await svc.list_settings(db)
    return success_response(
        data=_serialise_list(settings),
        message="Settings retrieved successfully",
    )


async def get_setting(db: AsyncSession, key: str):
    try:
        setting = await svc.get_setting(db, key)
    except svc.SettingNotFoundError as exc:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=error_response(exc.message),
        )
    return success_response(
        data=_serialise(setting),
        message="Setting retrieved successfully",
    )


async def update_setting(
    db: AsyncSession,
    key: str,
    payload: SettingUpdate,
    updated_by: uuid.UUID | None = None,
):
    try:
        setting = await svc.update_setting_value(
            db, key, payload.value, updated_by=updated_by
        )
    except svc.SettingNotFoundError as exc:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=error_response(exc.message),
        )
    except svc.SettingValidationError as exc:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_response(exc.message),
        )
    return success_response(
        data=_serialise(setting),
        message="Setting updated successfully",
    )
