
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User
from schemas.user_schema import (
    UserResponse,
    UserUpdateRequest,
)
from services.user_service import UserService


class UserController:
    @staticmethod
    async def get_current_user(
        user: User,
        db: AsyncSession,
    ) -> UserResponse:
        service = UserService(db)
        return await service.get_current_user(user)

    @staticmethod
    async def update_current_user(
        user: User,
        data: UserUpdateRequest,
        db: AsyncSession,
    ) -> UserResponse:
        service = UserService(db)
        return await service.update_current_user(user, data)

    @staticmethod
    async def get_user_by_id(
        user_id: UUID,
        db: AsyncSession,
    ) -> UserResponse:
        service = UserService(db)
        return await service.get_user_by_id(user_id)

    @staticmethod
    async def update_account_status(
        user_id: UUID,
        is_active: bool,
        requesting_user: User,
        db: AsyncSession,
    ) -> UserResponse:
        service = UserService(db)

        return await service.update_account_status(
            user_id=user_id,
            is_active=is_active,
            requesting_user=requesting_user,
        )