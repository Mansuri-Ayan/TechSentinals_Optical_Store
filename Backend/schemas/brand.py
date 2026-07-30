# Schema: brand.py
from datetime import datetime
from pydantic import BaseModel, Field


class BrandCreate(BaseModel):
    name: str = Field(
        ..., max_length=255, examples=["Ray-Ban"],
        description="Brand display name",
    )
    store_id: int | None = Field(
        default=None, description="Optional store ID to scope this brand"
    )


class BrandUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    is_active: bool | None = Field(default=None)


class BrandRead(BaseModel):
    id: int
    admin_id: int
    store_id: int | None = None
    name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    products_count: int = 0

    model_config = {"from_attributes": True}
