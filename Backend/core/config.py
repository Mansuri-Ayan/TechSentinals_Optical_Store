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

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()


# Export settings instance for easier access
settings = get_settings()
