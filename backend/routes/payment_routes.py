from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from common.auth_stub import CurrentUser, get_current_user
from controllers import payment_controller as controller
from database.session import get_db
from schemas.booking import PaymentCreate, PaymentFailure, PaymentRetry, RefundRequest

router = APIRouter(prefix="/api/payments", tags=["Payments"])


@router.post("", status_code=201)
async def create_payment(data: PaymentCreate, user: CurrentUser = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    return await controller.create(session, user, data)


@router.get("/{payment_id:uuid}")
async def get_payment(payment_id: UUID, user: CurrentUser = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    return await controller.get_one(session, user, payment_id)


@router.post("/{payment_id:uuid}/mock-success")
async def mock_success(payment_id: UUID, user: CurrentUser = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    return await controller.mock_success(session, user, payment_id)


@router.post("/{payment_id:uuid}/mock-failure")
async def mock_failure(payment_id: UUID, data: PaymentFailure, user: CurrentUser = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    return await controller.mock_failure(session, user, payment_id, data)


@router.post("/{payment_id:uuid}/retry")
async def retry_payment(payment_id: UUID, data: PaymentRetry, user: CurrentUser = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    return await controller.retry(session, user, payment_id, data)


@router.post("/{payment_id:uuid}/refund")
async def refund_payment(payment_id: UUID, data: RefundRequest, user: CurrentUser = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    return await controller.refund(session, user, payment_id, data)
