from sqlalchemy.ext.asyncio import AsyncSession
from schemas.user_schema import UserResponse
from schemas.auth_schema import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshResponse,
    RegisterRequest,
    ResetPasswordRequest,
)
from services.auth_service import AuthService


class AuthController:

    @staticmethod
    async def register(
        data: RegisterRequest,
        db: AsyncSession,
        ) -> UserResponse:
        service = AuthService(db)
        return await service.register(data)

    @staticmethod
    async def login(
        data: LoginRequest,
        db: AsyncSession,
    ) -> tuple[AuthResponse, str]:

        service = AuthService(db)

        return await service.login(data)

    @staticmethod
    async def refresh(
        refresh_token: str,
        db: AsyncSession,
    ) -> tuple[RefreshResponse, str]:

        service = AuthService(db)

        return await service.refresh(refresh_token)

    @staticmethod
    async def logout(
        refresh_token: str,
        db: AsyncSession,
    ) -> None:

        service = AuthService(db)

        await service.logout(refresh_token)

    @staticmethod
    async def forgot_password(
        data: ForgotPasswordRequest,
        db: AsyncSession,
    ) -> str | None:

        service = AuthService(db)

        return await service.forgot_password(data)

    @staticmethod
    async def reset_password(
        data: ResetPasswordRequest,
        db: AsyncSession,
    ) -> None:

        service = AuthService(db)

        await service.reset_password(data)