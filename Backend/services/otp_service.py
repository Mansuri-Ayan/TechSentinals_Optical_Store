import secrets
import hmac
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Tuple
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from jose import jwt, JWTError

from core.config import settings
from models.otp_verification import OTPVerification
from services.email_service import send_otp_email
from services.queue_service import enqueue_background_job


def hash_otp(email: str, otp_code: str) -> str:
    """Generate secure HMAC-SHA256 digest of OTP code salted with JWT secret key."""
    key = settings.JWT_SECRET_KEY.encode("utf-8")
    message = f"{email.lower().strip()}:{otp_code.strip()}".encode("utf-8")
    return hmac.new(key, message, hashlib.sha256).hexdigest()


async def get_active_otp_session(db: AsyncSession, email: str) -> dict | None:
    """Check if an active, non-expired, unverified OTP session exists for an email address."""
    clean_email = email.lower().strip()
    now = datetime.now(timezone.utc)

    stmt = (
        select(OTPVerification)
        .where(
            OTPVerification.email == clean_email,
            OTPVerification.is_used.is_(False),
            OTPVerification.is_invalidated.is_(False),
            OTPVerification.expires_at > now,
        )
        .order_by(OTPVerification.id.desc())
    )
    record = (await db.execute(stmt)).scalars().first()
    if not record:
        return None

    remaining_seconds = int((record.expires_at - now).total_seconds())
    cooldown_seconds = 0
    if (now - record.last_sent_at) < timedelta(seconds=settings.OTP_RESEND_COOLDOWN_SECONDS):
        cooldown_seconds = settings.OTP_RESEND_COOLDOWN_SECONDS - int((now - record.last_sent_at).total_seconds())

    return {
        "active": True,
        "email": clean_email,
        "expires_in_seconds": max(0, remaining_seconds),
        "cooldown_seconds": max(0, cooldown_seconds),
        "attempts_left": max(0, settings.OTP_MAX_ATTEMPTS - record.attempts),
    }


async def request_otp(db: AsyncSession, email: str, force_new: bool = False) -> dict:
    """Generate, securely hash, and enqueue OTP email with rate-limit guards."""
    clean_email = email.lower().strip()
    now = datetime.now(timezone.utc)

    # 1. Check if active valid OTP session already exists (if force_new is False)
    if not force_new:
        active_session = await get_active_otp_session(db, clean_email)
        if active_session:
            return {
                "message": "An active verification code is already sent to your email.",
                "email": clean_email,
                "expires_in_seconds": active_session["expires_in_seconds"],
                "cooldown_seconds": active_session["cooldown_seconds"],
                "already_sent": True,
            }

    # 2. Rate Limit Check A: 60-second resend cooldown
    latest_stmt = (
        select(OTPVerification)
        .where(OTPVerification.email == clean_email)
        .order_by(OTPVerification.id.desc())
    )
    latest_otp = (await db.execute(latest_stmt)).scalars().first()

    if latest_otp and (now - latest_otp.last_sent_at) < timedelta(seconds=settings.OTP_RESEND_COOLDOWN_SECONDS):
        remaining_seconds = settings.OTP_RESEND_COOLDOWN_SECONDS - int((now - latest_otp.last_sent_at).total_seconds())
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {remaining_seconds} seconds before requesting another code.",
        )

    # 3. Rate Limit Check B: Max resends per hour (5/hr)
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

    # 4. Invalidate previous active OTPs for this email
    await db.execute(
        update(OTPVerification)
        .where(OTPVerification.email == clean_email, OTPVerification.is_used.is_(False))
        .values(is_invalidated=True)
    )

    # 5. Generate 6-digit cryptographically secure OTP
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    hashed = hash_otp(clean_email, otp_code)
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

    # 6. Enqueue background email job
    await enqueue_background_job(send_otp_email, clean_email, otp_code)

    return {
        "message": "Verification code sent to your email.",
        "email": clean_email,
        "expires_in_seconds": settings.OTP_EXPIRE_MINUTES * 60,
        "cooldown_seconds": settings.OTP_RESEND_COOLDOWN_SECONDS,
        "already_sent": False,
    }


async def verify_otp(db: AsyncSession, email: str, otp_code: str) -> str:
    """Verify 6-digit OTP code, check attempts and expiry, and return signed token."""
    clean_email = email.lower().strip()
    clean_code = otp_code.strip()
    now = datetime.now(timezone.utc)

    # 1. Fetch latest active non-used, non-invalidated OTP
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

    # 2. Check Expiry
    if now > otp_record.expires_at:
        otp_record.is_invalidated = True
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new code.",
        )

    # 3. Check Attempt Limit before checking code
    if otp_record.attempts >= settings.OTP_MAX_ATTEMPTS:
        otp_record.is_invalidated = True
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum verification attempts exceeded. Please request a new code.",
        )

    # 4. Compare Hashed OTP
    expected_hash = hash_otp(clean_email, clean_code)
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

    # 5. Success: Mark OTP as used (single-use constraint)
    otp_record.is_used = True
    await db.commit()

    # 6. Issue short-lived verification token (15 mins)
    payload = {
        "sub": clean_email,
        "type": "otp_verified",
        "exp": now + timedelta(minutes=15),
    }
    verification_token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return verification_token


def verify_registration_token(token: str, email: str) -> bool:
    """Verify signed verification_token matches email and has not expired."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("sub") == email.lower().strip() and payload.get("type") == "otp_verified":
            return True
        return False
    except Exception:
        return False
