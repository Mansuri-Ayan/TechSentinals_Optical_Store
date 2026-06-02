# Seed script: seed_data.py
# Seeds 5 admins, 5 stores, 5 workers, 5 opticians, 5 managers
import asyncio
import sys
from datetime import date
from pathlib import Path

_backend_dir = Path(__file__).resolve().parent.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import hash_password
from db.session import async_session_maker, engine
from models.admin import Admin
from models.store import Store
from models.worker import Worker
from models.optician import Optician
from models.manager import Manager
from models.role import Role

# ===============================================================
#  SEED DATA DEFINITIONS
# ===============================================================

ADMINS = [
    {
        "business_name": "Visionary Optics",
        "owner_first_name": "Ayan",
        "owner_last_name": "Mansuri",
        "email": "ayan@visionary.in",
        "phone": "9876543210",
        "password": "Admin@123",
        "gst_number": "27AADCB2230M1ZT",
        "pan_number": "AADCB2230M",
        "address": "123 MG Road, Andheri West",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400058",
    },
    {
        "business_name": "ClearSight Opticals",
        "owner_first_name": "Priya",
        "owner_last_name": "Sharma",
        "email": "priya@clearsight.in",
        "phone": "9876543211",
        "password": "Admin@123",
        "gst_number": "07ABCDE1234F1Z5",
        "pan_number": "ABCDE1234F",
        "address": "45 Connaught Place",
        "city": "New Delhi",
        "state": "Delhi",
        "pincode": "110001",
    },
    {
        "business_name": "LensCraft Studio",
        "owner_first_name": "Rohan",
        "owner_last_name": "Gupta",
        "email": "rohan@lenscraft.in",
        "phone": "9876543212",
        "password": "Admin@123",
        "gst_number": "29FGHIJ5678K1Z9",
        "pan_number": "FGHIJ5678K",
        "address": "78 Brigade Road",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560001",
    },
    {
        "business_name": "OptiCare Hub",
        "owner_first_name": "Sneha",
        "owner_last_name": "Patel",
        "email": "sneha@opticare.in",
        "phone": "9876543213",
        "password": "Admin@123",
        "gst_number": "24LMNOP9012Q1Z3",
        "pan_number": "LMNOP9012Q",
        "address": "12 SG Highway",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "pincode": "380015",
    },
    {
        "business_name": "EyeZone Express",
        "owner_first_name": "Vikram",
        "owner_last_name": "Singh",
        "email": "vikram@eyezone.in",
        "phone": "9876543214",
        "password": "Admin@123",
        "gst_number": "33RSTUV3456W1Z7",
        "pan_number": "RSTUV3456W",
        "address": "56 Anna Salai",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "pincode": "600002",
    },
]

# Each store maps by index to the admin above
STORES = [
    {
        "store_name": "Visionary Optics - Andheri",
        "store_code": "VO-AND-001",
        "email": "andheri@visionary.in",
        "phone": "2226543210",
        "address": "Shop 12, Link Road, Andheri West",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400058",
        "gst_number": "27AADCB2230M1ZT",
    },
    {
        "store_name": "ClearSight Opticals - CP",
        "store_code": "CS-CP-001",
        "email": "cp@clearsight.in",
        "phone": "1126543211",
        "address": "Block B, Connaught Place",
        "city": "New Delhi",
        "state": "Delhi",
        "pincode": "110001",
        "gst_number": "07ABCDE1234F1Z5",
    },
    {
        "store_name": "LensCraft Studio - Brigade",
        "store_code": "LC-BRG-001",
        "email": "brigade@lenscraft.in",
        "phone": "8026543212",
        "address": "Floor 2, Brigade Road",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560001",
        "gst_number": "29FGHIJ5678K1Z9",
    },
    {
        "store_name": "OptiCare Hub - SG Highway",
        "store_code": "OC-SGH-001",
        "email": "sghwy@opticare.in",
        "phone": "7926543213",
        "address": "Mall of Ahmedabad, SG Highway",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "pincode": "380015",
        "gst_number": "24LMNOP9012Q1Z3",
    },
    {
        "store_name": "EyeZone Express - Anna Salai",
        "store_code": "EZ-ANS-001",
        "email": "anna@eyezone.in",
        "phone": "4426543214",
        "address": "Ground Floor, 56 Anna Salai",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "pincode": "600002",
        "gst_number": "33RSTUV3456W1Z7",
    },
]

