# Main module: token.py
from datetime import datetime
from pydantic import BaseModel, Field

class TokenPair(BaseModel):
    access_token: str = Field(
        ...,
        description="Short-lived JWT for API authentication (default 30 min)",
    )
    refresh_token: str = Field(
        ...,
        description="Long-lived JWT for obtaining new access tokens (default 7 days)",
    )
    token_type: str = Field(
        default="bearer",
        description="Always 'bearer' — tells clients how to attach the token",
    )
class TokenRefreshRequest(BaseModel):
    refresh_token: str = Field(
        ...,
        description="The refresh JWT issued during login or previous refresh",
    )
    device_fingerprint: str | None = Field(
        default=None,
        max_length=64,
        description="Optional device/browser fingerprint for audit trailing",
    )
class TokenPayload(BaseModel):
    sub: str = Field(
        ...,
        description="Subject claim — the user_id as a string",
    )
    role: str = Field(
        ...,
        description="User's role at the time the token was issued",
    )
    type: str = Field(
        ...,
        description="Token type: 'access' or 'refresh'",
    )
    exp: datetime = Field(
        ...,
        description="Expiration timestamp (UTC)",
    )
