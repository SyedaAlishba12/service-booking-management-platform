from datetime import datetime
from uuid import UUID

from common.responses import ok
from sqlalchemy.ext.asyncio import AsyncSession

from services import earnings_service


async def provider_earnings(session: AsyncSession, provider_id: UUID, start: datetime | None, end: datetime | None):
    return ok(await earnings_service.provider_earnings(session, provider_id, start, end), "Provider earnings loaded")
