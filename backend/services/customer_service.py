
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.customer import Customer
from schemas.customer_schema import CustomerResponse, CustomerUpdateRequest


class CustomerService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_user_id(self, user_id: UUID) -> CustomerResponse:
        result = await self.db.execute(
            select(Customer).where(Customer.user_id == user_id)
        )
        customer = result.scalar_one_or_none()

        if customer is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer profile not found",
            )

        return self._build_response(customer)

    async def update_customer(
        self,
        user_id: UUID,
        data: CustomerUpdateRequest,
    ) -> CustomerResponse:
        result = await self.db.execute(
            select(Customer).where(Customer.user_id == user_id)
        )
        customer = result.scalar_one_or_none()

        if customer is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer profile not found",
            )

        if "preferences" in data.model_fields_set:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Customer preferences cannot be saved yet because "
                    "the current customer model does not store them."
                ),
            )

        return self._build_response(customer)

    @staticmethod
    def _build_response(customer: Customer) -> CustomerResponse:
        return CustomerResponse(
            id=str(customer.id),
            user_id=str(customer.user_id),
            preferences=None,
            created_at=customer.created_at,
            updated_at=customer.updated_at,
        )
