from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from common.auth_stub import CurrentUser
from common.responses import ApiResponse, ok, paginated
from models.booking import Booking, BookingStatus, Payment
from models.customer import Customer
from models.provider import Provider
from models.service import Service
from models.user import User
from repositories import booking_repository as repo
from schemas.booking import BookingCancel, BookingCreate, BookingReschedule, BookingResponse
from services import booking_service
from services.provider_service import get_provider_by_user


async def _booking_responses(session: AsyncSession, bookings: list[Booking]) -> list[BookingResponse]:
    if not bookings:
        return []
    ids = [booking.id for booking in bookings]
    labels = (await session.execute(
        select(Booking.id, Service.name, Provider.business_name, User.full_name, Provider.timezone, Payment.status)
        .join(Service, Service.id == Booking.service_id)
        .join(Provider, Provider.id == Booking.provider_id)
        .join(Customer, Customer.id == Booking.customer_id)
        .join(User, User.id == Customer.user_id)
        .outerjoin(Payment, Payment.booking_id == Booking.id)
        .where(Booking.id.in_(ids))
    )).all()
    by_id = {row[0]: (row[1], row[2], row[3], row[4], row[5]) for row in labels}
    return [
        BookingResponse.model_validate(booking).model_copy(update={
            "service_name": by_id[booking.id][0],
            "provider_name": by_id[booking.id][1],
            "customer_name": by_id[booking.id][2],
            "provider_timezone": by_id[booking.id][3],
            "payment_status": by_id[booking.id][4],
        })
        for booking in bookings
    ]


async def available_slots(session: AsyncSession, provider_id: UUID, service_id: UUID, from_date, to_date) -> ApiResponse:
    return ok(await booking_service.get_available_slots(session, provider_id, service_id, from_date, to_date), "Available slots loaded")


async def create(session: AsyncSession, user: CurrentUser, data: BookingCreate) -> ApiResponse:
    booking = await booking_service.create_booking(session, user.id, data)
    return ok(BookingResponse.model_validate(booking), "Booking hold created")


async def list_customer(session: AsyncSession, user: CurrentUser, page: int, page_size: int) -> ApiResponse:
    customer_id = await session.scalar(select(Customer.id).where(Customer.user_id == user.id))
    if customer_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Customer profile not found")
    rows, total = await repo.list_customer(session, customer_id, page, page_size)
    return ApiResponse(message="Bookings loaded", data=paginated(await _booking_responses(session, rows), total, page, page_size))


async def list_provider(session: AsyncSession, user: CurrentUser, provider_id: UUID | None,
                        start_at, end_at, page: int, page_size: int) -> ApiResponse:
    if user.role == "PROVIDER":
        provider_id = (await get_provider_by_user(session, user.id)).id
    if provider_id is None:
        raise HTTPException(422, "provider_id is required for admin listings")
    rows, total = await repo.list_provider(session, provider_id, start_at, end_at, page, page_size)
    return ApiResponse(message="Bookings loaded", data=paginated(await _booking_responses(session, rows), total, page, page_size))


async def get_owned(session: AsyncSession, user: CurrentUser, booking_id: UUID, *, lock: bool = False) -> Booking:
    booking = await repo.get_booking(session, booking_id, lock=lock)
    if booking is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found")
    if user.role == "CUSTOMER":
        owner_id = await session.scalar(select(Customer.id).where(Customer.user_id == user.id))
        allowed = owner_id is not None and booking.customer_id == owner_id
    elif user.role == "PROVIDER":
        owner_id = await session.scalar(select(Provider.id).where(Provider.user_id == user.id))
        allowed = owner_id is not None and booking.provider_id == owner_id
    else:
        allowed = user.role == "ADMIN"
    if not allowed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found")
    return booking


async def get_one(session: AsyncSession, user: CurrentUser, booking_id: UUID) -> ApiResponse:
    return ok(BookingResponse.model_validate(await get_owned(session, user, booking_id)), "Booking loaded")


async def cancel(session: AsyncSession, user: CurrentUser, booking_id: UUID, data: BookingCancel) -> ApiResponse:
    booking = await get_owned(session, user, booking_id, lock=True)
    result = await booking_service.cancel_booking(session, booking, data.reason)
    return ok(BookingResponse.model_validate(result), "Booking cancelled")


async def reschedule(session: AsyncSession, user: CurrentUser, booking_id: UUID, data: BookingReschedule) -> ApiResponse:
    booking = await get_owned(session, user, booking_id, lock=True)
    result = await booking_service.reschedule_booking(session, booking, data)
    return ok(BookingResponse.model_validate(result), "Booking rescheduled")


async def transition(session: AsyncSession, user: CurrentUser, booking_id: UUID, action: str) -> ApiResponse:
    booking = await get_owned(session, user, booking_id, lock=True)
    if user.role not in {"PROVIDER", "ADMIN"}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Provider access required")
    if action == "confirm":
        result = await booking_service.confirm_booking(session, booking)
    elif action == "complete":
        result = await booking_service.complete_booking(session, booking)
    else:
        result = await booking_service.mark_no_show(session, booking)
    message = {"confirm": "Booking confirmed", "complete": "Booking completed", "no-show": "Booking marked no-show"}[action]
    return ok(BookingResponse.model_validate(result), message)
