# Schema: expense_category.py
from datetime import datetime
from pydantic import BaseModel, Field


class ExpenseCategoryCreate(BaseModel):
    name: str = Field(..., max_length=150)
    description: str | None = None
    is_active: bool = True


class ExpenseCategoryUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=150)
    description: str | None = None
    is_active: bool | None = None


class ExpenseCategoryRead(BaseModel):
    id: int
    admin_id: int
    name: str
    description: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
