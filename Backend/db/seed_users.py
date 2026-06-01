# Main module: seed_users.py
import asyncio
import sys
from pathlib import Path
_backend_dir = Path(__file__).resolve().parent.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from core.security import hash_password
from db.session import async_session_maker, engine
from models.user import User

DUMMY_USERS = [
    {
        "full_name": "Admin User",
        "email": "admin@optical.store",
        "password": "Admin@123",
        "role": "admin",
    },
    {
        "full_name": "Cashier User",
        "email": "cashier@optical.store",
        "password": "Cashier@123",
        "role": "cashier",
    },
    {
        "full_name": "Dr. Optometrist",
        "email": "optom@optical.store",
        "password": "Optom@123",
        "role": "optometrist",
    },
    {
        "full_name": "Store Manager",
        "email": "manager@optical.store",
        "password": "Manager@123",
        "role": "manager",
    },
]
async def seed() -> None:
    async with async_session_maker() as session:                      
        inserted = []                                      
        skipped = []                                    
        for user_data in DUMMY_USERS:
            stmt = select(User).where(User.email == user_data["email"])
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            if existing is not None:
                skipped.append(user_data["email"])
                continue
            hashed = hash_password(user_data["password"])
            new_user = User(
                full_name=user_data["full_name"],
                email=user_data["email"],
                password_hash=hashed,
                role=user_data["role"],
                is_active=True,                                      
                store_id=None,                                
            )
            session.add(new_user)
            inserted.append(user_data)
        await session.commit()
    print("")
    print("=" * 60)
    print("  TechSentinals Optical Store - Seed Users")
    print("=" * 60)
    print("")
    if inserted:
        print(f"  [OK] Inserted {len(inserted)} user(s):")
        print("")
        print(f"  {'Email':<30} {'Role':<15} {'Password'}")
        print(f"  {'-' * 30} {'-' * 15} {'-' * 15}")
        for u in inserted:
            print(f"  {u['email']:<30} {u['role']:<15} {u['password']}")
    else:
        print("  [INFO] No new users inserted.")
        print("")
    if skipped:
        print(f"  [SKIP] Skipped {len(skipped)} existing user(s):")
        for email in skipped:
            print(f"     - {email}")
    print("")
    print("=" * 60)
    print("")
async def main() -> None:
    try:
        await seed()
    finally:
        await engine.dispose()
if __name__ == "__main__":
    asyncio.run(main())
