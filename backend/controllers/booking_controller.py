from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from common.auth_stub import CurrentUser
from common.responses import ApiResponse, ok, paginated
from models.booking import Booking, Payment
from models.customer import Customer
from models.provider import Provider
from models.service import Service
from models.user import User
from repositories import booking_repository as repo
from schemas.booking import (
    BookingCancel,
    BookingCreate,
    BookingReschedule,
    BookingResponse,
)
from services import booking_service
from services.provider_service import get_provider_by_user


async def _booking_responses(
    session: AsyncSession,
    bookings: list[Booking],
) -> list[BookingResponse]:
    if not bookings:
        return []

    booking_ids = [booking.id for booking in bookings]

    labels = (
        await session.execute(
            select(
                Booking.id,
                Service.name,
                Provider.business_name,
                User.full_name,
                Provider.timezone,
                Payment.status,
            )
            .join(Service, Service.id == Booking.service_id)
            .join(Provider, Provider.id == Booking.provider_id)
            .join(Customer, Customer.id == Booking.customer_id)
            .join(User, User.id == Customer.user_id)
            .outerjoin(Payment, Payment.booking_id == Booking.id)
            .where(Booking.id.in_(booking_ids))
        )
    ).all()

    labels_by_booking_id = {
        row[0]: {
            "service_name": row[1],
            "provider_name": row[2],
            "customer_name": row[3],
            "provider_timezone": row[4],
            "payment_status": row[5],
        }
        for row in labels
    }

    responses = []
    for booking in bookings:
        response = BookingResponse.model_validate(booking).model_copy(
            update=labels_by_booking_id.get(booking.id, {})
        )
        responses.append(response)

    return responses


async def available_slots(
    session: AsyncSession,
    provider_id: UUID,
    service_id: UUID,
    from_date,
    to_date,
) -> ApiResponse:
    slots = await booking_service.get_available_slots(
        session,
        provider_id,
        service_id,
        from_date,
        to_date,
    )
    return ok(slots, "Available slots loaded")


async def create(
    session: AsyncSession,
    user: CurrentUser,
    data: BookingCreate,
) -> ApiResponse:
    if user.role != "CUSTOMER":
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Customer access required",
        )

    booking = await booking_service.create_booking(
        session,
        user.id,
        data,
    )
    return ok(
        BookingResponse.model_validate(booking),
        "Booking hold created",
    )


async def list_customer(
    session: AsyncSession,
    user: CurrentUser,
    page: int,
    page_size: int,
) -> ApiResponse:
    customer_id = await session.scalar(
        select(Customer.id).where(Customer.user_id == user.id)
    )
    if customer_id is None:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Customer profile not found",
        )

    bookings, total = await repo.list_customer(
        session,
        customer_id,
        page,
        page_size,
    )
    responses = await _booking_responses(session, bookings)

    return ApiResponse(
        message="Bookings loaded",
        data=paginated(responses, total, page, page_size),
    )


async def list_provider(
    session: AsyncSession,
    user: CurrentUser,
    provider_id: UUID | None,
    start_at,
    end_at,
    page: int,
    page_size: int,
) -> ApiResponse:
    if user.role == "PROVIDER":
        provider = await get_provider_by_user(session, user.id)
        provider_id = provider.id

    if provider_id is None:
        raise HTTPException(
            422,
            "provider_id is required for admin listings",
        )

    bookings, total = await repo.list_provider(
        session,
        provider_id,
        start_at,
        end_at,
        page,
        page_size,
    )
    responses = await _booking_responses(session, bookings)

    return ApiResponse(
        message="Bookings loaded",
        data=paginated(responses, total, page, page_size),
    )


async def get_owned(
    session: AsyncSession,
    user: CurrentUser,
    booking_id: UUID,
    *,
    lock: bool = False,
) -> Booking:
    booking = await repo.get_booking(
        session,
        booking_id,
        lock=lock,
    )
    if booking is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Booking not found",
        )

    if user.role == "CUSTOMER":
        owner_id = await session.scalar(
            select(Customer.id).where(Customer.user_id == user.id)
        )
        allowed = (
            owner_id is not None
            and booking.customer_id == owner_id
        )
    elif user.role == "PROVIDER":
        owner_id = await session.scalar(
            select(Provider.id).where(Provider.user_id == user.id)
        )
        allowed = (
            owner_id is not None
            and booking.provider_id == owner_id
        )
    else:
        allowed = user.role == "ADMIN"

    if not allowed:
        # Avoid revealing whether another user's booking exists.
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Booking not found",
        )

    return booking


async def get_one(
    session: AsyncSession,
    user: CurrentUser,
    booking_id: UUID,
) -> ApiResponse:
    booking = await get_owned(session, user, booking_id)
    response = (await _booking_responses(session, [booking]))[0]
    return ok(response, "Booking loaded")


async def cancel(
    session: AsyncSession,
    user: CurrentUser,
    booking_id: UUID,
    data: BookingCancel,
) -> ApiResponse:
    booking = await get_owned(
        session,
        user,
        booking_id,
        lock=True,
    )
    cancelled = await booking_service.cancel_booking(
        session,
        booking,
        data.reason,
    )
    response = (await _booking_responses(session, [cancelled]))[0]
    return ok(response, "Booking cancelled")


async def reschedule(
    session: AsyncSession,
    user: CurrentUser,
    booking_id: UUID,
    data: BookingReschedule,
) -> ApiResponse:
    booking = await get_owned(
        session,
        user,
        booking_id,
        lock=True,
    )
    rescheduled = await booking_service.reschedule_booking(
        session,
        booking,
        data,
    )
    response = (await _booking_responses(session, [rescheduled]))[0]
    return ok(response, "Booking rescheduled")


async def transition(
    session: AsyncSession,
    user: CurrentUser,
    booking_id: UUID,
    action: str,
) -> ApiResponse:
    if user.role not in {"PROVIDER", "ADMIN"}:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Provider or admin access required",
        )

    booking = await get_owned(
        session,
        user,
        booking_id,
        lock=True,
    )

    if action == "confirm":
        updated = await booking_service.confirm_booking(
            session,
            booking,
        )
    elif action == "complete":
        updated = await booking_service.complete_booking(
            session,
            booking,
        )
    elif action == "no-show":
        updated = await booking_service.mark_no_show(
            session,
            booking,
        )
    else:
        raise HTTPException(
            422,
            "Unsupported booking action",
        )

    messages = {
        "confirm": "Booking confirmed",
        "complete": "Booking completed",
        "no-show": "Booking marked no-show",
    }
    response = (await _booking_responses(session, [updated]))[0]
    return ok(response, messages[action])