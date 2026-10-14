
import logging
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from common.security import (
    create_access_token,
    create_secure_token,
    get_password_reset_token_expiry,
    get_refresh_token_expiry,
    hash_password,
    hash_token,
    verify_password,
)
from models.customer import Customer
from models.password_reset_token import PasswordResetToken
from models.refresh_token import RefreshToken
from models.user import User, UserRole
from repositories.auth_repository import AuthRepository
from repositories.user_repository import UserRepository
from schemas.auth_schema import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshResponse,
    RegisterRequest,
    ResetPasswordRequest,
)
from schemas.user_schema import UserResponse
from services.email_service import send_password_reset_email


logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.auth_repository = AuthRepository(db)
        self.user_repository = UserRepository(db)

    # -------------------------
    # Signup
    # -------------------------

    async def register(
        self,
        data: RegisterRequest,
    ) -> UserResponse:
        # Public signup only allows CUSTOMER and PROVIDER.
        # ADMIN accounts must be created through the admin seed process.
        role = data.role

        if role not in {UserRole.CUSTOMER, UserRole.PROVIDER}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only CUSTOMER and PROVIDER registration is allowed",
            )

        email = str(data.email).lower().strip()

        existing_user = await self.user_repository.get_by_email(email)
        if existing_user is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists",
            )

        phone = data.phone.strip() if data.phone else None

        if phone:
            existing_phone = await self.user_repository.get_by_phone(phone)
            if existing_phone is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A user with this phone already exists",
                )

        user = User(
            full_name=data.full_name.strip(),
            email=email,
            phone=phone,
            password_hash=hash_password(data.password),
            role=role,
            is_active=True,
        )

        try:
            user = await self.user_repository.create(user)

            # Create the customer profile only for CUSTOMER accounts.
            if role == UserRole.CUSTOMER:
                self.db.add(Customer(user_id=user.id))
                await self.db.flush()

            # Signup creates an account only.
            # It does not create an access token or refresh token.
            await self.auth_repository.commit()

        except Exception:
            await self.auth_repository.rollback()
            raise

        return self._build_user_response(user)

    # -------------------------
    # Login
    # -------------------------

    async def login(
        self,
        data: LoginRequest,
    ) -> tuple[AuthResponse, str]:
        email = str(data.email).lower().strip()
        user = await self.user_repository.get_by_email(email)

        if user is None or not verify_password(
            data.password,
            user.password_hash if user else "",
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )

        raw_refresh_token = create_secure_token()

        refresh_record = RefreshToken(
            user_id=user.id,
            token_hash=hash_token(raw_refresh_token),
            expires_at=get_refresh_token_expiry(),
        )

        try:
            await self.auth_repository.create_refresh_token(refresh_record)
            await self.auth_repository.commit()

        except Exception:
            await self.auth_repository.rollback()
            raise

        access_token = create_access_token(
            user_id=str(user.id),
            role=user.role.value,
        )

        return (
            AuthResponse(
                access_token=access_token,
                token_type="bearer",
                user=self._build_user_response(user),
            ),
            raw_refresh_token,
        )

    # -------------------------
    # Refresh Token
    # -------------------------

    async def refresh(
        self,
        refresh_token: str,
    ) -> tuple[RefreshResponse, str]:
        stored_token = await self.auth_repository.get_refresh_token(
            hash_token(refresh_token)
        )

        if stored_token is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        if stored_token.revoked_at is not None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has been revoked",
            )

        now = datetime.now(timezone.utc)
        expires_at = stored_token.expires_at

        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at <= now:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired",
            )

        user = await self.user_repository.get_by_id(stored_token.user_id)

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )

        raw_new_refresh_token = create_secure_token()

        new_refresh_record = RefreshToken(
            user_id=user.id,
            token_hash=hash_token(raw_new_refresh_token),
            expires_at=get_refresh_token_expiry(),
        )

        try:
            # Rotate the refresh token: revoke the old one and store the new one.
            await self.auth_repository.revoke_refresh_token(stored_token)
            await self.auth_repository.create_refresh_token(new_refresh_record)
            await self.auth_repository.commit()

        except Exception:
            await self.auth_repository.rollback()
            raise

        access_token = create_access_token(
            user_id=str(user.id),
            role=user.role.value,
        )

        return (
            RefreshResponse(
                access_token=access_token,
                token_type="bearer",
                user=self._build_user_response(user),
            ),
            raw_new_refresh_token,
        )

    # -------------------------
    # Logout
    # -------------------------

    async def logout(self, refresh_token: str) -> None:
        stored_token = await self.auth_repository.get_refresh_token(
            hash_token(refresh_token)
        )

        if stored_token is None or stored_token.revoked_at is not None:
            return

        try:
            await self.auth_repository.revoke_refresh_token(stored_token)
            await self.auth_repository.commit()

        except Exception:
            await self.auth_repository.rollback()
            raise

    # -------------------------
    # Forgot Password
    # -------------------------

    async def forgot_password(
        self,
        data: ForgotPasswordRequest,
    ) -> str | None:
        email = str(data.email).lower().strip()
        user = await self.user_repository.get_by_email(email)

        # Do not reveal whether an account exists.
        if user is None or not user.is_active:
            return None

        raw_reset_token = create_secure_token()

        reset_record = PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(raw_reset_token),
            expires_at=get_password_reset_token_expiry(),
            used=False,
        )

        try:
            await self.auth_repository.create_password_reset_token(
                reset_record
            )
            await self.auth_repository.commit()

        except Exception:
            await self.auth_repository.rollback()
            raise

        # The raw reset token is sent only through the email service.
        # It is never returned by this method.
        try:
            await send_password_reset_email(
                user.email,
                raw_reset_token,
            )

        except Exception:
            # Never log the token or reset URL.
            logger.exception("Password reset email could not be sent.")

        return None

    # -------------------------
    # Reset Password
    # -------------------------

    async def reset_password(
        self,
        data: ResetPasswordRequest,
    ) -> None:
        stored_token = await self.auth_repository.get_password_reset_token(
            hash_token(data.token)
        )

        if stored_token is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid password reset token",
            )

        if stored_token.used:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password reset token has already been used",
            )

        now = datetime.now(timezone.utc)
        expires_at = stored_token.expires_at

        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at <= now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password reset token has expired",
            )

        user = await self.user_repository.get_by_id(stored_token.user_id)

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        try:
            # Store a password hash, never the plaintext password.
            user.password_hash = hash_password(data.new_password)
            stored_token.used = True

            # Invalidate existing refresh-token sessions after password reset.
            await self.auth_repository.revoke_all_user_refresh_tokens(
                user.id
            )
            await self.auth_repository.commit()

        except Exception:
            await self.auth_repository.rollback()
            raise

    # -------------------------
    # Response Helper
    # -------------------------

    @staticmethod
    def _build_user_response(user: User) -> UserResponse:
        return UserResponse(
            id=str(user.id),
            full_name=user.full_name,
            email=user.email,
            phone=user.phone,
            role=user.role.value,
            profile_image_url=user.profile_image_url,
            is_active=user.is_active,
        )