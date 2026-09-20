# Schema: admin.py
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, EmailStr, Field, model_validator


class AdminStatusEnum(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"


class AdminCreate(BaseModel):
    business_name: str | None = Field(
        default=None, max_length=255, examples=["Visionary Optics"],
        description="Name of the optical store business",
    )
    owner_first_name: str | None = Field(
        default=None, max_length=100, examples=["Ayan"],
        description="Owner's first name",
    )
    owner_last_name: str | None = Field(
        default=None, max_length=100, examples=["Mansuri"],
        description="Owner's last name",
    )
    full_name: str | None = Field(
        default=None, description="Owner's full name alias",
    )
    store_name: str | None = Field(
        default=None, description="Initial store branch name alias",
    )
    store_code: str | None = Field(
        default=None, description="Initial store branch code alias",
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
        default="Main Address", examples=["123 MG Road"], description="Full address",
    )
    city: str = Field(
        default="Main City", max_length=100, examples=["Mumbai"], description="City name",
    )
    state: str = Field(
        default="State", max_length=100, examples=["Maharashtra"], description="State name",
    )
    pincode: str = Field(
        default="000000", min_length=6, max_length=6, examples=["400001"],
        description="6-digit pincode",
    )
    verification_token: str | None = Field(
        default=None, description="Signed OTP verification token obtained from /auth/otp/verify"
    )

    @model_validator(mode="before")
    @classmethod
    def preprocess_admin_create(cls, values: dict) -> dict:
        if not isinstance(values, dict):
            return values

        # 1. Resolve business_name vs store_name
        if not values.get("business_name"):
            values["business_name"] = values.get("store_name") or "Optical Store Business"

        # 2. Resolve owner_first_name / owner_last_name vs full_name
        full_name = values.get("full_name")
        first_name = values.get("owner_first_name")
        last_name = values.get("owner_last_name")

        if (not first_name or not last_name) and full_name:
            parts = str(full_name).strip().split(maxsplit=1)
            values["owner_first_name"] = parts[0] if parts else "Admin"
            values["owner_last_name"] = parts[1] if len(parts) > 1 else "Owner"
        else:
            if not values.get("owner_first_name"):
                values["owner_first_name"] = "Admin"
            if not values.get("owner_last_name"):
                values["owner_last_name"] = "Owner"

        # 3. Resolve address, city, state, pincode defaults
        if not values.get("address"):
            values["address"] = "Main Address"
        if not values.get("city"):
            values["city"] = "Main City"
        if not values.get("state"):
            values["state"] = "State"
        pincode = values.get("pincode")
        if not pincode or len(str(pincode)) != 6:
            values["pincode"] = "000000"

        return values


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


class AdminWarehouseToggle(BaseModel):
    warehouse_enabled: bool


class DisableWarehouseRequest(BaseModel):
    target_store_id: int = Field(
        ..., description="Store to transfer all warehouse stock to"
    )


class WarehouseInfo(BaseModel):
    warehouse_enabled: bool
    owner_type: str
    owner_id: int
    store_id: int | None = None
    label: str
    is_dedicated_warehouse: bool
