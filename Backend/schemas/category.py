# Schema: category.py
from datetime import datetime
from pydantic import BaseModel, Field


# ── Category ───────────────────────────────────────────────────
class CategoryCreate(BaseModel):
    name: str = Field(
        ..., max_length=255, examples=["Frames"],
        description="Category display name",
    )
    description: str | None = Field(
        default=None, examples=["Eyeglass and sunglass frames"],
        description="Optional description of the category",
    )
    store_id: int | None = Field(
        default=None, description="Optional store ID to scope this category"
    )


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None)
    is_active: bool | None = Field(default=None)


class CategoryRead(BaseModel):
    id: int
    admin_id: int
    store_id: int | None = None
    name: str
    description: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    subcategories_count: int = 0
    products_count: int = 0

    model_config = {"from_attributes": True}


# ── Subcategory ────────────────────────────────────────────────
class SubcategoryCreate(BaseModel):
    name: str = Field(
        ..., max_length=255, examples=["Full-Rim Frames"],
        description="Subcategory display name",
    )
    description: str | None = Field(
        default=None, examples=["Complete rim around the lenses"],
        description="Optional description",
    )


class SubcategoryUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None)
    is_active: bool | None = Field(default=None)


class SubcategoryRead(BaseModel):
    id: int
    category_id: int
    name: str
    description: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    products_count: int = 0

    model_config = {"from_attributes": True}
