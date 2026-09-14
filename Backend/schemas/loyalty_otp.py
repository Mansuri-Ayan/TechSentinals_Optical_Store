from pydantic import BaseModel, Field


class LoyaltyOTPRequest(BaseModel):
    target_customer_id: int = Field(..., description="ID of customer whose points are being redeemed")
    points_to_redeem: int = Field(..., gt=0, description="Exact number of points to redeem")
    buyer_customer_id: int | None = Field(default=None, description="Optional ID of customer making purchase")
    store_id: int | None = Field(default=None, description="Optional store branch ID")


class LoyaltyOTPVerify(BaseModel):
    target_customer_id: int = Field(..., description="ID of customer whose points are being redeemed")
    points_to_redeem: int = Field(..., gt=0, description="Exact number of points to redeem")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit authorization code")


class LoyaltyOTPResponse(BaseModel):
    message: str
    email_masked: str
    expires_in_seconds: int
    already_verified: bool = False
    loyalty_verification_token: str | None = None


class LoyaltyOTPVerifyResponse(BaseModel):
    message: str
    loyalty_verification_token: str


class LoyaltyOTPStatusRequest(BaseModel):
    target_customer_id: int = Field(..., description="ID of customer whose points are being redeemed")
    points_to_redeem: int = Field(..., gt=0, description="Exact number of points to redeem")


class LoyaltyOTPStatusResponse(BaseModel):
    is_verified: bool
    loyalty_verification_token: str | None = None
    email_masked: str | None = None
    expires_in_seconds: int | None = None
