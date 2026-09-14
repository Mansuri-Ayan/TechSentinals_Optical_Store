from pydantic import BaseModel, Field

try:
    from pydantic import EmailStr
except Exception:
    EmailStr = str


class OTPRequestPayload(BaseModel):
    email: EmailStr = Field(..., description="Email address to receive the verification code")
    force_new: bool = Field(default=False, description="Set True when explicitly clicking Resend OTP")


class OTPVerifyPayload(BaseModel):
    email: EmailStr = Field(..., description="Email address being verified")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")


class OTPResponse(BaseModel):
    message: str
    email: str
    expires_in_seconds: int
    cooldown_seconds: int = 0
    already_sent: bool = False


class OTPVerifyResponse(BaseModel):
    message: str
    verification_token: str


class OTPStatusPayload(BaseModel):
    email: EmailStr = Field(..., description="Email address to check active OTP status for")


class OTPStatusResponse(BaseModel):
    active: bool
    email: str
    expires_in_seconds: int = 0
    cooldown_seconds: int = 0
    attempts_left: int = 5
