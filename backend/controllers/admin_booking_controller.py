from datetime import date
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from common.responses import ok, paginated
from models.booking import BookingStatus
import services.admin_booking_service as svc


async def list_bookings(
    db: AsyncSession,
    status: BookingStatus | None,
    provider_id: UUID | None,
    customer_id: UUID | None,
    service_id: UUID | None,
    date_from: date | None,
    date_to: date | None,
    q: str | None,
    page: int,
    page_size: int,
):
    items, total = await svc.list_bookings(
        db,
        status=status,
        provider_id=provider_id,
        customer_id=customer_id,
        service_id=service_id,
        date_from=date_from,
        date_to=date_to,
        q=q,
        page=page,
        page_size=page_size,
    )
    return ok(paginated(items, total, page, page_size))


async def get_booking(db: AsyncSession, booking_id: UUID):
    return ok(await svc.get_booking(db, booking_id))
