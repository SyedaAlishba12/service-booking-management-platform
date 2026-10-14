from datetime import date
from fastapi import status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

import services.report_service as svc
from common.response import error_response
from common.responses import ok
from schemas.report import (
    DashboardStatsResponse,
    UserReportResponse,
    ProviderReportResponse,
    ServiceReportResponse,
    BookingReportResponse,
    RevenueReportResponse,
    ReviewReportResponse,
    ComplaintReportResponse
)

def _handle_error(exc: svc.ReportValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response(exc.message),
    )

async def get_dashboard_stats(db: AsyncSession):
    data = await svc.get_dashboard_stats(db)
    return ok(data=DashboardStatsResponse(**data).model_dump(mode="json"))

async def get_users_report(db: AsyncSession, date_from: date | None, date_to: date | None):
    try:
        data = await svc.user_report(db, date_from, date_to)
        return ok(data=UserReportResponse(**data).model_dump(mode="json"))
    except svc.ReportValidationError as e:
        return _handle_error(e)

async def get_providers_report(db: AsyncSession, date_from: date | None, date_to: date | None):
    try:
        data = await svc.provider_report(db, date_from, date_to)
        return ok(data=ProviderReportResponse(**data).model_dump(mode="json"))
    except svc.ReportValidationError as e:
        return _handle_error(e)

async def get_services_report(db: AsyncSession, date_from: date | None, date_to: date | None):
    try:
        data = await svc.service_report(db, date_from, date_to)
        return ok(data=ServiceReportResponse(**data).model_dump(mode="json"))
    except svc.ReportValidationError as e:
        return _handle_error(e)

async def get_bookings_report(db: AsyncSession, date_from: date | None, date_to: date | None):
    try:
        data = await svc.booking_report(db, date_from, date_to)
        return ok(data=BookingReportResponse(**data).model_dump(mode="json"))
    except svc.ReportValidationError as e:
        return _handle_error(e)

async def get_revenue_report(db: AsyncSession, date_from: date | None, date_to: date | None):
    try:
        data = await svc.revenue_report(db, date_from, date_to)
        return ok(data=RevenueReportResponse(**data).model_dump(mode="json"))
    except svc.ReportValidationError as e:
        return _handle_error(e)

async def get_reviews_report(db: AsyncSession, date_from: date | None, date_to: date | None):
    try:
        data = await svc.review_report(db, date_from, date_to)
        return ok(data=ReviewReportResponse(**data).model_dump(mode="json"))
    except svc.ReportValidationError as e:
        return _handle_error(e)

async def get_complaints_report(db: AsyncSession, date_from: date | None, date_to: date | None):
    try:
        data = await svc.complaint_report(db, date_from, date_to)
        return ok(data=ComplaintReportResponse(**data).model_dump(mode="json"))
    except svc.ReportValidationError as e:
        return _handle_error(e)
