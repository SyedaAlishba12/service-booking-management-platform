from datetime import date
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from models.booking import BookingStatus
from repositories.admin_booking_repository import AdminBookingRepository
from schemas.admin_booking import AdminBookingDetailResponse, AdminBookingListItem


def _validate_date_range(
    date_from: date | None, date_to: date | None
) -> None:
    if date_from is not None and date_to is not None and date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="date_from must be before or equal to date_to",
        )


def _list_item(row) -> AdminBookingListItem:
    return AdminBookingListItem(
        **{field: row[field] for field in AdminBookingListItem.model_fields}
    )


def _detail(row) -> AdminBookingDetailResponse:
    return AdminBookingDetailResponse(
        **{field: row[field] for field in AdminBookingDetailResponse.model_fields}
    )


async def list_bookings(
    db: AsyncSession,
    *,
    status: BookingStatus | None,
    provider_id: UUID | None,
    customer_id: UUID | None,
    service_id: UUID | None,
    date_from: date | None,
    date_to: date | None,
    q: str | None,
    page: int,
    page_size: int,
) -> tuple[list[AdminBookingListItem], int]:
    _validate_date_range(date_from, date_to)
    repository = AdminBookingRepository(db)
    rows, total = await repository.list_bookings(
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
    return [_list_item(row) for row in rows], total


async def get_booking(
    db: AsyncSession, booking_id: UUID
) -> AdminBookingDetailResponse:
    row = await AdminBookingRepository(db).get_booking(booking_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )
    return _detail(row)
