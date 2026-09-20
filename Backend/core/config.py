# Core module: config.py
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Cookie configuration ───────────────────────────────────
    COOKIE_DOMAIN: str | None = None          # None = current domain
    COOKIE_SECURE: bool = False               # True in production (HTTPS)
    COOKIE_SAMESITE: str = "lax"              # "lax", "strict", or "none"
    COOKIE_HTTPONLY: bool = True               # Prevent JS access

    # ── Email & Gmail OAuth2 configuration ─────────────────────
    GMAIL_CLIENT_ID: str = ""
    GMAIL_CLIENT_SECRET: str = ""
    GMAIL_REFRESH_TOKEN: str = ""
    GMAIL_USER: str = ""

    # ── OTP Verification configuration ─────────────────────────
    OTP_LENGTH: int = 6
    OTP_EXPIRE_MINUTES: int = 10
    OTP_MAX_ATTEMPTS: int = 5
    OTP_RESEND_COOLDOWN_SECONDS: int = 60
    OTP_MAX_RESENDS_PER_HOUR: int = 5

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()


# Export settings instance for easier access
settings = get_settings()
