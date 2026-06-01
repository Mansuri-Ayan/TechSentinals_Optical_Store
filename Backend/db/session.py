# Main module: session.py
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from core.config import get_settings
settings = get_settings()
engine = create_async_engine(settings.DATABASE_URL,echo=False,pool_pre_ping=True,)
async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)
class Base(DeclarativeBase):
    pass
async def get_db():
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
