from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
import repositories.report_repository as repo

class ReportValidationError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)

def _validate_dates(date_from: date | None, date_to: date | None):
    if date_from and date_to:
        if date_from > date_to:
            raise ReportValidationError("date_from must be before or equal to date_to")
        if (date_to - date_from).days > 366:
            raise ReportValidationError("date range cannot exceed 366 days")

async def get_dashboard_stats(db: AsyncSession):
    return await repo.get_dashboard_stats(db)

async def user_report(db: AsyncSession, date_from: date | None = None, date_to: date | None = None):
    _validate_dates(date_from, date_to)
    return await repo.get_user_report(db, date_from, date_to)

async def provider_report(db: AsyncSession, date_from: date | None = None, date_to: date | None = None):
    _validate_dates(date_from, date_to)
    return await repo.get_provider_report(db, date_from, date_to)

async def service_report(db: AsyncSession, date_from: date | None = None, date_to: date | None = None):
    _validate_dates(date_from, date_to)
    return await repo.get_service_report(db, date_from, date_to)

async def booking_report(db: AsyncSession, date_from: date | None = None, date_to: date | None = None):
    _validate_dates(date_from, date_to)
    return await repo.get_booking_report(db, date_from, date_to)

async def revenue_report(db: AsyncSession, date_from: date | None = None, date_to: date | None = None):
    _validate_dates(date_from, date_to)
    return await repo.get_revenue_report(db, date_from, date_to)

async def review_report(db: AsyncSession, date_from: date | None = None, date_to: date | None = None):
    _validate_dates(date_from, date_to)
    return await repo.get_review_report(db, date_from, date_to)

async def complaint_report(db: AsyncSession, date_from: date | None = None, date_to: date | None = None):
    _validate_dates(date_from, date_to)
    return await repo.get_complaint_report(db, date_from, date_to)
