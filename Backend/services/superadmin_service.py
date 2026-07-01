# Service: superadmin_service.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.superadmin import SuperAdmin

async def get_superadmin_by_email(db: AsyncSession, email: str) -> SuperAdmin | None:
    stmt = select(SuperAdmin).where(SuperAdmin.email == email)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()
