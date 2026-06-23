"""
seed_data.py — Populate the database with realistic sample data.
Seeds 40+ records for all major tables related to the optical industry.
Uses the correct expected admin, store, and staff credentials.
"""
import asyncio
import hashlib
import sys
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

_backend_dir = Path(__file__).resolve().parent.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from db.session import async_session_maker, engine, Base
from core.security import hash_password

# ── Explicit imports of all models ────────────────────────────
from models.role import Role
from models.admin import Admin, AdminStatus
from models.refresh_token import RefreshToken
from models.store import Store
from models.manager import Manager
from models.worker import Worker
from models.optician import Optician
from models.brand import Brand
from models.category import Category
from models.subcategory import Subcategory
from models.product import Product
from models.frame_product import FrameProduct
from models.lens_product import LensProduct
from models.accessory_product import AccessoryProduct
from models.inventory import Inventory, OwnerType
from models.supplier import Supplier, SupplierStatus
from models.supplier_store_link import SupplierStoreLink
from models.supplier_product import SupplierProduct
from models.purchase_order import PurchaseOrder, POStatus
from models.purchase_order_item import PurchaseOrderItem
from models.supplier_payment import SupplierPayment, SupplierPaymentMethod
from models.customer import Customer, CustomerGender
from models.prescription import Prescription
from models.sale import Sale, SaleStatus, StaffType
from models.sale_item import SaleItem
from models.sale_payment import SalePayment, SalePaymentMethod
from models.inventory_transaction import InventoryTransaction, TransactionType
from models.expense_category import ExpenseCategory
from models.expense import Expense, ExpenseOwnerType, ExpensePaymentMethod, ExpenseRecordedByType
from models.repair import Repair, RepairType, RepairStatus, RepairStaffType
from models.notification import Notification, NotificationType


