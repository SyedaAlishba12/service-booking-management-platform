from pydantic import BaseModel, EmailStr, Field

from models.user import UserRole
from schemas.user_schema import UserResponse


class RegisterRequest(BaseModel):
    full_name: str = Field(
        min_length=2,
        max_length=150,
    )

    email: EmailStr

    phone: str | None = Field(
        default=None,
        max_length=20,
    )

    password: str = Field(
        min_length=8,
        max_length=128,
    )

    role: UserRole


class LoginRequest(BaseModel):
    email: EmailStr

    password: str = Field(
        min_length=1,
        max_length=128,
    )


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(
        min_length=1,
        max_length=500,
    )

    new_password: str = Field(
        min_length=8,
        max_length=128,
    )