import asyncio
from db.session import get_db_session
from models.global_role_permission import GlobalRolePermission
from models.permission import Permission
from sqlalchemy import select, func

async def count_rows():
    async for db in get_db_session():
        stmt = select(func.count(GlobalRolePermission.id))
        count = (await db.execute(stmt)).scalar()
        
        stmt_p = select(func.count(Permission.id))
        count_p = (await db.execute(stmt_p)).scalar()
        print(f"Total Permissions: {count_p}")
        print(f"Total GlobalRolePermissions: {count}")
        break

if __name__ == "__main__":
    asyncio.run(count_rows())
