"""
Category routes: thin APIRouter wrappers only.

No business logic here. All logic lives in the controller -> service ->
repository layers.

Auth note
---------
Admin router is guarded by `require_admin` (middleware/admin_guard.py),
requiring a valid JWT and the ADMIN role.
"""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

import controllers.category_controller as ctrl
from database.session import get_db
from middleware.admin_guard import require_admin
from schemas.category import (
    CategoryCreate,
    CategoryDetailResponse,
    CategoryListResponse,
    CategoryUpdate,
)



# ---------------------------------------------------------------------------
# Public router  —  /api/categories
# ---------------------------------------------------------------------------

public_router = APIRouter(prefix="/api/categories", tags=["categories"])


@public_router.get("", response_model=CategoryListResponse)
async def list_active_categories(db: AsyncSession = Depends(get_db)):
    return await ctrl.list_active_categories(db)


@public_router.get("/{id}", response_model=CategoryDetailResponse)
async def get_active_category(id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await ctrl.get_active_category(db, id)


# ---------------------------------------------------------------------------
# Admin router  —  /api/admin/categories
# Entire router is guarded by the require_admin dependency.
# ---------------------------------------------------------------------------

admin_router = APIRouter(
    prefix="/api/admin/categories",
    tags=["admin-categories"],
    dependencies=[Depends(require_admin)],
)


@admin_router.get("", response_model=CategoryListResponse)
async def list_all_categories(db: AsyncSession = Depends(get_db)):
    return await ctrl.list_all_categories(db)


@admin_router.post("", response_model=CategoryDetailResponse, status_code=201)
async def create_category(payload: CategoryCreate, db: AsyncSession = Depends(get_db)):
    return await ctrl.create_category(db, payload)


@admin_router.put("/{id}", response_model=CategoryDetailResponse)
async def update_category(
    id: uuid.UUID, payload: CategoryUpdate, db: AsyncSession = Depends(get_db)
):
    return await ctrl.update_category(db, id, payload)


@admin_router.delete("/{id}", response_model=CategoryDetailResponse)
async def deactivate_category(id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await ctrl.deactivate_category(db, id)