# Workers — each linked to store at same index
WORKERS = [
    {
        "first_name": "Rahul",
        "last_name": "Verma",
         "email": "rahul.verma@visionary.in",
        "phone": "9988776601",
        "password": "Worker@123",
        "employee_code": "WRK-VO-001",
        "joining_date": date(2025, 1, 15),
    },
    {
        "first_name": "Amit",
        "last_name": "Kumar",
        "email": "amit.kumar@clearsight.in",
        "phone": "9988776602",
        "password": "Worker@123",
        "employee_code": "WRK-CS-001",
        "joining_date": date(2025, 2, 1),
    },
    {
        "first_name": "Deepak",
        "last_name": "Nair",
        "email": "deepak.nair@lenscraft.in",
        "phone": "9988776603",
        "password": "Worker@123",
        "employee_code": "WRK-LC-001",
        "joining_date": date(2025, 3, 10),
    },
    {
        "first_name": "Suresh",
        "last_name": "Joshi",
        "email": "suresh.joshi@opticare.in",
        "phone": "9988776604",
        "password": "Worker@123",
        "employee_code": "WRK-OC-001",
        "joining_date": date(2025, 4, 5),
    },
    {
        "first_name": "Karthik",
        "last_name": "Rajan",
        "email": "karthik.rajan@eyezone.in",
        "phone": "9988776605",
        "password": "Worker@123",
        "employee_code": "WRK-EZ-001",
        "joining_date": date(2025, 5, 20),
    },
]

# Opticians — each linked to store at same index
OPTICIANS = [
    {
        "first_name": "Dr. Meera",
        "last_name": "Shah",
        "email": "meera.shah@visionary.in",
        "phone": "9900112201",
        "password": "Optician@123",
        "employee_code": "OPT-VO-001",
        "qualification": "B.Optom, M.Optom",
        "joining_date": date(2025, 1, 10),
    },
    {
        "first_name": "Dr. Ananya",
        "last_name": "Reddy",
        "email": "ananya.reddy@clearsight.in",
        "phone": "9900112202",
        "password": "Optician@123",
        "employee_code": "OPT-CS-001",
        "qualification": "B.Optom",
        "joining_date": date(2025, 2, 15),
    },
    {
        "first_name": "Dr. Sanjay",
        "last_name": "Menon",
        "email": "sanjay.menon@lenscraft.in",
        "phone": "9900112203",
        "password": "Optician@123",
        "employee_code": "OPT-LC-001",
        "qualification": "M.Optom, FIACLE",
        "joining_date": date(2025, 3, 1),
    },
    {
        "first_name": "Dr. Pooja",
        "last_name": "Desai",
        "email": "pooja.desai@opticare.in",
        "phone": "9900112204",
        "password": "Optician@123",
        "employee_code": "OPT-OC-001",
        "qualification": "B.Optom, CL Specialist",
        "joining_date": date(2025, 4, 1),
    },
    {
        "first_name": "Dr. Arvind",
        "last_name": "Pillai",
        "email": "arvind.pillai@eyezone.in",
        "phone": "9900112205",
        "password": "Optician@123",
        "employee_code": "OPT-EZ-001",
        "qualification": "M.Optom",
        "joining_date": date(2025, 5, 10),
    },
]

# Managers — each linked to store at same index
MANAGERS = [
    {
        "first_name": "Rajesh",
        "last_name": "Sharma",
        "email": "rajesh.sharma@visionary.in",
        "phone": "9812345601",
        "password": "Manager@123",
        "employee_code": "MGR-VO-001",
        "joining_date": date(2025, 1, 5),
    },
    {
        "first_name": "Vikram",
        "last_name": "Mehta",
        "email": "vikram.mehta@clearsight.in",
        "phone": "9812345602",
        "password": "Manager@123",
        "employee_code": "MGR-CS-001",
        "joining_date": date(2025, 2, 10),
    },
    {
        "first_name": "Sanjay",
        "last_name": "Dutt",
        "email": "sanjay.dutt@lenscraft.in",
        "phone": "9812345603",
        "password": "Manager@123",
        "employee_code": "MGR-LC-001",
        "joining_date": date(2025, 3, 5),
    },
    {
        "first_name": "Neha",
        "last_name": "Gupta",
        "email": "neha.gupta@opticare.in",
        "phone": "9812345604",
        "password": "Manager@123",
        "employee_code": "MGR-OC-001",
        "joining_date": date(2025, 4, 1),
    },
    {
        "first_name": "Arjun",
        "last_name": "Rao",
        "email": "arjun.rao@eyezone.in",
        "phone": "9812345605",
        "password": "Manager@123",
        "employee_code": "MGR-EZ-001",
        "joining_date": date(2025, 5, 5),
    },
]




# ===============================================================
#  SEED FUNCTIONS
# ===============================================================

