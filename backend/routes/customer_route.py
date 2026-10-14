from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_db
from middleware.auth_middleware import get_current_user
from models.user import User
from schemas.customer_schema import CustomerResponse, CustomerUpdateRequest
from services.customer_service import CustomerService

router = APIRouter(
    prefix="/api/customers",
    tags=["Customers"],
)


@router.get("/me", response_model=dict)
async def get_current_customer_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CustomerService(db)
    result = await service.get_by_user_id(current_user.id)

    return {
        "success": True,
        "message": "Customer profile retrieved successfully",
        "data": result.model_dump(),
    }


@router.put("/me", response_model=dict)
async def update_current_customer_profile(
    data: CustomerUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CustomerService(db)
    result = await service.update_customer(current_user.id, data)

    return {
        "success": True,
        "message": "Customer profile updated successfully",
        "data": result.model_dump(),
    }