async def seed():
    async with async_session_maker() as db:
        # Clear existing data to avoid unique constraint violations
        from sqlalchemy import delete
        print("Clearing existing tables...")
        for table in reversed(Base.metadata.sorted_tables):
            await db.execute(delete(table))
        await db.commit()

        # ──────────────────────────────────────────────────────
        # 1. ROLES (5)
        # ──────────────────────────────────────────────────────
        print("Seeding Roles...")
        roles_data = ["admin", "manager", "worker", "optician", "receptionist"]
        roles = []
        for r in roles_data:
            role = Role(role=r)
            db.add(role)
            roles.append(role)
        await db.flush()
        role_map = {r.role: r for r in roles}

        # ──────────────────────────────────────────────────────
        # 2. ADMINS (5) - Expected credentials restored
        # ──────────────────────────────────────────────────────
        print("Seeding Admins...")
        admins_data = [
            ("Visionary Optics", "Ayan", "Mansuri", "ayan@visionary.in", "9876543210", "27AADCB2230M1ZT", "AADCB2230M", "123 MG Road, Andheri West", "Mumbai", "Maharashtra", "400058"),
            ("ClearSight Opticals", "Priya", "Sharma", "priya@clearsight.in", "9876543211", "07ABCDE1234F1Z5", "ABCDE1234F", "45 Connaught Place", "New Delhi", "Delhi", "110001"),
            ("LensCraft Studio", "Rohan", "Gupta", "rohan@lenscraft.in", "9876543212", "29FGHIJ5678K1Z9", "FGHIJ5678K", "78 Brigade Road", "Bengaluru", "Karnataka", "560001"),
            ("OptiCare Hub", "Sneha", "Patel", "sneha@opticare.in", "9876543213", "24LMNOP9012Q1Z3", "LMNOP9012Q", "12 SG Highway", "Ahmedabad", "Gujarat", "380015"),
            ("EyeZone Express", "Vikram", "Singh", "vikram@eyezone.in", "9876543214", "33RSTUV3456W1Z7", "RSTUV3456W", "56 Anna Salai", "Chennai", "Tamil Nadu", "600002"),
        ]
        admins = []
        for bus, fn, ln, em, ph, gst, pan, addr, city, state, pin in admins_data:
            adm = Admin(
                business_name=bus,
                owner_first_name=fn,
                owner_last_name=ln,
                email=em,
                phone=ph,
                password_hash=hash_password("Admin@123"), # Expected password
                gst_number=gst,
                pan_number=pan,
                address=addr,
                city=city,
                state=state,
                pincode=pin,
                role_id=role_map["admin"].id,
                status=AdminStatus.ACTIVE,
            )
            db.add(adm)
            admins.append(adm)
        await db.flush()
        admin = admins[0]

        # ──────────────────────────────────────────────────────
        # 2b. REFRESH TOKENS (5)
        # ──────────────────────────────────────────────────────
        print("Seeding Refresh Tokens...")
        for i in range(5):
            h = hashlib.sha256(f"token_{i}".encode()).hexdigest()
            rt = RefreshToken(
                admin_id=admins[i].id,
                token_hash=h,
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
                device_fingerprint=f"fingerprint_{i}"
            )
            db.add(rt)
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 3. STORES (5) - Expected stores restored
        # ──────────────────────────────────────────────────────
        print("Seeding Stores...")
        stores_data = [
            ("Visionary Optics - Andheri", "VO-AND-001", "2226543210", "Shop 12, Link Road, Andheri West", "Mumbai", "Maharashtra", "400058", "27AADCB2230M1ZT"),
            ("ClearSight Opticals - CP", "CS-CP-001", "1126543211", "Block B, Connaught Place", "New Delhi", "Delhi", "110001", "07ABCDE1234F1Z5"),
            ("LensCraft Studio - Brigade", "LC-BRG-001", "8026543212", "Floor 2, Brigade Road", "Bengaluru", "Karnataka", "560001", "29FGHIJ5678K1Z9"),
            ("OptiCare Hub - SG Highway", "OC-SGH-001", "7926543213", "Mall of Ahmedabad, SG Highway", "Ahmedabad", "Gujarat", "380015", "24LMNOP9012Q1Z3"),
            ("EyeZone Express - Anna Salai", "EZ-ANS-001", "4426543214", "Ground Floor, 56 Anna Salai", "Chennai", "Tamil Nadu", "600002", "33RSTUV3456W1Z7"),
        ]
        stores = []
        for name, code, phone, addr, city, state, pin, gst in stores_data:
            s = Store(
                admin_id=admin.id, store_name=name, store_code=code,
                phone=phone, address=addr, city=city, state=state, pincode=pin,
            )
            db.add(s)
            stores.append(s)
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 4. MANAGERS (5) - Expected credentials restored
        # ──────────────────────────────────────────────────────
        print("Seeding Managers...")
        managers_data = [
            ("Rajesh", "Sharma", "rajesh.sharma@visionary.in", "9812345601", "MGR-VO-001", date(2025, 1, 5)),
            ("Vikram", "Mehta", "vikram.mehta@clearsight.in", "9812345602", "MGR-CS-001", date(2025, 2, 10)),
            ("Sanjay", "Dutt", "sanjay.dutt@lenscraft.in", "9812345603", "MGR-LC-001", date(2025, 3, 5)),
            ("Neha", "Gupta", "neha.gupta@opticare.in", "9812345604", "MGR-OC-001", date(2025, 4, 1)),
            ("Arjun", "Rao", "arjun.rao@eyezone.in", "9812345605", "MGR-EZ-001", date(2025, 5, 5)),
        ]
        managers = []
        mgr_pwd = hash_password("Manager@123")
        for i, (fn, ln, em, ph, ec, jd) in enumerate(managers_data):
            m = Manager(
                store_id=stores[i].id, role_id=role_map["manager"].id,
                first_name=fn, last_name=ln, email=em, phone=ph,
                password_hash=mgr_pwd, employee_code=ec,
                joining_date=jd,
            )
            db.add(m)
            managers.append(m)
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 5. WORKERS (5) - Expected credentials restored
        # ──────────────────────────────────────────────────────
        print("Seeding Workers...")
        workers_data = [
            ("Rahul", "Verma", "rahul.verma@visionary.in", "9988776601", "WRK-VO-001", date(2025, 1, 15)),
            ("Amit", "Kumar", "amit.kumar@clearsight.in", "9988776602", "WRK-CS-001", date(2025, 2, 1)),
            ("Deepak", "Nair", "deepak.nair@lenscraft.in", "9988776603", "WRK-LC-001", date(2025, 3, 10)),
            ("Suresh", "Joshi", "suresh.joshi@opticare.in", "9988776604", "WRK-OC-001", date(2025, 4, 5)),
            ("Karthik", "Rajan", "karthik.rajan@eyezone.in", "9988776605", "WRK-EZ-001", date(2025, 5, 20)),
        ]
        workers = []
        wrk_pwd = hash_password("Worker@123")
        for i, (fn, ln, em, ph, ec, jd) in enumerate(workers_data):
            w = Worker(
                store_id=stores[i].id, role_id=role_map["worker"].id,
                first_name=fn, last_name=ln, email=em, phone=ph,
                password_hash=wrk_pwd, employee_code=ec,
                joining_date=jd,
            )
            db.add(w)
            workers.append(w)
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 6. OPTICIANS (5) - Expected credentials restored
        # ──────────────────────────────────────────────────────
        print("Seeding Opticians...")
        opticians_data = [
            ("Dr. Meera", "Shah", "meera.shah@visionary.in", "9900112201", "OPT-VO-001", "B.Optom, M.Optom", date(2025, 1, 10)),
            ("Dr. Ananya", "Reddy", "ananya.reddy@clearsight.in", "9900112202", "OPT-CS-001", "B.Optom", date(2025, 2, 15)),
            ("Dr. Sanjay", "Menon", "sanjay.menon@lenscraft.in", "9900112203", "OPT-LC-001", "M.Optom, FIACLE", date(2025, 3, 1)),
            ("Dr. Pooja", "Desai", "pooja.desai@opticare.in", "9900112204", "OPT-OC-001", "B.Optom, CL Specialist", date(2025, 4, 1)),
            ("Dr. Arvind", "Pillai", "arvind.pillai@eyezone.in", "9900112205", "OPT-EZ-001", "M.Optom", date(2025, 5, 10)),
        ]
        opticians = []
        opt_pwd = hash_password("Optician@123")
        for i, (fn, ln, em, ph, ec, lic, jd) in enumerate(opticians_data):
            o = Optician(
                store_id=stores[i].id, role_id=role_map["optician"].id,
                first_name=fn, last_name=ln, email=em, phone=ph,
                password_hash=opt_pwd, employee_code=ec,
                qualification=lic, joining_date=jd,
            )
            db.add(o)
            opticians.append(o)
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 7. BRANDS (40)
        # ──────────────────────────────────────────────────────
        print("Seeding Brands...")
        brands_data = [
            "Ray-Ban", "Oakley", "Prada Eyewear", "Gucci Eyewear", "Tom Ford",
            "Carrera", "Polaroid", "Vogue Eyewear", "Silhouette", "Persol",
            "Maui Jim", "Armani Exchange", "Emporio Armani", "Michael Kors", "Dolce & Gabbana",
            "Marc Jacobs", "Hugo Boss", "Police Eyewear", "Essilor", "Zeiss",
            "Hoya", "Rodenstock", "Nikon Lenswear", "Seiko Optical", "Crizal",
            "Varilux", "Shamir Lenses", "Kodak Lens", "Alcon", "Bausch + Lomb",
            "CooperVision", "Acuvue", "Titan Eyeplus", "Lenskart Air", "Vincent Chase",
            "John Jacobs", "Fastrack Eyewear", "Tommy Hilfiger Eyewear", "Calvin Klein Eyewear", "Lacoste Eyewear"
        ]
        brands = []
        for b in brands_data:
            brand = Brand(admin_id=admin.id, name=b)
            db.add(brand)
            brands.append(brand)
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 8. CATEGORIES (5) + SUBCATEGORIES (40)
        # ──────────────────────────────────────────────────────
        print("Seeding Categories & Subcategories...")
        cats_data = ["Frames", "Lenses", "Sunglasses", "Contact Lenses", "Accessories"]
        categories = []
        for c in cats_data:
            cat = Category(admin_id=admin.id, name=c)
            db.add(cat)
            categories.append(cat)
        await db.flush()

        subcats_raw = [
            # Frames subcategories (10)
            ("Full-Rim Acetate", categories[0].id),
            ("Full-Rim Metal", categories[0].id),
            ("Full-Rim TR90", categories[0].id),
            ("Half-Rim Metal", categories[0].id),
            ("Half-Rim Acetate", categories[0].id),
            ("Rimless Metal", categories[0].id),
            ("Rimless Titanium", categories[0].id),
            ("Aviator Frames", categories[0].id),
            ("Wayfarer Frames", categories[0].id),
            ("Round Frames", categories[0].id),
            # Lenses subcategories (10)
            ("Single Vision Standard", categories[1].id),
            ("Single Vision Blue-Cut", categories[1].id),
            ("Single Vision Photochromic", categories[1].id),
            ("Bifocal Flat-Top", categories[1].id),
            ("Bifocal Kryptok", categories[1].id),
            ("Progressive Standard", categories[1].id),
            ("Progressive Premium", categories[1].id),
            ("Progressive Blue-Shield", categories[1].id),
            ("Anti-Reflective Lenses", categories[1].id),
            ("Double Aspheric Lenses", categories[1].id),
            # Sunglasses subcategories (7)
            ("Polarized Sunglasses", categories[2].id),
            ("Aviator Sunglasses", categories[2].id),
            ("Wayfarer Sunglasses", categories[2].id),
            ("Sports Sunglasses", categories[2].id),
            ("Cat-Eye Sunglasses", categories[2].id),
            ("Oversized Sunglasses", categories[2].id),
            ("Round Sunglasses", categories[2].id),
            # Contact Lenses subcategories (6)
            ("Daily Disposable Spherical", categories[3].id),
            ("Daily Disposable Toric", categories[3].id),
            ("Monthly Disposable Spherical", categories[3].id),
            ("Monthly Disposable Toric", categories[3].id),
            ("Colored Contact Lenses", categories[3].id),
            ("Multifocal Contact Lenses", categories[3].id),
            # Accessories subcategories (7)
            ("Hard Shell Cases", categories[4].id),
            ("Soft Pouches", categories[4].id),
            ("Microfiber Cloths", categories[4].id),
            ("Lens Cleaning Sprays", categories[4].id),
            ("Anti-Fog Wipes", categories[4].id),
            ("Contact Lens Solutions", categories[4].id),
            ("Repair Kits & Screws", categories[4].id)
        ]

        subcategories = []
        for name, cat_id in subcats_raw:
            sc = Subcategory(category_id=cat_id, name=name)
            db.add(sc)
            subcategories.append(sc)
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 9. PRODUCTS (45) + specifications
        # ──────────────────────────────────────────────────────
        print("Seeding Products...")
        products = []

        # 15 Frames
        frames_list = [
            ("Ray-Ban Aviator Classic", "FRM-RB-001", 0, Decimal("2500.00"), Decimal("4999.00")),
            ("Oakley Holbrook Acetate", "FRM-OK-002", 1, Decimal("3200.00"), Decimal("6499.00")),
            ("Prada Linea Rossa", "FRM-PR-003", 2, Decimal("5500.00"), Decimal("10999.00")),
            ("Gucci Square Frame", "FRM-GC-004", 3, Decimal("8500.00"), Decimal("16999.00")),
            ("Tom Ford FT5505", "FRM-TF-005", 4, Decimal("6000.00"), Decimal("12499.00")),
            ("Carrera Active Metal", "FRM-CR-006", 5, Decimal("2200.00"), Decimal("4499.00")),
            ("Polaroid Lightweight TR90", "FRM-PL-007", 6, Decimal("1200.00"), Decimal("2499.00")),
            ("Vogue Cat-Eye Metal", "FRM-VG-008", 7, Decimal("1800.00"), Decimal("3599.00")),
            ("Silhouette Rimless Titanium", "FRM-SL-009", 8, Decimal("9000.00"), Decimal("18999.00")),
            ("Persol PO3185V", "FRM-PS-010", 9, Decimal("6500.00"), Decimal("13499.00")),
            ("Armani Exchange Youth", "FRM-AX-011", 11, Decimal("1600.00"), Decimal("3199.00")),
            ("Emporio Armani Classic", "FRM-EA-012", 12, Decimal("3800.00"), Decimal("7599.00")),
            ("Titan Full Rim Lite", "FRM-TT-013", 32, Decimal("1400.00"), Decimal("2799.00")),
            ("Vincent Chase Airflex", "FRM-VC-014", 34, Decimal("900.00"), Decimal("1999.00")),
            ("John Jacobs Slim Fit", "FRM-JJ-015", 35, Decimal("1500.00"), Decimal("2999.00")),
        ]
        for name, sku, b_idx, cost, sell in frames_list:
            p = Product(
                admin_id=admin.id, category_id=categories[0].id,
                subcategory_id=subcategories[b_idx % 10].id,
                sku=sku, name=name, brand_id=brands[b_idx].id,
                cost_price=cost, selling_price=sell,
            )
            db.add(p)
            products.append(p)

        # 10 Sunglasses
        sunglasses_list = [
            ("Ray-Ban Wayfarer Classic", "SGL-RB-016", 0, Decimal("3000.00"), Decimal("5999.00")),
            ("Oakley Radar EV Path", "SGL-OK-017", 1, Decimal("4500.00"), Decimal("8999.00")),
            ("Maui Jim Peahi Polarized", "SGL-MJ-018", 10, Decimal("8000.00"), Decimal("15999.00")),
            ("Carrera Speedster", "SGL-CR-019", 5, Decimal("2500.00"), Decimal("4999.00")),
            ("Polaroid Sports Polarized", "SGL-PL-020", 6, Decimal("1100.00"), Decimal("2299.00")),
            ("Gucci Aviator Sunglasses", "SGL-GC-021", 3, Decimal("9000.00"), Decimal("17999.00")),
            ("Vogue Trendy Round", "SGL-VG-022", 7, Decimal("1500.00"), Decimal("2999.00")),
            ("Michael Kors Kendall", "SGL-MK-023", 13, Decimal("4000.00"), Decimal("7999.00")),
            ("Police Horizon Sport", "SGL-PO-024", 17, Decimal("2800.00"), Decimal("5499.00")),
            ("Fastrack Active Sunglasses", "SGL-FT-025", 36, Decimal("600.00"), Decimal("1299.00")),
        ]
        for name, sku, b_idx, cost, sell in sunglasses_list:
            p = Product(
                admin_id=admin.id, category_id=categories[2].id,
                subcategory_id=subcategories[20 + (b_idx % 7)].id,
                sku=sku, name=name, brand_id=brands[b_idx].id,
                cost_price=cost, selling_price=sell,
            )
            db.add(p)
            products.append(p)

        # 15 Lenses
        lenses_list = [
            ("Essilor Single Vision Crizal 1.56", "LNS-ES-026", 18, Decimal("600.00"), Decimal("1199.00")),
            ("Zeiss Single Vision BlueGuard 1.6", "LNS-ZS-027", 19, Decimal("1800.00"), Decimal("3599.00")),
            ("Hoya Nulux Active BlueControl", "LNS-HY-028", 20, Decimal("2200.00"), Decimal("4499.00")),
            ("Rodenstock Cosmolit 1.67", "LNS-RD-029", 21, Decimal("3500.00"), Decimal("6999.00")),
            ("Nikon Lite AS 1.6", "LNS-NK-030", 22, Decimal("2000.00"), Decimal("3999.00")),
            ("Seiko Double Aspheric 1.74", "LNS-SK-031", 23, Decimal("6500.00"), Decimal("12999.00")),
            ("Varilux Comfort Max Progressive", "LNS-VL-032", 25, Decimal("5000.00"), Decimal("9999.00")),
            ("Crizal Prevencia Protective 1.5", "LNS-CR-033", 24, Decimal("1100.00"), Decimal("2199.00")),
            ("Shamir Autograph Intelligence", "LNS-SH-034", 26, Decimal("8000.00"), Decimal("15999.00")),
            ("Kodak Unique Digital Progressive", "LNS-KD-035", 27, Decimal("4000.00"), Decimal("7999.00")),
            ("Essilor Eyezen Boost Lens", "LNS-EZ-036", 18, Decimal("2500.00"), Decimal("4999.00")),
            ("Zeiss Progressive SmartLife 1.6", "LNS-ZP-037", 19, Decimal("7000.00"), Decimal("13999.00")),
            ("Hoya Balans Progressive Duo", "LNS-HB-038", 20, Decimal("4800.00"), Decimal("9599.00")),
            ("Nikon Digilife Progressive 1.5", "LNS-ND-039", 22, Decimal("3000.00"), Decimal("5999.00")),
            ("Zeiss DriveSafe Lens coating", "LNS-ZD-040", 19, Decimal("3200.00"), Decimal("6399.00")),
        ]
        for name, sku, b_idx, cost, sell in lenses_list:
            p = Product(
                admin_id=admin.id, category_id=categories[1].id,
                subcategory_id=subcategories[10 + (b_idx % 10)].id,
                sku=sku, name=name, brand_id=brands[b_idx].id,
                cost_price=cost, selling_price=sell,
            )
            db.add(p)
            products.append(p)

        # 5 Accessories
        accessories_list = [
            ("Premium Leather Eyewear Case", "ACC-LC-041", 32, Decimal("250.00"), Decimal("599.00")),
            ("Microfiber Lens Cleaning Cloth", "ACC-MC-042", 33, Decimal("30.00"), Decimal("99.00")),
            ("Ultra-Clear Anti-Fog Spray", "ACC-AF-043", 34, Decimal("80.00"), Decimal("199.00")),
            ("Bausch + Lomb ReNu Solution 355ml", "ACC-RN-044", 29, Decimal("180.00"), Decimal("380.00")),
            ("Mini Eyeglasses Repair Tool Kit", "ACC-RK-045", 32, Decimal("100.00"), Decimal("249.00")),
        ]
        for name, sku, b_idx, cost, sell in accessories_list:
            p = Product(
                admin_id=admin.id, category_id=categories[4].id,
                subcategory_id=subcategories[33 + (b_idx % 7)].id,
                sku=sku, name=name, brand_id=brands[b_idx].id,
                cost_price=cost, selling_price=sell,
            )
            db.add(p)
            products.append(p)

        await db.flush()

        # Add Frame details (25 records: 15 frames + 10 sunglasses)
        print("Seeding Frame Specs...")
        for i in range(25):
            shape_choice = "Aviator" if i % 4 == 0 else "Rectangle" if i % 4 == 1 else "Round" if i % 4 == 2 else "Cat-Eye"
            mat_choice = "Metal" if i % 3 == 0 else "Acetate" if i % 3 == 1 else "TR-90"
            color_choice = "Matte Black" if i % 5 == 0 else "Gold" if i % 5 == 1 else "Gunmetal" if i % 5 == 2 else "Tortoise" if i % 5 == 3 else "Rose Gold"
            db.add(FrameProduct(
                product_id=products[i].id,
                frame_type="Full-Rim" if i % 3 != 2 else "Half-Rim",
                shape=shape_choice,
                material=mat_choice,
                color=color_choice,
                lens_width=str(50 + (i % 8) * 2),
                bridge_width=str(15 + i % 5),
                temple_length=str(135 + (i % 3) * 5),
                gender="Unisex" if i % 2 == 0 else "Male" if i % 3 == 1 else "Female",
                age_group="Adult" if i % 10 != 9 else "Kids",
            ))

        # Add Lens details (15 records)
        print("Seeding Lens Specs...")
        for i in range(25, 40):
            idx = i - 25
            db.add(LensProduct(
                product_id=products[i].id,
                lens_type="Single Vision" if idx % 3 == 0 else "Progressive" if idx % 3 == 1 else "Bifocal",
                material="CR-39" if idx % 4 == 0 else "Polycarbonate" if idx % 4 == 1 else "MR-8" if idx % 4 == 2 else "Glass",
                index_value="1.56" if idx % 5 == 0 else "1.60" if idx % 5 == 1 else "1.67" if idx % 5 == 2 else "1.74" if idx % 5 == 3 else "1.50",
                coating="Anti-Reflective" if idx % 3 == 0 else "HMC Coating" if idx % 3 == 1 else "Blue Cut",
                tint_color="Clear" if idx % 4 != 3 else "Grey (G-15)",
                uv_protection="UV400" if idx % 2 == 0 else "UV380",
                blue_cut="Yes" if idx % 3 != 0 else "No",
                photochromic="Yes" if idx % 5 == 4 else "No",
                polarized="Yes" if idx % 6 == 5 else "No",
            ))

        # Add Accessory details (5 records)
        print("Seeding Accessory Specs...")
        acc_types = ["Case", "Cloth", "Spray", "Solution", "Kit"]
        acc_mats = ["Leatherette", "Microfiber", "Fluid", "Chemical Solution", "Metal/Plastic"]
        for i in range(40, 45):
            idx = i - 40
            db.add(AccessoryProduct(
                product_id=products[i].id,
                accessory_type=acc_types[idx],
                material=acc_mats[idx],
                color="Black" if idx % 2 == 0 else "Royal Blue" if idx == 1 else "Brown" if idx == 0 else "Clear",
                size="Standard" if idx < 3 else "355ml" if idx == 3 else "Mini Pocket",
            ))
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 10. INVENTORIES — 45 products for each store + 45 products for each admin (warehouse)
        # ──────────────────────────────────────────────────────
        print("Seeding Store & Warehouse Inventories...")
        inventories_map = {}
        # Store inventories
        for store in stores:
            for i, prod in enumerate(products):
                qty = 40 + (i * store.id) % 60
                inv = Inventory(
                    owner_type=OwnerType.STORE, owner_id=store.id,
                    product_id=prod.id, quantity=qty,
                    available_quantity=qty, reorder_level=10,
                )
                db.add(inv)
                inventories_map[(store.id, prod.id)] = inv

        # Admin warehouse inventories
        for adm in admins:
            for i, prod in enumerate(products):
                qty = 150 + (i * adm.id) % 200
                inv = Inventory(
                    owner_type=OwnerType.ADMIN, owner_id=adm.id,
                    product_id=prod.id, quantity=qty,
                    available_quantity=qty, reorder_level=20,
                )
                db.add(inv)
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 11. SUPPLIERS (40)
        # ──────────────────────────────────────────────────────
        print("Seeding Suppliers (40)...")
        suppliers_list = [
            "Luxottica India Pvt Ltd", "Essilor India Pvt Ltd", "Zeiss Optical Lab India", "Hoya Lens India Pvt Ltd",
            "Safilo Eyewear Distributors", "Marchon India Distribution", "Marcolin Eyewear India", "De Rigo Vision Distributors",
            "Kering Eyewear India", "Rodenstock Lens Lab", "Nikon Lenswear India", "Seiko Optical Distributors",
            "Alcon Laboratories India", "Bausch & Lomb India Pvt Ltd", "CooperVision India", "Johnson & Johnson Vision Care",
            "GKB Opticals Wholesale", "Titan Eyeplus Distribution", "Lenskart Wholesale Division", "Apex Optical Wholesalers",
            "Sterling Eyewear Imports", "Vision Express Wholesale", "Dynamic Optical Lab", "Precision Lens Coatings",
            "Nova Eyewear Lab", "Signet Armorlite India", "Shamir Lens Distributors", "Young Younger Eyewear Co.",
            "Optical Oasis Distributors", "Horizon Lens Labs", "Elite Frame Industries", "Zenith Optical Supplies",
            "Crystal Clear Lens Labs", "Silverline Eyewear Imports", "Prime Vision Distributors", "Omega Optical Solutions",
            "Royal Spectacle Wholesalers", "Classic Frame Distributors", "Paramount Optical Supplies", "Ultimate Lens Lab Pune"
        ]
        suppliers = []
        for i, s_name in enumerate(suppliers_list):
            sup = Supplier(
                admin_id=admin.id,
                company_name=s_name,
                contact_person=f"Representative {i+1}",
                email=f"contact_{i+1}@{s_name.lower().replace(' ', '').replace('.', '')[:10]}.com",
                phone=f"988000{i+1:04d}",
                city="Pune" if i % 2 == 0 else "Mumbai" if i % 3 == 0 else "Delhi",
                state="Maharashtra" if i % 2 == 0 or i % 3 == 0 else "Delhi",
                pincode=f"4110{i+1:02d}" if i % 2 == 0 else f"4000{i+1:02d}",
                gst_number=f"27AALCL{1000 + i}B1Z{i % 9}",
                credit_days=30 + (i % 3) * 15,
                status=SupplierStatus.ACTIVE
            )
            db.add(sup)
            suppliers.append(sup)
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 12. SUPPLIER STORE LINKS (40)
        # ──────────────────────────────────────────────────────
        print("Seeding Supplier Store Links (40)...")
        for i in range(40):
            link = SupplierStoreLink(
                supplier_id=suppliers[i].id,
                store_id=stores[i % 5].id,
                is_primary=(i < 5),
            )
            db.add(link)
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 13. SUPPLIER PRODUCTS (45) — mapping each product to a supplier
        # ──────────────────────────────────────────────────────
        print("Seeding Supplier Products (45)...")
        for i in range(45):
            cost_val = products[i].cost_price
            sp = SupplierProduct(
                supplier_id=suppliers[i % 40].id,
                product_id=products[i].id,
                supplier_sku=f"SUP-SKU-{i+1:03d}",
                unit_price=(cost_val * Decimal("0.90")).quantize(Decimal("0.01")),
                minimum_order_quantity=5 + (i % 5) * 5,
                lead_time_days=3 + (i % 4),
            )
            db.add(sp)
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 14. PURCHASE ORDERS (40) + PO ITEMS + SUPPLIER PAYMENTS
        # ──────────────────────────────────────────────────────
        print("Seeding Purchase Orders, Items & Payments (40)...")
        purchase_orders = []
        po_pay_methods = [
            SupplierPaymentMethod.BANK_TRANSFER,
            SupplierPaymentMethod.UPI,
            SupplierPaymentMethod.CHEQUE,
            SupplierPaymentMethod.CASH,
        ]

        base_date = date(2026, 1, 1)
        for i in range(40):
            store_sel = stores[i % 5]
            supplier_sel = suppliers[i % 40]
            prod_sel = products[(i * 3) % 45]
            inv_sel = inventories_map[(store_sel.id, prod_sel.id)]

            po_qty = 20 + i * 2
            unit_price = prod_sel.cost_price
            line_total = (unit_price * po_qty).quantize(Decimal("0.01"))
            tax = (line_total * Decimal("0.18")).quantize(Decimal("0.01"))
            total = line_total + tax

            po_status = POStatus.RECEIVED if i % 4 != 0 else POStatus.SENT if i % 4 == 1 else POStatus.DRAFT
            po_order_date = base_date + timedelta(days=(i * 4))

            po = PurchaseOrder(
                po_number=f"PO-2026-{i+1:05d}",
                admin_id=admins[i % 5].id, # Link PO to appropriate admin
                store_id=store_sel.id,
                supplier_id=supplier_sel.id,
                status=po_status,
                order_date=po_order_date,
                expected_delivery_date=po_order_date + timedelta(days=7),
                received_date=po_order_date + timedelta(days=6) if po_status == POStatus.RECEIVED else None,
                subtotal=line_total,
                tax_amount=tax,
                discount_amount=Decimal("0"),
                total_amount=total,
                paid_amount=total if po_status == POStatus.RECEIVED else Decimal("0"),
                due_amount=Decimal("0") if po_status == POStatus.RECEIVED else total,
                due_date=po_order_date + timedelta(days=30),
                created_by=admins[i % 5].id,
                notes=f"Bulk purchase order {i+1} for store {store_sel.store_code}"
            )
            db.add(po)
            purchase_orders.append(po)
            await db.flush()

            # Create PO Item
            po_item = PurchaseOrderItem(
                purchase_order_id=po.id,
                product_id=prod_sel.id,
                inventory_id=inv_sel.id,
                quantity_ordered=po_qty,
                quantity_received=po_qty if po_status == POStatus.RECEIVED else 0,
                unit_price=unit_price,
                tax_percent=Decimal("18.00"),
                discount_percent=Decimal("0"),
                line_total=(line_total * Decimal("1.18")).quantize(Decimal("0.01")),
            )
            db.add(po_item)

            # Update Inventory quantity if received
            if po_status == POStatus.RECEIVED:
                inv_sel.quantity += po_qty
                inv_sel.available_quantity += po_qty

            # Create Supplier Payment
            if po.paid_amount > Decimal("0"):
                sp = SupplierPayment(
                    purchase_order_id=po.id,
                    supplier_id=supplier_sel.id,
                    admin_id=admins[i % 5].id,
                    payment_date=po_order_date + timedelta(days=1),
                    amount=po.paid_amount,
                    payment_method=po_pay_methods[i % 4],
                    reference_number=f"REF-POPAY-{i+1:04d}",
                    remarks=f"Payment for {po.po_number}",
                    created_by=admins[i % 5].id,
                )
                db.add(sp)

        await db.flush()

        # ──────────────────────────────────────────────────────
        # 15. CUSTOMERS (45) + PRESCRIPTIONS (45)
        # ──────────────────────────────────────────────────────
        print("Seeding Customers & Prescriptions (45)...")
        cust_first_names = [
            "Aarav", "Isha", "Rohan", "Meera", "Siddharth", "Aditya", "Ananya", "Arjun", "Diya", "Kabir",
            "Kavya", "Parth", "Riya", "Shaurya", "Tanvi", "Vivaan", "Zara", "Dev", "Avani", "Ishaan",
            "Kiara", "Dhruv", "Myra", "Reyansh", "Samaira", "Veer", "Anika", "Yash", "Shruti", "Neil",
            "Alisha", "Ranbir", "Tara", "Ishwar", "Laxmi", "Krishna", "Saraswathi", "Venkat", "Meenakshi", "Raghavan",
            "Hari", "Parvathi", "Anand", "Vasudha", "Madhav"
        ]
        cust_last_names = [
            "Deshmukh", "Kulkarni", "Thakur", "Jain", "Pawar", "Sharma", "Patel", "Gupta", "Joshi", "Singh",
            "Nair", "Soni", "Verma", "Rao", "Kapoor", "Iyer", "Khan", "Shah", "Mehta", "Joshi",
            "Dwivedi", "Saxena", "Bhatia", "Khanna", "Malhotra", "Choudhary", "Gill", "Bansal", "Agrawal", "Sen",
            "Roy", "Dutta", "Banerjee", "Prasad", "Narayan", "Murthy", "Iyer", "Raman", "Sundaram", "Pillai",
            "Krishnan", "Amma", "Gokhale", "Chitale", "Apte"
        ]

        customers = []
        for i in range(45):
            fn = cust_first_names[i]
            ln = cust_last_names[i]
            gnd = CustomerGender.MALE if i % 2 == 0 else CustomerGender.FEMALE
            cust = Customer(
                admin_id=admins[i % 5].id, # Distribute among admins
                store_id=stores[i % 5].id,
                first_visit_store_id=stores[i % 5].id,
                first_name=fn,
                last_name=ln,
                email=f"{fn.lower()}.{ln.lower()}@gmail.com",
                phone=f"986000{1000 + i}",
                gender=gnd,
                city="Mumbai" if i % 3 == 0 else "New Delhi" if i % 3 == 1 else "Bengaluru",
                state="Maharashtra" if i % 3 == 0 else "Delhi" if i % 3 == 1 else "Karnataka",
                pincode="400058" if i % 3 == 0 else "110001" if i % 3 == 1 else "560001",
                remark=f"Regular optical checkup patient {i+1}",
                is_active=True
            )
            db.add(cust)
            customers.append(cust)
            await db.flush()

            # Create an associated Prescription row for this customer
            sph_r = f"-{1.00 + (i % 5) * 0.75:.2f}" if i % 3 != 0 else f"+{1.00 + (i % 3) * 0.50:.2f}"
            cyl_r = f"-{0.25 + (i % 4) * 0.25:.2f}" if i % 2 == 0 else "0.00"
            axis_r = str((i * 45) % 180)
            sph_l = f"-{1.25 + (i % 5) * 0.75:.2f}" if i % 3 != 0 else f"+{1.25 + (i % 3) * 0.50:.2f}"
            cyl_l = f"-{0.50 + (i % 4) * 0.25:.2f}" if i % 2 == 0 else "0.00"
            axis_l = str(((i * 45) + 5) % 180)

            pres = Prescription(
                customer_id=cust.id,
                store_id=stores[i % 5].id,
                optician_id=opticians[i % 5].id,
                sph_right=sph_r,
                cyl_right=cyl_r,
                axis_right=axis_r,
                sph_left=sph_l,
                cyl_left=cyl_l,
                axis_left=axis_l,
                addition="+1.50" if i > 30 else None,
                pupillary_distance="64",
                prescription_date=date(2026, 1 + (i % 6), 1 + (i * 2) % 28),
                notes="Prescription details created during clinical exam",
                lens_type="Progressive" if i > 30 else "Single Vision",
                lens_material="CR-39" if i % 2 == 0 else "Polycarbonate",
                lens_coating="Anti-Reflective" if i % 3 == 0 else "Blue Cut",
                frame_preference="Full-Rim",
                expiry_date=date(2027, 1 + (i % 6), 1 + (i * 2) % 28),
                recommended_usage="Constant Wear" if i % 2 == 0 else "Reading Only",
                doctor_name=f"{opticians[i % 5].first_name} {opticians[i % 5].last_name}",
                is_active=True
            )
            db.add(pres)

        await db.flush()

        # ──────────────────────────────────────────────────────
        # 16. SALES (45) + SALE ITEMS + SALE PAYMENTS + INVENTORY TXNS
        # ──────────────────────────────────────────────────────
        print("Seeding Sales, Items & Payments (45)...")
        sales = []
        sale_pay_methods = [
            SalePaymentMethod.CASH,
            SalePaymentMethod.CARD,
            SalePaymentMethod.UPI,
            SalePaymentMethod.BANK_TRANSFER,
        ]

        sale_distribution_months = [1]*6 + [2]*7 + [3]*8 + [4]*8 + [5]*8 + [6]*8

        for i in range(45):
            m_val = sale_distribution_months[i]
            day_val = 1 + (i * 4) % 28
            sale_date_val = date(2026, m_val, day_val)

            store_sel = stores[i % 5]
            cust_sel = customers[i]
            prod_sel = products[i]
            inv_sel = inventories_map[(store_sel.id, prod_sel.id)]

            sale_qty = 1 if i % 5 != 4 else 2
            unit_price = prod_sel.selling_price
            base_total = unit_price * sale_qty
            tax_val = (base_total * Decimal("0.18")).quantize(Decimal("0.01"))
            total_val = base_total + tax_val

            manager_sel = managers[i % 5]

            sale = Sale(
                invoice_number=f"INV-2026-{i+1:05d}",
                admin_id=admins[i % 5].id,
                store_id=store_sel.id,
                customer_id=cust_sel.id,
                sold_by_type=StaffType.MANAGER,
                sold_by_id=manager_sel.id,
                sale_date=sale_date_val,
                status=SaleStatus.COMPLETED,
                subtotal=base_total,
                discount_amount=Decimal("0"),
                tax_amount=tax_val,
                total_amount=total_val,
                paid_amount=total_val,
                due_amount=Decimal("0"),
                loyalty_points_earned=int(total_val // Decimal("100")),
                loyalty_points_redeemed=0,
            )
            db.add(sale)
            sales.append(sale)
            await db.flush()

            # Create Sale Item
            si = SaleItem(
                sale_id=sale.id,
                product_id=prod_sel.id,
                inventory_id=inv_sel.id,
                quantity=sale_qty,
                unit_price=unit_price,
                unit_cost=prod_sel.cost_price,
                discount_percent=Decimal("0"),
                tax_percent=Decimal("18.00"),
                line_total=total_val,
            )
            db.add(si)

            # Deduct Inventory quantity
            inv_sel.quantity -= sale_qty
            inv_sel.available_quantity -= sale_qty

            # Create Sale Payment
            sp = SalePayment(
                sale_id=sale.id,
                amount=total_val,
                payment_method=sale_pay_methods[i % 4],
                reference_number=f"REF-SALE-{i+1:04d}" if i % 4 != 0 else None,
                remarks=f"Full payment for invoice {sale.invoice_number}",
            )
            db.add(sp)

            # Create Inventory Transaction
            txn = InventoryTransaction(
                inventory_id=inv_sel.id,
                product_id=prod_sel.id,
                transaction_type=TransactionType.SALE,
                quantity=sale_qty,
                reference_id=sale.id,
                remarks=f"Sale transaction {sale.invoice_number}",
                created_by=manager_sel.id,
            )
            db.add(txn)

        await db.flush()

        # ──────────────────────────────────────────────────────
        # 17. EXPENSE CATEGORIES (12) + EXPENSES (40)
        # ──────────────────────────────────────────────────────
        print("Seeding Expense Categories & Expenses (40)...")
        exp_categories_list = [
            "Store Rent", "Electricity Bill", "Staff Salaries", "Marketing & Ads",
            "Store Stationery", "Cleaning & Sanitization", "Repairs & Maintenance",
            "Internet & Telecom", "Water Utility", "Courier & Logistics",
            "Security Guard Fees", "Store Refreshments"
        ]
        expense_categories = []
        for ec_name in exp_categories_list:
            ec = ExpenseCategory(
                admin_id=admin.id,
                name=ec_name,
                description=f"Expenses related to {ec_name.lower()}",
                is_active=True
            )
            db.add(ec)
            expense_categories.append(ec)
        await db.flush()

        exp_pay_methods = [
            ExpensePaymentMethod.BANK_TRANSFER,
            ExpensePaymentMethod.UPI,
            ExpensePaymentMethod.CHEQUE,
            ExpensePaymentMethod.CASH,
            ExpensePaymentMethod.CARD,
        ]

        for i in range(40):
            store_sel = stores[i % 5]
            cat_sel = expense_categories[i % 12]
            month_val = 1 + (i % 6)
            day_val = 5 + (i * 2) % 20
            exp_date = date(2026, month_val, day_val)

            if "Rent" in cat_sel.name:
                amount_val = Decimal("15000.00")
            elif "Salaries" in cat_sel.name:
                amount_val = Decimal("12000.00")
            elif "Electricity" in cat_sel.name or "Marketing" in cat_sel.name:
                amount_val = Decimal("3000.00")
            else:
                amount_val = Decimal("400.00") + (i % 5) * Decimal("150.00")

            exp = Expense(
                admin_id=admins[i % 5].id,
                owner_type=ExpenseOwnerType.STORE,
                owner_id=store_sel.id,
                category_id=cat_sel.id,
                title=f"{cat_sel.name} - {exp_date.strftime('%B')} 2026",
                description=f"Monthly store expense for {cat_sel.name.lower()}",
                amount=amount_val,
                expense_date=exp_date,
                payment_method=exp_pay_methods[i % 5],
                reference_number=f"EXP-REF-{i+1:04d}",
                is_recurring=True if "Rent" in cat_sel.name or "Salaries" in cat_sel.name else False,
                recurring_interval="MONTHLY" if ("Rent" in cat_sel.name or "Salaries" in cat_sel.name) else None,
                is_approved=True,
                approved_by=admins[i % 5].id,
                approved_at=datetime.now(timezone.utc),
                recorded_by_type=ExpenseRecordedByType.MANAGER,
                recorded_by_id=managers[i % 5].id,
            )
            db.add(exp)

        await db.flush()

        # ──────────────────────────────────────────────────────
        # 18. REPAIRS (40)
        # ──────────────────────────────────────────────────────
        print("Seeding Repairs (40)...")
        repair_types = [
            RepairType.FRAME_REPAIR,
            RepairType.LENS_REPLACEMENT,
            RepairType.ACCESSORY_REPAIR,
            RepairType.WARRANTY_SERVICE,
            RepairType.OTHER
        ]
        repair_statuses = [
            RepairStatus.DELIVERED,
            RepairStatus.COMPLETED,
            RepairStatus.IN_PROGRESS,
            RepairStatus.RECEIVED,
            RepairStatus.CANCELLED
        ]

        for i in range(40):
            cust_sel = customers[i]
            store_sel = stores[i % 5]
            sale_sel = sales[i] if i % 3 == 0 else None
            rep_type = repair_types[i % 5]
            rep_status = repair_statuses[i % 5]

            is_warr = (sale_sel is not None and i % 2 == 0)
            est_cost = Decimal("0") if is_warr else Decimal("200.00") + (i % 6) * Decimal("100.00")
            fin_cost = est_cost if rep_status in [RepairStatus.COMPLETED, RepairStatus.DELIVERED] else None
            adv_paid = Decimal("0") if (is_warr or rep_status == RepairStatus.DELIVERED) else est_cost * Decimal("0.5")

            rec_date = date(2026, 1 + (i % 6), 1 + (i * 3) % 28)
            est_comp = rec_date + timedelta(days=4)
            comp_date = rec_date + timedelta(days=3) if rep_status in [RepairStatus.COMPLETED, RepairStatus.DELIVERED] else None

            rep = Repair(
                repair_number=f"REP-2026-{i+1:05d}",
                admin_id=admins[i % 5].id,
                store_id=store_sel.id,
                customer_id=cust_sel.id,
                sale_id=sale_sel.id if sale_sel else None,
                customer_name=None,
                repair_type=rep_type,
                status=rep_status,
                is_warranty=is_warr,
                description="Issue with frame hinge or lens scratch. Standard service requested.",
                estimated_cost=est_cost,
                final_cost=fin_cost,
                advance_paid=adv_paid.quantize(Decimal("0.01")),
                received_date=rec_date,
                estimated_completion_date=est_comp,
                completed_date=comp_date,
                handled_by_type=RepairStaffType.WORKER if i % 2 == 0 else RepairStaffType.OPTICIAN,
                handled_by_id=workers[i % 5].id if i % 2 == 0 else opticians[i % 5].id,
                notes="Realigned the frame temples and performed ultrasonic deep cleaning."
            )
            db.add(rep)

        await db.flush()

        # ──────────────────────────────────────────────────────
        # 19. NOTIFICATIONS (40)
        # ──────────────────────────────────────────────────────
        print("Seeding Notifications (40)...")
        notif_types = [
            NotificationType.TRANSFER_REQUEST_RECEIVED,
            NotificationType.TRANSFER_REQUEST_APPROVED,
            NotificationType.TRANSFER_REQUEST_REJECTED,
            NotificationType.TRANSFER_PUSH_RECEIVED,
            NotificationType.ADMIN_TRANSFER_COMPLETED,
        ]

        for i in range(40):
            notif = Notification(
                recipient_user_id=managers[i % 5].id,
                recipient_store_id=stores[i % 5].id,
                type=notif_types[i % 5],
                title=f"Stock Notification {i+1}",
                message=f"Stock transfer order update. Event code: {1000 + i}",
                is_read=(i % 3 == 0),
                related_transaction_id=None
            )
            db.add(notif)

        # ── Commit everything ─────────────────────────────────
        print("Committing to database...")
        await db.commit()

        print("=" * 60)
        print("  [SUCCESS] DATABASE SEEDED SUCCESSFULLY WITH 40+ RECORDS PER TABLE!")
        print("=" * 60)
        print()
        print(f"  Admins: {len(admins)}")
        print(f"  Roles: {len(roles)}")
        print(f"  Stores: {len(stores)}")
        print(f"  Managers: {len(managers)}")
        print(f"  Workers: {len(workers)}")
        print(f"  Opticians: {len(opticians)}")
        print(f"  Brands: {len(brands)}")
        print(f"  Categories: {len(categories)}")
        print(f"  Subcategories: {len(subcategories)}")
        print(f"  Products: {len(products)}")
        print(f"  Inventories: {(len(stores) + len(admins)) * len(products)} (Store + Warehouse)")
        print(f"  Suppliers: {len(suppliers)}")
        print(f"  Purchase Orders: 40")
        print(f"  Customers: 45")
        print(f"  Prescriptions: 45")
        print(f"  Sales: 45")
        print(f"  Expenses: 40")
        print(f"  Repairs: 40")
        print(f"  Notifications: 40")
        print("=" * 60)
        print()
        print("  Login credentials for all admins:")
        print(f"  {'Email':<30} {'Password':<15}")
        print(f"  {'-' * 30} {'-' * 15}")
        for a in admins:
            print(f"  {a.email:<30} Admin@123")
        print()


async def main() -> None:
    try:
        await seed()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
