# Schema: prescription.py
"""
Pydantic schemas for Prescription CRUD.
"""
from datetime import date, datetime
from pydantic import BaseModel, Field


# ── Prescription ──────────────────────────────────────────────

class PrescriptionCreate(BaseModel):
    customer_id: int = Field(..., description="FK → customers.id")
    store_id: int | None = Field(default=None, description="FK → stores.id — where exam was done")
    optician_id: int | None = Field(default=None, description="FK → opticians.id — who examined")
    sph_right: str | None = Field(default=None, max_length=10)
    cyl_right: str | None = Field(default=None, max_length=10)
    axis_right: str | None = Field(default=None, max_length=10)
    sph_left: str | None = Field(default=None, max_length=10)
    cyl_left: str | None = Field(default=None, max_length=10)
    axis_left: str | None = Field(default=None, max_length=10)
    addition: str | None = Field(default=None, max_length=10)
    pupillary_distance: str | None = Field(default=None, max_length=10)
    prescription_date: date = Field(..., description="Date of the eye exam")
    notes: str | None = None


class PrescriptionUpdate(BaseModel):
    store_id: int | None = None
    optician_id: int | None = None
    sph_right: str | None = Field(default=None, max_length=10)
    cyl_right: str | None = Field(default=None, max_length=10)
    axis_right: str | None = Field(default=None, max_length=10)
    sph_left: str | None = Field(default=None, max_length=10)
    cyl_left: str | None = Field(default=None, max_length=10)
    axis_left: str | None = Field(default=None, max_length=10)
    addition: str | None = Field(default=None, max_length=10)
    pupillary_distance: str | None = Field(default=None, max_length=10)
    prescription_date: date | None = None
    notes: str | None = None
    is_active: bool | None = None


class PrescriptionRead(BaseModel):
    id: int
    customer_id: int
    store_id: int | None = None
    optician_id: int | None = None
    sph_right: str | None = None
    cyl_right: str | None = None
    axis_right: str | None = None
    sph_left: str | None = None
    cyl_left: str | None = None
    axis_left: str | None = None
    addition: str | None = None
    pupillary_distance: str | None = None
    prescription_date: date
    notes: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    # Denormalized
    customer_name: str | None = None
    store_name: str | None = None
    optician_name: str | None = None

    model_config = {"from_attributes": True}


class PrescriptionListRead(BaseModel):
    """Lighter schema for list views."""
    id: int
    customer_id: int
    store_id: int | None = None
    sph_right: str | None = None
    sph_left: str | None = None
    prescription_date: date
    is_active: bool
    created_at: datetime

    # Denormalized
    customer_name: str | None = None
    store_name: str | None = None
    optician_name: str | None = None

    model_config = {"from_attributes": True}
