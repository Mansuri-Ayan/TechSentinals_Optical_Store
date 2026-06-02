# Schema: store.py
from datetime import datetime
from pydantic import BaseModel, Field


class StoreCreate(BaseModel):
    store_name: str = Field(
        ..., max_length=255, examples=["Visionary Optics - Andheri"],
        description="Display name of the store",
    )
    store_code: str = Field(
        ..., max_length=50, examples=["VO-AND-001"],
        description="Unique store identifier code",
    )
    email: str | None = Field(
        default=None, max_length=255, examples=["andheri@visionary.in"],
        description="Store contact email",
    )
    phone: str = Field(
        ..., min_length=10, max_length=10, examples=["9876543211"],
        description="Store contact phone (10 digits)",
    )
    address: str = Field(
        ..., examples=["Shop 12, Link Road, Andheri West"],
        description="Full store address",
    )
    city: str = Field(
        ..., max_length=100, examples=["Mumbai"],
        description="City name",
    )
    state: str = Field(
        ..., max_length=100, examples=["Maharashtra"],
        description="State name",
    )
    pincode: str = Field(
        ..., min_length=6, max_length=6, examples=["400058"],
        description="6-digit pincode",
    )
    gst_number: str | None = Field(
        default=None, max_length=15,
        description="Store-level GST registration number",
    )


class StoreUpdate(BaseModel):
    store_name: str | None = Field(default=None, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, min_length=10, max_length=10)
    address: str | None = Field(default=None)
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    pincode: str | None = Field(default=None, min_length=6, max_length=6)
    gst_number: str | None = Field(default=None, max_length=15)
    is_active: bool | None = Field(default=None)


class StoreRead(BaseModel):
    id: int
    admin_id: int
    store_name: str
    store_code: str
    email: str | None = None
    phone: str
    address: str
    city: str
    state: str
    pincode: str
    gst_number: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
