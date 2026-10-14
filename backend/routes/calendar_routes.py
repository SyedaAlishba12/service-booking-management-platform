from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from common.auth_stub import CurrentUser, get_current_user
from controllers import calendar_controller, earnings_controller
from database.session import get_db
from services.provider_service import get_provider_by_user

router = APIRouter(tags=["Calendar and Earnings"])


@router.get("/api/bookings/calendar")
async def provider_calendar(from_at: datetime, to_at: datetime,
                           user: CurrentUser = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    if user.role != "PROVIDER":
        raise HTTPException(403, "Provider access required")
    provider = await get_provider_by_user(session, user.id)
    return await calendar_controller.provider_calendar(session, provider.id, from_at, to_at)


@router.get("/api/providers/customers")
async def provider_customers(user: CurrentUser = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    if user.role != "PROVIDER":
        raise HTTPException(403, "Provider access required")
    provider = await get_provider_by_user(session, user.id)
    return await calendar_controller.provider_customers(session, provider.id)


@router.get("/api/providers/earnings")
async def provider_earnings(from_at: datetime | None = None, to_at: datetime | None = None,
                            user: CurrentUser = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    if user.role != "PROVIDER":
        raise HTTPException(403, "Provider access required")
    provider = await get_provider_by_user(session, user.id)
    return await earnings_controller.provider_earnings(session, provider.id, from_at, to_at)
