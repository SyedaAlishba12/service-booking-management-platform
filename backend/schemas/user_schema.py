
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    full_name: str
    email: EmailStr
    phone: str | None
    role: str
    profile_image_url: str | None
    is_active: bool


class UserUpdateRequest(BaseModel):
    full_name: str | None = Field(
        default=None,
        min_length=2,
        max_length=150,
    )
    phone: str | None = Field(
        default=None,
        max_length=20,
    )
    profile_image_url: str | None = Field(
        default=None,
        max_length=500,
    )


class UserStatusUpdateRequest(BaseModel):
    is_active: bool