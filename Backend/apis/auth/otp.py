# API: auth/otp.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.session import get_db
from models.admin import Admin
from schemas.otp import (
    OTPRequestPayload,
    OTPVerifyPayload,
    OTPResponse,
    OTPVerifyResponse,
    OTPStatusPayload,
    OTPStatusResponse,
)
from services.otp_service import request_otp, verify_otp, get_active_otp_session

router = APIRouter()


@router.post(
    "/otp/send",
    response_model=OTPResponse,
    status_code=status.HTTP_200_OK,
    summary="Send OTP verification code to email",
    description="Generate, hash, and send a 6-digit verification code to email via background queue.",
)
async def send_otp_endpoint(
    payload: OTPRequestPayload,
    db: AsyncSession = Depends(get_db),
) -> OTPResponse:
    clean_email = payload.email.lower().strip()

    # Check if email is already registered to an existing active Admin
    stmt = select(Admin).where(Admin.email == clean_email)
    existing_admin = (await db.execute(stmt)).scalar_one_or_none()
    if existing_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is already registered to an existing admin account.",
        )

    res = await request_otp(db, clean_email, force_new=payload.force_new)
    return OTPResponse(**res)


@router.post(
    "/otp/verify",
    response_model=OTPVerifyResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify OTP verification code",
    description="Verify 6-digit OTP code and obtain signed verification token for Admin registration.",
)
async def verify_otp_endpoint(
    payload: OTPVerifyPayload,
    db: AsyncSession = Depends(get_db),
) -> OTPVerifyResponse:
    token = await verify_otp(db, payload.email, payload.otp)
    return OTPVerifyResponse(
        message="Email verified successfully.",
        verification_token=token,
    )


@router.post(
    "/otp/status",
    response_model=OTPStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Check active Admin OTP status",
    description="Check if an active, non-expired, unverified OTP session exists for an email address.",
)
async def check_otp_status_endpoint(
    payload: OTPStatusPayload,
    db: AsyncSession = Depends(get_db),
) -> OTPStatusResponse:
    clean_email = payload.email.lower().strip()
    active_session = await get_active_otp_session(db, clean_email)
    if active_session:
        return OTPStatusResponse(**active_session)
    return OTPStatusResponse(active=False, email=clean_email, expires_in_seconds=0, cooldown_seconds=0, attempts_left=5)
