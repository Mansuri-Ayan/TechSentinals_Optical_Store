# Model: models/otp_verification.py
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from db.session import Base


class OTPVerification(Base):
    __tablename__ = "otp_verifications"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, index=True)
    otp_hash = Column(String(255), nullable=False)
    verification_token = Column(String(512), nullable=True)
    attempts = Column(Integer, default=0, nullable=False)
    resend_count = Column(Integer, default=1, nullable=False)
    last_sent_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    is_invalidated = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
