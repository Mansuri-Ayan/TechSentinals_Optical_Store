# Schema: admin.py
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, EmailStr, Field


class AdminStatusEnum(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"


class AdminCreate(BaseModel):
    business_name: str = Field(
        ..., max_length=255, examples=["Visionary Optics"],
        description="Name of the optical store business",
    )
    owner_first_name: str = Field(
        ..., max_length=100, examples=["Ayan"],
        description="Owner's first name",
    )
    owner_last_name: str = Field(
        ..., max_length=100, examples=["Mansuri"],
        description="Owner's last name",
    )
    email: str = Field(
        ..., max_length=255, examples=["ayan@optical.store"],
        description="Unique email — used as login identifier",
    )
    phone: str = Field(
        ..., min_length=10, max_length=10, examples=["9876543210"],
        description="10-digit phone number",
    )
    password: str = Field(
        ..., min_length=6, examples=["Admin@123"],
        description="Plain-text password (will be hashed with bcrypt)",
    )
    profile_image: str | None = Field(
        default=None, description="URL or path to profile image",
    )
    gst_number: str | None = Field(
        default=None, max_length=15, description="GST registration number",
    )
    pan_number: str | None = Field(
        default=None, max_length=10, description="PAN card number",
    )
    address: str = Field(
        ..., examples=["123 MG Road"], description="Full address",
    )
    city: str = Field(
        ..., max_length=100, examples=["Mumbai"], description="City name",
    )
    state: str = Field(
        ..., max_length=100, examples=["Maharashtra"], description="State name",
    )
    pincode: str = Field(
        ..., min_length=6, max_length=6, examples=["400001"],
        description="6-digit pincode",
    )


class AdminUpdate(BaseModel):
    business_name: str | None = Field(default=None, max_length=255)
    owner_first_name: str | None = Field(default=None, max_length=100)
    owner_last_name: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, min_length=10, max_length=10)
    profile_image: str | None = Field(default=None)
    gst_number: str | None = Field(default=None, max_length=15)
    pan_number: str | None = Field(default=None, max_length=10)
    address: str | None = Field(default=None)
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    pincode: str | None = Field(default=None, min_length=6, max_length=6)
    status: AdminStatusEnum | None = Field(default=None)


class AdminRead(BaseModel):
    id: int
    business_name: str
    owner_first_name: str
    owner_last_name: str
    email: str
    phone: str
    profile_image: str | None = None
    gst_number: str | None = None
    pan_number: str | None = None
    address: str
    city: str
    state: str
    pincode: str
    is_email_verified: bool
    is_phone_verified: bool
    status: AdminStatusEnum
    last_login_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
