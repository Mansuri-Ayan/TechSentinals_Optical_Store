import secrets
import hmac
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Tuple
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from jose import jwt, JWTError

from core.config import settings
from models.customer import Customer
from models.store import Store
from models.loyalty_config import LoyaltyConfig
from models.otp_verification import OTPVerification
from services.email_service import send_loyalty_otp_email
from services.queue_service import enqueue_background_job


def hash_loyalty_otp(target_customer_id: int, points_to_redeem: int, otp_code: str) -> str:
    """Generate secure HMAC-SHA256 digest bound specifically to target customer ID and points amount."""
    key = settings.JWT_SECRET_KEY.encode("utf-8")
    message = f"loyalty:{target_customer_id}:{points_to_redeem}:{otp_code.strip()}".encode("utf-8")
    return hmac.new(key, message, hashlib.sha256).hexdigest()


def mask_email(email: str) -> str:
    """Mask email address for privacy (e.g. ayan@gmail.com -> a***n@gmail.com)."""
    if not email or "@" not in email:
        return "hidden"
    parts = email.split("@")
    name = parts[0]
    domain = parts[1]
    if len(name) <= 2:
        masked_name = name[0] + "*"
    else:
        masked_name = name[0] + "*" * (len(name) - 2) + name[-1]
    return f"{masked_name}@{domain}"


def verify_loyalty_token(token: str | None, target_customer_id: int, points_to_redeem: int) -> bool:
    """Verify signed loyalty_verification_token matches customer ID and points amount."""
    if not token:
        return False
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if (
            payload.get("sub") == str(target_customer_id)
            and int(payload.get("pts")) == int(points_to_redeem)
            and payload.get("type") == "loyalty_otp_verified"
        ):
            return True
        return False
    except Exception:
        return False


async def check_loyalty_verification_status(
    db: AsyncSession,
    target_customer_id: int,
    points_to_redeem: int,
) -> dict:
    """Check if an active, verified, non-expired authorization exists for (target_customer_id, points_to_redeem)."""
    target_customer = await db.scalar(select(Customer).where(Customer.id == target_customer_id))
    if not target_customer or not target_customer.email:
        return {"is_verified": False}

    clean_email = target_customer.email.lower().strip()
    now = datetime.now(timezone.utc)

    # Query for an active OTP verification record that has a verification_token and has not expired or been used
    stmt = (
        select(OTPVerification)
        .where(
            OTPVerification.email == clean_email,
            OTPVerification.verification_token.isnot(None),
            OTPVerification.is_used.is_(False),
            OTPVerification.is_invalidated.is_(False),
            OTPVerification.expires_at > now,
        )
        .order_by(OTPVerification.id.desc())
    )
    otp_record = (await db.execute(stmt)).scalars().first()

    if not otp_record or not otp_record.verification_token:
        return {"is_verified": False}

    # Validate that token is valid and matches exact parameters
    if verify_loyalty_token(otp_record.verification_token, target_customer_id, points_to_redeem):
        remaining_secs = int((otp_record.expires_at - now).total_seconds())
        return {
            "is_verified": True,
            "loyalty_verification_token": otp_record.verification_token,
            "email_masked": mask_email(clean_email),
            "expires_in_seconds": max(0, remaining_secs),
        }

    return {"is_verified": False}


