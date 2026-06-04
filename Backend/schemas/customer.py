# Schema: customer.py
"""
Pydantic schemas for Customer with optical prescription support.
"""
from datetime import date, datetime
from enum import Enum
from pydantic import BaseModel, Field


# ── Enums ──────────────────────────────────────────────────────

class CustomerGenderEnum(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"
    NOT_SPECIFIED = "NOT_SPECIFIED"


# ── Customer ──────────────────────────────────────────────────

class CustomerCreate(BaseModel):
    first_name: str = Field(..., max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    email: str | None = Field(default=None, max_length=255)
    phone: str = Field(..., max_length=10, description="Primary identifier")
    date_of_birth: date | None = None
    gender: CustomerGenderEnum = Field(default=CustomerGenderEnum.NOT_SPECIFIED)
    address: str | None = None
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    pincode: str | None = Field(default=None, max_length=6)
    first_visit_store_id: int | None = Field(
        default=None, description="FK → stores.id — store of first visit",
    )
    # Prescription
    prescription_sph_right: str | None = Field(default=None, max_length=10)
    prescription_cyl_right: str | None = Field(default=None, max_length=10)
    prescription_axis_right: str | None = Field(default=None, max_length=10)
    prescription_sph_left: str | None = Field(default=None, max_length=10)
    prescription_cyl_left: str | None = Field(default=None, max_length=10)
    prescription_axis_left: str | None = Field(default=None, max_length=10)
    prescription_add: str | None = Field(default=None, max_length=10)
    prescription_date: date | None = None
    prescription_notes: str | None = None
    notes: str | None = None


class CustomerUpdate(BaseModel):
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=10)
    date_of_birth: date | None = None
    gender: CustomerGenderEnum | None = None
    address: str | None = None
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    pincode: str | None = Field(default=None, max_length=6)
    is_active: bool | None = None
    notes: str | None = None


class PrescriptionUpdate(BaseModel):
    """Dedicated schema for updating optical prescription."""
    prescription_sph_right: str | None = Field(default=None, max_length=10)
    prescription_cyl_right: str | None = Field(default=None, max_length=10)
    prescription_axis_right: str | None = Field(default=None, max_length=10)
    prescription_sph_left: str | None = Field(default=None, max_length=10)
    prescription_cyl_left: str | None = Field(default=None, max_length=10)
    prescription_axis_left: str | None = Field(default=None, max_length=10)
    prescription_add: str | None = Field(default=None, max_length=10)
    prescription_date: date | None = None
    prescription_notes: str | None = None


class CustomerRead(BaseModel):
    id: int
    admin_id: int
    first_visit_store_id: int | None = None
    first_name: str
    last_name: str | None = None
    email: str | None = None
    phone: str
    date_of_birth: date | None = None
    gender: CustomerGenderEnum
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    # Prescription
    prescription_sph_right: str | None = None
    prescription_cyl_right: str | None = None
    prescription_axis_right: str | None = None
    prescription_sph_left: str | None = None
    prescription_cyl_left: str | None = None
    prescription_axis_left: str | None = None
    prescription_add: str | None = None
    prescription_date: date | None = None
    prescription_notes: str | None = None
    notes: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    # Denormalized
    first_visit_store_name: str | None = None

    model_config = {"from_attributes": True}


class CustomerListRead(BaseModel):
    """Lighter schema for list views (no prescription details)."""
    id: int
    admin_id: int
    first_name: str
    last_name: str | None = None
    email: str | None = None
    phone: str
    gender: CustomerGenderEnum
    city: str | None = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
