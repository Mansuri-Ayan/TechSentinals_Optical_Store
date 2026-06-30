# Schema: lab.py
from datetime import datetime
from pydantic import BaseModel, Field


class LabCreate(BaseModel):
    name: str = Field(
        ..., max_length=255, examples=["Precision Lens Lab"],
        description="Lab display name",
    )
    contact_number: str = Field(
        ..., min_length=10, max_length=10, pattern=r"^\d{10}$", examples=["9876543210"],
        description="10-digit contact phone number",
    )
    email: str = Field(
        ..., max_length=255,
        pattern=r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
        examples=["contact@precisionlab.com"],
        description="Lab email address",
    )


class LabUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    contact_number: str | None = Field(default=None, min_length=10, max_length=10, pattern=r"^\d{10}$")
    email: str | None = Field(
        default=None, max_length=255,
        pattern=r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    )
    is_active: bool | None = Field(default=None)


class LabRead(BaseModel):
    id: int
    admin_id: int
    name: str
    contact_number: str
    email: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


from schemas.sale import SaleRead

class LabOrdersResponse(BaseModel):
    lab: LabRead
    orders: list[SaleRead]
    total: int
    page: int
    limit: int
    pages: int
