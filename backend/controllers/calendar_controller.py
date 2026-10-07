from datetime import datetime
from uuid import UUID

from common.responses import ok
from controllers.booking_controller import _booking_responses
from sqlalchemy.ext.asyncio import AsyncSession

from services import calendar_service


async def provider_calendar(session: AsyncSession, provider_id: UUID, from_at: datetime, to_at: datetime):
    rows = await calendar_service.provider_calendar(session, provider_id, from_at, to_at)
    return ok(await _booking_responses(session, rows), "Calendar loaded")


async def provider_customers(session: AsyncSession, provider_id: UUID):
    return ok(await calendar_service.provider_customer_ids(session, provider_id), "Provider customers loaded")
