from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from models.service import ServiceType
from schemas.provider import ProviderSummary


class ServiceCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    category_id: UUID
    name: str = Field(min_length=2, max_length=150)
    description: str | None = None
    price: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    duration_minutes: int = Field(gt=0, le=1440)
    service_type: ServiceType
    location: str | None = Field(default=None, max_length=255)


class ServiceUpdate(BaseModel):
    """Partial update. Only the fields that are sent are changed."""

    model_config = ConfigDict(str_strip_whitespace=True)

    category_id: UUID | None = None
    name: str | None = Field(default=None, min_length=2, max_length=150)
    description: str | None = None
    price: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    duration_minutes: int | None = Field(default=None, gt=0, le=1440)
    service_type: ServiceType | None = None
    location: str | None = Field(default=None, max_length=255)


class ServiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    provider_id: UUID
    category_id: UUID
    name: str
    description: str | None
    price: Decimal
    duration_minutes: int
    service_type: ServiceType
    location: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ServicePublicResponse(ServiceResponse):
    """Service card for search / discovery: service plus a small provider block."""

    provider: ProviderSummary


class ServiceFilters(BaseModel):
    q: str | None = None
    provider_id: UUID | None = None
    category_id: UUID | None = None
    min_price: Decimal | None = Field(default=None, ge=0)
    max_price: Decimal | None = Field(default=None, ge=0)
    service_type: ServiceType | None = None
    # matches service.location, provider.location or provider.city
    location: str | None = None
    # honoured only for admin listings (public_only=False)
    is_active: bool | None = None

    @model_validator(mode="after")
    def _price_range(self):
        if (
            self.min_price is not None
            and self.max_price is not None
            and self.min_price > self.max_price
        ):
            raise ValueError("min_price cannot be greater than max_price")
        return self


class ServiceListResponse(BaseModel):
    items: list[ServicePublicResponse]
    total: int
    page: int
    page_size: int
