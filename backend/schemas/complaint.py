"""
Pydantic v2 schemas for the Complaint resource.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from models.complaint import ComplaintStatus, ComplaintType


class ComplaintCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    complaint_type: ComplaintType
    subject: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=5000)
    booking_id: uuid.UUID | None = None
    provider_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def validate_type_refs(self) -> "ComplaintCreate":
        if self.complaint_type in (ComplaintType.BOOKING, ComplaintType.PAYMENT) and not self.booking_id:
            raise ValueError("booking_id is required for BOOKING and PAYMENT complaints")
        if self.complaint_type == ComplaintType.PROVIDER and not self.provider_id:
            raise ValueError("provider_id is required for PROVIDER complaints")
        return self


class ComplaintAdminUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    status: ComplaintStatus
    admin_response: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def validate_terminal_status(self) -> "ComplaintAdminUpdate":
        if self.admin_response is not None and not self.admin_response.strip():
            self.admin_response = None
            
        if self.status in (ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED):
            if not self.admin_response:
                raise ValueError("admin_response is required when resolving or rejecting a complaint")
        return self


class ComplaintResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    booking_id: uuid.UUID | None
    provider_id: uuid.UUID | None
    complaint_type: ComplaintType
    subject: str
    description: str
    status: ComplaintStatus
    admin_response: str | None
    resolved_by: uuid.UUID | None
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ComplaintListResponse(BaseModel):
    success: bool
    message: str
    data: list[ComplaintResponse]


class ComplaintDetailResponse(BaseModel):
    success: bool
    message: str
    data: ComplaintResponse