async def seed() -> None:
    async with async_session_maker() as session:
        admin_ids: list[int] = []
        store_ids: list[int] = []

        # ── 0. Seed roles ──────────────────────────────────────
        print("\n" + "=" * 60)
        print("  Seeding Roles")
        print("=" * 60)
        role_map = {}
        for role_name in ["admin", "manager", "worker", "optician"]:
            stmt = select(Role).where(Role.role == role_name)
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            if existing:
                role_map[role_name] = existing.id
                print(f"  [SKIP] Role '{role_name}' (already exists, id={existing.id})")
                continue

            new_role = Role(role=role_name)
            session.add(new_role)
            await session.flush()
            role_map[role_name] = new_role.id
            print(f"  [OK]   Role '{role_name}' -> id={new_role.id}")

        # ── 1. Seed admins ─────────────────────────────────────
        print("\n" + "=" * 60)
        print("  Seeding Admins")
        print("=" * 60)
        for data in ADMINS:
            stmt = select(Admin).where(Admin.email == data["email"])
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            if existing:
                admin_ids.append(existing.id)
                print(f"  [SKIP] {data['email']} (already exists, id={existing.id})")
                continue

            admin = Admin(
                role_id=role_map["admin"],
                business_name=data["business_name"],
                owner_first_name=data["owner_first_name"],
                owner_last_name=data["owner_last_name"],
                email=data["email"],
                phone=data["phone"],
                password_hash=hash_password(data["password"]),
                gst_number=data.get("gst_number"),
                pan_number=data.get("pan_number"),
                address=data["address"],
                city=data["city"],
                state=data["state"],
                pincode=data["pincode"],
            )
            session.add(admin)
            await session.flush()
            admin_ids.append(admin.id)
            print(f"  [OK]   {data['email']} -> id={admin.id}")

        # ── 2. Seed stores ─────────────────────────────────────
        print("\n" + "=" * 60)
        print("  Seeding Stores")
        print("=" * 60)
        for i, data in enumerate(STORES):
            stmt = select(Store).where(Store.store_code == data["store_code"])
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            if existing:
                store_ids.append(existing.id)
                print(f"  [SKIP] {data['store_code']} (already exists, id={existing.id})")
                continue

            store = Store(
                admin_id=admin_ids[i],
                store_name=data["store_name"],
                store_code=data["store_code"],
                email=data.get("email"),
                phone=data["phone"],
                address=data["address"],
                city=data["city"],
                state=data["state"],
                pincode=data["pincode"],
                gst_number=data.get("gst_number"),
            )
            session.add(store)
            await session.flush()
            store_ids.append(store.id)
            print(f"  [OK]   {data['store_code']} -> id={store.id}")

        # ── 3. Seed workers ────────────────────────────────────
        print("\n" + "=" * 60)
        print("  Seeding Workers")
        print("=" * 60)
        for i, data in enumerate(WORKERS):
            stmt = select(Worker).where(Worker.employee_code == data["employee_code"])
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            if existing:
                print(f"  [SKIP] {data['employee_code']} (already exists)")
                continue

            worker = Worker(
                store_id=store_ids[i],
                role_id=role_map["worker"],
                first_name=data["first_name"],
                last_name=data["last_name"],
                email=data.get("email"),
                phone=data["phone"],
                password_hash=hash_password(data["password"]),
                employee_code=data["employee_code"],
                joining_date=data["joining_date"],
            )
            session.add(worker)
            print(f"  [OK]   {data['employee_code']} -> {data['first_name']} {data['last_name']}")

        # ── 4. Seed opticians ──────────────────────────────────
        print("\n" + "=" * 60)
        print("  Seeding Opticians")
        print("=" * 60)
        for i, data in enumerate(OPTICIANS):
            stmt = select(Optician).where(Optician.employee_code == data["employee_code"])
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            if existing:
                print(f"  [SKIP] {data['employee_code']} (already exists)")
                continue

            optician = Optician(
                store_id=store_ids[i],
                role_id=role_map["optician"],
                first_name=data["first_name"],
                last_name=data["last_name"],
                email=data.get("email"),
                phone=data["phone"],
                password_hash=hash_password(data["password"]),
                employee_code=data["employee_code"],
                qualification=data.get("qualification"),
                joining_date=data["joining_date"],
            )
            session.add(optician)
            print(f"  [OK]   {data['employee_code']} -> {data['first_name']} {data['last_name']}")

        # ── 5. Seed managers ──────────────────────────────────
        print("\n" + "=" * 60)
        print("  Seeding Managers")
        print("=" * 60)
        for i, data in enumerate(MANAGERS):
            stmt = select(Manager).where(Manager.employee_code == data["employee_code"])
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            if existing:
                print(f"  [SKIP] {data['employee_code']} (already exists)")
                continue

            manager = Manager(
                store_id=store_ids[i],
                role_id=role_map["manager"],
                first_name=data["first_name"],
                last_name=data["last_name"],
                email=data.get("email"),
                phone=data["phone"],
                password_hash=hash_password(data["password"]),
                employee_code=data["employee_code"],
                joining_date=data["joining_date"],
            )
            session.add(manager)
            print(f"  [OK]   {data['employee_code']} -> {data['first_name']} {data['last_name']}")

        await session.commit()

    print("\n" + "=" * 60)
    print("  [DONE] Seed completed successfully!")
    print("=" * 60)
    print()
    print("  Login credentials for all admins:")
    print(f"  {'Email':<30} {'Password':<15}")
    print(f"  {'-' * 30} {'-' * 15}")
    for a in ADMINS:
        print(f"  {a['email']:<30} {a['password']:<15}")
    print()


async def main() -> None:
    try:
        await seed()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
