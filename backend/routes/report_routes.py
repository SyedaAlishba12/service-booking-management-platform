from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

import controllers.report_controller as ctrl
from database.session import get_db
from middleware.auth_stub import require_admin
from common.responses import ApiResponse

admin_router = APIRouter(
    prefix="/api/admin",
    tags=["admin-reports"],
    dependencies=[Depends(require_admin)],
)

@admin_router.get("/dashboard/stats", response_model=ApiResponse)
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    return await ctrl.get_dashboard_stats(db)

@admin_router.get("/reports/users", response_model=ApiResponse)
async def get_users_report(
    db: AsyncSession = Depends(get_db),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
):
    return await ctrl.get_users_report(db, date_from, date_to)

@admin_router.get("/reports/providers", response_model=ApiResponse)
async def get_providers_report(
    db: AsyncSession = Depends(get_db),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
):
    return await ctrl.get_providers_report(db, date_from, date_to)

@admin_router.get("/reports/services", response_model=ApiResponse)
async def get_services_report(
    db: AsyncSession = Depends(get_db),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
):
    return await ctrl.get_services_report(db, date_from, date_to)

@admin_router.get("/reports/bookings", response_model=ApiResponse)
async def get_bookings_report(
    db: AsyncSession = Depends(get_db),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
):
    return await ctrl.get_bookings_report(db, date_from, date_to)

@admin_router.get("/reports/revenue", response_model=ApiResponse)
async def get_revenue_report(
    db: AsyncSession = Depends(get_db),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
):
    return await ctrl.get_revenue_report(db, date_from, date_to)

@admin_router.get("/reports/reviews", response_model=ApiResponse)
async def get_reviews_report(
    db: AsyncSession = Depends(get_db),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
):
    return await ctrl.get_reviews_report(db, date_from, date_to)

@admin_router.get("/reports/complaints", response_model=ApiResponse)
async def get_complaints_report(
    db: AsyncSession = Depends(get_db),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
):
    return await ctrl.get_complaints_report(db, date_from, date_to)
