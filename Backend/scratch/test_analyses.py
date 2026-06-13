import asyncio
import sys
import os

# Add parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.session import async_session_maker
from services.report_service import get_analyses_report
from sqlalchemy import select
from models.admin import Admin

async def test():
    async with async_session_maker() as db:
        # Get first admin
        stmt = select(Admin)
        result = await db.execute(stmt)
        admin = result.scalars().first()
        if not admin:
            print("No admin found in database")
            return
        
        print(f"Testing analyses report for admin {admin.email} (ID: {admin.id})...")
        try:
            report = await get_analyses_report(db, admin_id=admin.id, date_range="This Year")
            print("Report generated successfully!")
            print("KPIs:", report.kpis)
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
