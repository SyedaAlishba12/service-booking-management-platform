
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User, UserRole
from repositories.user_repository import UserRepository
from schemas.user_schema import (
    UserResponse,
    UserUpdateRequest,
)


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = UserRepository(db)

    async def get_current_user(
        self,
        user: User,
    ) -> UserResponse:
        return self._build_response(user)

    async def get_user_by_id(
        self,
        user_id: UUID,
    ) -> UserResponse:
        user = await self.repository.get_by_id(user_id)

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        return self._build_response(user)

    async def update_current_user(
        self,
        user: User,
        data: UserUpdateRequest,
    ) -> UserResponse:
        fields = data.model_fields_set

        if "full_name" in fields:
            if data.full_name is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Full name cannot be empty",
                )

            full_name = data.full_name.strip()

            if len(full_name) < 2:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Full name must contain at least 2 characters",
                )

            user.full_name = full_name

        if "phone" in fields:
            phone = (data.phone or "").strip()

            if phone:
                existing_user = (
                    await self.repository.get_by_phone(phone)
                )

                if (
                    existing_user is not None
                    and existing_user.id != user.id
                ):
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="A user with this phone already exists",
                    )

                user.phone = phone
            else:
                user.phone = None

        if "profile_image_url" in fields:
            user.profile_image_url = (
                data.profile_image_url.strip()
                if data.profile_image_url
                and data.profile_image_url.strip()
                else None
            )

        try:
            await self.repository.commit()
            await self.db.refresh(user)
        except IntegrityError:
            await self.repository.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The supplied information conflicts with an existing account",
            )

        return self._build_response(user)

    async def update_account_status(
        self,
        user_id: UUID,
        is_active: bool,
        requesting_user: User,
    ) -> UserResponse:
        if requesting_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can change account status",
            )

        if user_id == requesting_user.id and not is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot deactivate your own administrator account",
            )

        user = await self.repository.get_by_id(user_id)

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        user.is_active = is_active

        await self.repository.commit()
        await self.db.refresh(user)

        return self._build_response(user)

    @staticmethod
    def _build_response(user: User) -> UserResponse:
        return UserResponse(
            id=str(user.id),
            full_name=user.full_name,
            email=user.email,
            phone=user.phone,
            role=user.role.value,
            profile_image_url=user.profile_image_url,
            is_active=user.is_active,
        )