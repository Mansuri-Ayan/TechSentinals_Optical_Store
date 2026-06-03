# Schema: brand.py
from datetime import datetime
from pydantic import BaseModel, Field


class BrandCreate(BaseModel):
    name: str = Field(
        ..., max_length=255, examples=["Ray-Ban"],
        description="Brand display name",
    )


class BrandUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    is_active: bool | None = Field(default=None)


class BrandRead(BaseModel):
    id: int
    admin_id: int
    name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
