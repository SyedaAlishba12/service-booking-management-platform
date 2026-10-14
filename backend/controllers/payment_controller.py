from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from common.auth_stub import CurrentUser
from common.responses import ApiResponse, ok
from models.booking import Payment
from schemas.booking import PaymentCreate, PaymentFailure, PaymentResponse, PaymentRetry, RefundRequest
from controllers.booking_controller import get_owned
from services import payment_service


async def _owned_payment(session: AsyncSession, user: CurrentUser, payment_id: UUID) -> Payment:
    payment = await session.scalar(select(Payment).where(Payment.id == payment_id))
    if payment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found")
    await get_owned(session, user, payment.booking_id)
    return payment


async def create(session: AsyncSession, user: CurrentUser, data: PaymentCreate) -> ApiResponse:
    if user.role != "CUSTOMER":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Customer access required")
    await get_owned(session, user, data.booking_id)
    payment = await payment_service.get_or_create_payment(session, data.booking_id, data.payment_method)
    return ok(PaymentResponse.model_validate(payment), "Mock payment ready")


async def get_one(session: AsyncSession, user: CurrentUser, payment_id: UUID) -> ApiResponse:
    payment = await _owned_payment(session, user, payment_id)
    return ok(PaymentResponse.model_validate(payment), "Payment loaded")


async def mock_success(session: AsyncSession, user: CurrentUser, payment_id: UUID) -> ApiResponse:
    if user.role not in {"CUSTOMER", "ADMIN"}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Customer access required")
    await _owned_payment(session, user, payment_id)
    payment = await payment_service.mock_success(session, payment_id)
    return ok(PaymentResponse.model_validate(payment), "Mock payment succeeded")


async def mock_failure(session: AsyncSession, user: CurrentUser, payment_id: UUID, data: PaymentFailure) -> ApiResponse:
    if user.role not in {"CUSTOMER", "ADMIN"}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Customer access required")
    await _owned_payment(session, user, payment_id)
    payment = await payment_service.mock_failure(session, payment_id, data.reason)
    return ok(PaymentResponse.model_validate(payment), "Mock payment failed and its hold was released")


async def retry(session: AsyncSession, user: CurrentUser, payment_id: UUID, data: PaymentRetry) -> ApiResponse:
    if user.role not in {"CUSTOMER", "ADMIN"}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Customer access required")
    await _owned_payment(session, user, payment_id)
    payment = await payment_service.retry(session, payment_id, data.payment_method)
    return ok(PaymentResponse.model_validate(payment), "Payment retry started")


async def refund(session: AsyncSession, user: CurrentUser, payment_id: UUID, data: RefundRequest) -> ApiResponse:
    if user.role not in {"PROVIDER", "ADMIN"}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Provider or admin access required")
    await _owned_payment(session, user, payment_id)
    payment = await payment_service.refund(session, payment_id, data.amount)
    return ok(PaymentResponse.model_validate(payment), "Payment refunded")
