import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from models.global_role_permission import GlobalRolePermission
from models.permission import Permission

async def main():
    engine = create_async_engine("sqlite+aiosqlite:///D:/Dev/projects/active/TechSentinals_Optical_Store/Backend/optical_store.db")
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as db:
        stmt = select(GlobalRolePermission, Permission).join(Permission, GlobalRolePermission.permission_id == Permission.id).where(GlobalRolePermission.role_type == 'ADMIN')
        res = await db.execute(stmt)
        rows = res.all()
        print(f"Total admin global permissions: {len(rows)}")
        for grp, p in rows[:5]:
            print(f"Role: {grp.role_type}, Permission: {p.key}, Granted: {grp.is_granted}")

if __name__ == "__main__":
    asyncio.run(main())
