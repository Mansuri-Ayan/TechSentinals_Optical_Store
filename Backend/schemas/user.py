# Schema: user.py — kept only for login purposes
from pydantic import BaseModel, Field


class UserLogin(BaseModel):
    email: str = Field(
        ...,
        max_length=255,
        examples=["admin@optical.store"],
        description="The admin's registered email address",
    )
    password: str = Field(
        ...,
        min_length=6,
        examples=["Admin@123"],
        description="Plain-text password (will be verified against bcrypt hash)",
    )
