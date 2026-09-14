# API: apis/loyalty/otp.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from schemas.loyalty_otp import (
    LoyaltyOTPRequest,
    LoyaltyOTPVerify,
    LoyaltyOTPResponse,
    LoyaltyOTPVerifyResponse,
    LoyaltyOTPStatusRequest,
    LoyaltyOTPStatusResponse,
)
from services.loyalty_otp_service import (
    request_loyalty_otp,
    verify_loyalty_otp,
    check_loyalty_verification_status,
)

router = APIRouter()


@router.post(
    "/shopkeeper/loyalty/otp/send",
    response_model=LoyaltyOTPResponse,
    status_code=status.HTTP_200_OK,
    summary="Send OTP authorization code for loyalty points redemption (Shopkeeper)",
)
@router.post(
    "/admin/loyalty/otp/send",
    response_model=LoyaltyOTPResponse,
    status_code=status.HTTP_200_OK,
    summary="Send OTP authorization code for loyalty points redemption (Admin)",
)
@router.post(
    "/loyalty/otp/send",
    response_model=LoyaltyOTPResponse,
    status_code=status.HTTP_200_OK,
    summary="Send OTP authorization code for loyalty points redemption",
)
async def send_loyalty_otp_endpoint(
    payload: LoyaltyOTPRequest,
    db: AsyncSession = Depends(get_db),
) -> LoyaltyOTPResponse:
    res = await request_loyalty_otp(
        db,
        target_customer_id=payload.target_customer_id,
        points_to_redeem=payload.points_to_redeem,
        buyer_customer_id=payload.buyer_customer_id,
        store_id=payload.store_id,
    )
    return LoyaltyOTPResponse(**res)


@router.post(
    "/shopkeeper/loyalty/otp/verify",
    response_model=LoyaltyOTPVerifyResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify loyalty points redemption OTP code (Shopkeeper)",
)
@router.post(
    "/admin/loyalty/otp/verify",
    response_model=LoyaltyOTPVerifyResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify loyalty points redemption OTP code (Admin)",
)
@router.post(
    "/loyalty/otp/verify",
    response_model=LoyaltyOTPVerifyResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify loyalty points redemption OTP code",
)
async def verify_loyalty_otp_endpoint(
    payload: LoyaltyOTPVerify,
    db: AsyncSession = Depends(get_db),
) -> LoyaltyOTPVerifyResponse:
    token = await verify_loyalty_otp(
        db,
        target_customer_id=payload.target_customer_id,
        points_to_redeem=payload.points_to_redeem,
        otp_code=payload.otp,
    )
    return LoyaltyOTPVerifyResponse(
        message="Loyalty points redemption authorized successfully.",
        loyalty_verification_token=token,
    )


@router.post(
    "/shopkeeper/loyalty/otp/status",
    response_model=LoyaltyOTPStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Check loyalty points verification status (Shopkeeper)",
)
@router.post(
    "/admin/loyalty/otp/status",
    response_model=LoyaltyOTPStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Check loyalty points verification status (Admin)",
)
@router.post(
    "/loyalty/otp/status",
    response_model=LoyaltyOTPStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Check loyalty points verification status",
)
async def check_loyalty_otp_status_endpoint(
    payload: LoyaltyOTPStatusRequest,
    db: AsyncSession = Depends(get_db),
) -> LoyaltyOTPStatusResponse:
    res = await check_loyalty_verification_status(
        db,
        target_customer_id=payload.target_customer_id,
        points_to_redeem=payload.points_to_redeem,
    )
    return LoyaltyOTPStatusResponse(**res)