async def request_loyalty_otp(
    db: AsyncSession,
    target_customer_id: int,
    points_to_redeem: int,
    buyer_customer_id: int | None = None,
    store_id: int | None = None,
) -> dict:
    """Generate, securely hash, and enqueue loyalty points redemption OTP email."""
    if points_to_redeem <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Points to redeem must be greater than zero.",
        )

    # 1. Fetch Target Customer (Account Owner)
    target_customer = await db.scalar(select(Customer).where(Customer.id == target_customer_id))
    if not target_customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loyalty points account owner customer not found.",
        )

    clean_email = (target_customer.email or "").lower().strip()
    if not clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Customer {target_customer.first_name} does not have a registered email address. Cannot send loyalty redemption OTP.",
        )

    # 2. Check Loyalty Points Balance
    if target_customer.current_points < points_to_redeem:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient points balance. Customer has {target_customer.current_points} points, but {points_to_redeem} points were requested.",
        )

    # 3. Check if active verified token already exists for this exact request
    status_check = await check_loyalty_verification_status(db, target_customer_id, points_to_redeem)
    if status_check.get("is_verified"):
        return {
            "message": "Redemption request is already authorized and verified.",
            "email_masked": status_check["email_masked"],
            "expires_in_seconds": status_check["expires_in_seconds"],
            "already_verified": True,
            "loyalty_verification_token": status_check["loyalty_verification_token"],
        }

    # 4. Determine Requested By Name
    requested_by = "Optical Store Customer"
    if buyer_customer_id:
        buyer = await db.scalar(select(Customer).where(Customer.id == buyer_customer_id))
        if buyer:
            requested_by = f"{buyer.first_name} {buyer.last_name or ''}".strip()
    elif store_id:
        store = await db.scalar(select(Store).where(Store.id == store_id))
        if store:
            requested_by = store.store_name

    remaining_points = target_customer.current_points - points_to_redeem
    now = datetime.now(timezone.utc)

    # Note: 60-second resend cooldown is explicitly removed for loyalty points redemption per user rules!

    # 5. Rate Limit Check: Max resends per hour (5/hr)
    one_hour_ago = now - timedelta(hours=1)
    count_stmt = (
        select(func.count(OTPVerification.id))
        .where(
            OTPVerification.email == clean_email,
            OTPVerification.created_at >= one_hour_ago,
        )
    )
    resends_last_hour = (await db.execute(count_stmt)).scalar() or 0

    if resends_last_hour >= settings.OTP_MAX_RESENDS_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Maximum request limit ({settings.OTP_MAX_RESENDS_PER_HOUR} per hour) reached. Please try again later.",
        )

    # 6. Invalidate previous active unverified OTPs for this email
    await db.execute(
        update(OTPVerification)
        .where(
            OTPVerification.email == clean_email,
            OTPVerification.is_used.is_(False),
            OTPVerification.verification_token.is_(None)
        )
        .values(is_invalidated=True)
    )

    # 7. Generate 6-digit OTP code & HMAC Hash bound to parameters
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    hashed = hash_loyalty_otp(target_customer_id, points_to_redeem, otp_code)
    expires_at = now + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    new_otp = OTPVerification(
        email=clean_email,
        otp_hash=hashed,
        attempts=0,
        resend_count=resends_last_hour + 1,
        last_sent_at=now,
        expires_at=expires_at,
        is_used=False,
        is_invalidated=False,
    )
    db.add(new_otp)
    await db.commit()
    await db.refresh(new_otp)

    # 8. Enqueue background email job (Rupee Discount parameter completely removed!)
    recipient_name = f"{target_customer.first_name} {target_customer.last_name or ''}".strip()
    await enqueue_background_job(
        send_loyalty_otp_email,
        clean_email,
        recipient_name,
        points_to_redeem,
        remaining_points,
        requested_by,
        otp_code,
    )

    email_masked = mask_email(clean_email)
    return {
        "message": f"Authorization code sent to {email_masked}",
        "email_masked": email_masked,
        "expires_in_seconds": settings.OTP_EXPIRE_MINUTES * 60,
        "already_verified": False,
        "loyalty_verification_token": None,
    }


async def verify_loyalty_otp(
    db: AsyncSession,
    target_customer_id: int,
    points_to_redeem: int,
    otp_code: str,
) -> str:
    """Verify loyalty points redemption OTP code and return signed verification token."""
    target_customer = await db.scalar(select(Customer).where(Customer.id == target_customer_id))
    if not target_customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loyalty points account owner customer not found.",
        )

    clean_email = (target_customer.email or "").lower().strip()
    clean_code = otp_code.strip()
    now = datetime.now(timezone.utc)

    # Fetch latest non-used, non-invalidated OTP
    stmt = (
        select(OTPVerification)
        .where(
            OTPVerification.email == clean_email,
            OTPVerification.is_used.is_(False),
            OTPVerification.is_invalidated.is_(False),
        )
        .order_by(OTPVerification.id.desc())
    )
    otp_record = (await db.execute(stmt)).scalars().first()

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active verification code found. Please request a new code.",
        )

    # Check Expiry
    if now > otp_record.expires_at:
        otp_record.is_invalidated = True
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new code.",
        )

    # Check Attempt Limit
    if otp_record.attempts >= settings.OTP_MAX_ATTEMPTS:
        otp_record.is_invalidated = True
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum verification attempts exceeded. Please request a new code.",
        )

    # Compare Hash
    expected_hash = hash_loyalty_otp(target_customer_id, points_to_redeem, clean_code)
    if not hmac.compare_digest(otp_record.otp_hash, expected_hash):
        otp_record.attempts += 1
        if otp_record.attempts >= settings.OTP_MAX_ATTEMPTS:
            otp_record.is_invalidated = True
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum verification attempts exceeded. Please request a new code.",
            )

        await db.commit()
        remaining = settings.OTP_MAX_ATTEMPTS - otp_record.attempts
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid verification code. {remaining} attempt(s) remaining.",
        )

    # Issue signed verification token bound to customer_id and points_to_redeem
    payload = {
        "sub": str(target_customer_id),
        "pts": points_to_redeem,
        "type": "loyalty_otp_verified",
        "exp": otp_record.expires_at,  # Valid as long as the OTP itself has not expired!
    }
    loyalty_token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    # Persist verification_token on DB record so verification state is preserved across refresh/navigation
    otp_record.verification_token = loyalty_token
    await db.commit()

    return loyalty_token
