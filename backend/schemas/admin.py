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
