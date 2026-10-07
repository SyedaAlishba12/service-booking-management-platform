from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from repositories.payment_repository import admin_status_totals, provider_totals
from services.booking_service import _setting


async def provider_earnings(session: AsyncSession, provider_id: UUID,
                            period_start: datetime | None = None, period_end: datetime | None = None):
    if period_start and (period_start.tzinfo is None):
        raise HTTPException(422, "period_start must be timezone-aware")
    if period_end and (period_end.tzinfo is None):
        raise HTTPException(422, "period_end must be timezone-aware")
    if period_start and period_end and period_start >= period_end:
        raise HTTPException(422, "period_start must be before period_end")
    rate = Decimal(str(await _setting(session, "platform_commission", 10)))
    if rate < 0 or rate > 100:
        raise HTTPException(502, "platform_commission must be between 0 and 100")
    totals = await provider_totals(session, provider_id, period_start, period_end)
    commissionable = max(totals["gross_paid"] - totals["refunded_amount"], Decimal("0.00"))
    commission = (commissionable * rate / Decimal(100)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return {**totals, "commission_rate_percent": rate, "commission_amount": commission,
            "net_earnings": commissionable - commission, "period_start": period_start, "period_end": period_end}


async def admin_reports(session: AsyncSession, period_start: datetime | None = None, period_end: datetime | None = None):
    if period_start and period_end and period_start >= period_end:
        raise HTTPException(422, "period_start must be before period_end")
    return await admin_status_totals(session, period_start, period_end)
