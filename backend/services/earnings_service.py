from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from repositories.payment_repository import admin_status_totals, provider_totals
from services.booking_service import _setting


UTC = timezone.utc


def _utc_boundary(value: datetime | None, name: str) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None or value.utcoffset() is None:
        raise HTTPException(422, f"{name} must be timezone-aware")
    return value.astimezone(UTC)


def _validate_period(start: datetime | None, end: datetime | None) -> tuple[datetime | None, datetime | None]:
    start = _utc_boundary(start, "period_start")
    end = _utc_boundary(end, "period_end")
    if start is not None and end is not None and start >= end:
        raise HTTPException(422, "period_start must be before period_end")
    return start, end


async def provider_earnings(
    session: AsyncSession,
    provider_id: UUID,
    period_start: datetime | None = None,
    period_end: datetime | None = None,
):
    """Return UTC event totals, with commission shown separately."""
    period_start, period_end = _validate_period(period_start, period_end)
    rate = Decimal(str(await _setting(session, "platform_commission", 10)))
    if rate < 0 or rate > 100:
        raise HTTPException(502, "platform_commission must be between 0 and 100")

    totals = await provider_totals(
        session,
        provider_id,
        period_start,
        period_end,
    )
    net_collected = totals["net_collected"]
    commission_base = max(net_collected, Decimal("0.00"))
    commission = (
        commission_base * rate / Decimal(100)
    ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return {
        **totals,
        "commission_rate_percent": rate,
        "commission_amount": commission,
        # Refund-heavy periods can be negative; never clamp collected totals.
        "net_earnings": net_collected - commission,
        "period_start": period_start,
        "period_end": period_end,
    }


async def admin_reports(
    session: AsyncSession,
    period_start: datetime | None = None,
    period_end: datetime | None = None,
):
    period_start, period_end = _validate_period(period_start, period_end)
    return await admin_status_totals(session, period_start, period_end)
