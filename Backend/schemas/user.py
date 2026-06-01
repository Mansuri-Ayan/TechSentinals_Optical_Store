# Main module: user.py
from datetime import datetime
from enum import Enum
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field
class UserRole(str, Enum):
    admin = "admin"
    cashier = "cashier"
    optometrist = "optometrist"
    manager = "manager"
class UserLogin(BaseModel):
    email: str = Field(
        ...,
        max_length=150,
        examples=["admin@optical.store"],
        description="The user's registered email address",
    )
    password: str = Field(
        ...,
        min_length=6,
        examples=["Admin@123"],
        description="Plain-text password (will be verified against bcrypt hash)",
    )
class UserCreate(BaseModel):
    full_name: str = Field(
        ...,
        max_length=100,
        examples=["Ayan Mansuri"],
        description="Staff member's full name",
    )
    email: str = Field(
        ...,
        max_length=150,
        examples=["ayan@optical.store"],
        description="Unique email used as login identifier",
    )
    password: str = Field(
        ...,
        min_length=6,
        examples=["Secure@456"],
        description="Plain-text password (will be hashed with bcrypt cost=12)",
    )
    role: UserRole = Field(
        ...,
        examples=["cashier"],
        description="Staff role — must be one of: admin, cashier, optometrist, manager",
    )
    store_id: UUID | None = Field(
        default=None,
        description="Optional store assignment (FK added when stores table exists)",
    )
class UserRead(BaseModel):
    user_id: UUID
    full_name: str
    email: str
    role: UserRole
    is_active: bool
    store_id: UUID | None = None
    created_at: datetime
    last_login_at: datetime | None = None
    model_config = {"from_attributes": True}
