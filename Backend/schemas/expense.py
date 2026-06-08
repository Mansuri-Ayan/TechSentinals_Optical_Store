# Schema: expense.py
from datetime import date, datetime
from pydantic import BaseModel, Field
from models.expense import ExpenseOwnerType, ExpensePaymentMethod, ExpenseRecordedByType


class ExpenseCreate(BaseModel):
    owner_type: ExpenseOwnerType
    owner_id: int
    category_id: int
    title: str = Field(..., max_length=255)
    description: str | None = None
    amount: float = Field(..., gt=0)
    expense_date: date
    payment_method: ExpensePaymentMethod
    reference_number: str | None = Field(default=None, max_length=100)
    receipt_url: str | None = None
    is_recurring: bool = False
    recurring_interval: str | None = Field(default=None, max_length=20)
    
    # Track who this was incurred by / spent on
    incurred_by_type: ExpenseRecordedByType | None = None
    incurred_by_id: int | None = None


class ExpenseUpdate(BaseModel):
    category_id: int | None = None
    title: str | None = Field(default=None, max_length=255)
    description: str | None = None
    amount: float | None = Field(default=None, gt=0)
    expense_date: date | None = None
    payment_method: ExpensePaymentMethod | None = None
    reference_number: str | None = Field(default=None, max_length=100)
    receipt_url: str | None = None
    is_recurring: bool | None = None
    recurring_interval: str | None = Field(default=None, max_length=20)
    
    incurred_by_type: ExpenseRecordedByType | None = None
    incurred_by_id: int | None = None


class ExpenseApprove(BaseModel):
    is_approved: bool


class ExpenseRead(BaseModel):
    id: int
    admin_id: int
    owner_type: ExpenseOwnerType
    owner_id: int
    category_id: int
    title: str
    description: str | None = None
    amount: float
    expense_date: date
    payment_method: ExpensePaymentMethod
    reference_number: str | None = None
    receipt_url: str | None = None
    is_recurring: bool
    recurring_interval: str | None = None
    is_approved: bool
    approved_by: int | None = None
    approved_at: datetime | None = None
    recorded_by_type: ExpenseRecordedByType
    recorded_by_id: int
    incurred_by_type: ExpenseRecordedByType | None = None
    incurred_by_id: int | None = None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    # Denormalized read helper fields
    category_name: str | None = None
    owner_name: str | None = None
    recorded_by_name: str | None = None
    incurred_by_name: str | None = None

    model_config = {"from_attributes": True}
