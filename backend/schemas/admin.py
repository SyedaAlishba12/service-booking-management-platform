from datetime import datetime

from pydantic import BaseModel, ConfigDict, model_validator

from models.provider import ProviderStatus



class ProviderStatusUpdate(BaseModel):
    status: ProviderStatus | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def _at_least_one(self):
        if self.status is None and self.is_active is None:
            raise ValueError("Provide status and/or is_active")
        return self


class ServiceActiveUpdate(BaseModel):
    is_active: bool


# ---------------------------------------------------------------------------
# Admin User Management schemas
# ---------------------------------------------------------------------------

class AdminUserResponse(BaseModel):
    """Safe user representation – never exposes password_hash or tokens."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    full_name: str
    email: str
    phone: str | None
    role: str
    profile_image_url: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime



class AdminUserDetailResponse(AdminUserResponse):
    """Extended user detail that includes activity counts."""

    booking_count: int
    review_count: int
    complaint_count: int


class UserStatusUpdate(BaseModel):
    """Request body for PUT /api/admin/users/{user_id}/status."""

    is_active: bool
