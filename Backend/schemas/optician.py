from datetime import date, datetime
from typing import Any
from pydantic import BaseModel, Field, computed_field


class OpticianCreate(BaseModel):
    first_name: str = Field(
        ..., max_length=100, examples=["Priya"],
        description="Optician's first name",
    )
    last_name: str = Field(
        ..., max_length=100, examples=["Patel"],
        description="Optician's last name",
    )
    email: str | None = Field(
        default=None, max_length=255, examples=["priya@optical.store"],
        description="Optician's email (optional but unique if provided)",
    )
    phone: str = Field(
        ..., min_length=10, max_length=10, examples=["9900112233"],
        description="10-digit phone number",
    )
    password: str = Field(
        ..., min_length=6, examples=["Optician@123"],
        description="Plain-text password (will be hashed with bcrypt)",
    )
    employee_code: str | None = Field(
        default=None, max_length=50, examples=["OPT-1"],
        description="Unique employee identifier code. Automatically generated if omitted.",
    )
    qualification: str | None = Field(
        default=None, max_length=255, examples=["B.Optom"],
        description="Professional qualification",
    )
    joining_date: date = Field(
        ..., examples=["2025-03-01"],
        description="Date the optician joined",
    )


class OpticianUpdate(BaseModel):
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, min_length=10, max_length=10)
    profile_image: str | None = Field(default=None)
    qualification: str | None = Field(default=None, max_length=255)
    is_active: bool | None = Field(default=None)


class OpticianRead(BaseModel):
    id: int
    store_id: int
    first_name: str
    last_name: str
    email: str | None = None
    phone: str
    profile_image: str | None = None
    employee_code: str
    qualification: str | None = None
    joining_date: date
    is_active: bool
    last_login_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    # Internal fields for extracting data from relationships
    role_obj: Any = Field(alias="role", exclude=True, default=None)
    store_obj: Any = Field(alias="store", exclude=True, default=None)

    @computed_field
    @property
    def role(self) -> str | None:
        return self.role_obj.role if self.role_obj else None

    @computed_field
    @property
    def store_name(self) -> str | None:
        return self.store_obj.store_name if self.store_obj else None

    model_config = {"from_attributes": True}
