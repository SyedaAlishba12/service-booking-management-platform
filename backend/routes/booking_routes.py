from datetime import date, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from common.auth_stub import CurrentUser, get_current_user
from controllers import booking_controller as controller
from database.session import get_db
from schemas.booking import BookingCancel, BookingCreate, BookingReschedule

router = APIRouter(prefix="/api/bookings", tags=["Bookings"])


@router.get("/available-slots")
async def available_slots(
    provider_id: UUID, service_id: UUID, from_date: date, to_date: date,
    session: AsyncSession = Depends(get_db),
):
    return await controller.available_slots(session, provider_id, service_id, from_date, to_date)


@router.post("", status_code=201)
async def create_booking(
    data: BookingCreate, user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    return await controller.create(session, user, data)


@router.get("")
async def list_my_bookings(
    page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=100),
    user: CurrentUser = Depends(get_current_user), session: AsyncSession = Depends(get_db),
):
    if user.role != "CUSTOMER":
        from fastapi import HTTPException
        raise HTTPException(403, "Customer access required")
    return await controller.list_customer(session, user, page, page_size)


@router.get("/provider")
async def list_provider_bookings(
    provider_id: UUID | None = None, from_at: datetime | None = None, to_at: datetime | None = None,
    page: int = Query(1, ge=1), page_size: int = Query(100, ge=1, le=100),
    user: CurrentUser = Depends(get_current_user), session: AsyncSession = Depends(get_db),
):
    if user.role not in {"PROVIDER", "ADMIN"}:
        from fastapi import HTTPException
        raise HTTPException(403, "Provider access required")
    return await controller.list_provider(session, user, provider_id, from_at, to_at, page, page_size)


@router.get("/{booking_id:uuid}")
async def get_booking(booking_id: UUID, user: CurrentUser = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    return await controller.get_one(session, user, booking_id)


@router.put("/{booking_id:uuid}/confirm")
async def confirm_booking(booking_id: UUID, user: CurrentUser = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    return await controller.transition(session, user, booking_id, "confirm")


@router.put("/{booking_id:uuid}/cancel")
async def cancel_booking(booking_id: UUID, data: BookingCancel, user: CurrentUser = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    return await controller.cancel(session, user, booking_id, data)


@router.put("/{booking_id:uuid}/reschedule")
async def reschedule_booking(booking_id: UUID, data: BookingReschedule, user: CurrentUser = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    return await controller.reschedule(session, user, booking_id, data)


@router.put("/{booking_id:uuid}/complete")
async def complete_booking(booking_id: UUID, user: CurrentUser = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    return await controller.transition(session, user, booking_id, "complete")


@router.put("/{booking_id:uuid}/no-show")
async def mark_no_show(booking_id: UUID, user: CurrentUser = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    return await controller.transition(session, user, booking_id, "no-show")
