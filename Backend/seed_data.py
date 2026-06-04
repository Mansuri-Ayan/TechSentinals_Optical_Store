"""
seed_data.py — Populate the database with realistic sample data.

Creates:
  • 1 Admin  (parthsoni@gmail.com / 123456)
  • 4 Roles  (admin, manager, worker, optician)
  • 5 Stores
  • 5 Managers, 5 Workers, 5 Opticians
  • 5 Brands, 5 Categories, 5 Subcategories
  • 5 Products (with frame/lens/accessory details)
  • 5 Inventories
  • 5 Suppliers, 5 SupplierStoreLinks, 5 SupplierProducts
  • 5 PurchaseOrders, 5 PO Items, 5 SupplierPayments
  • 5 Customers
  • 5 Sales, 5 SaleItems, 5 SalePayments

Run:  python seed_data.py
"""
import asyncio
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from db.session import async_session_maker, engine, Base
from core.security import hash_password

# ── Import every model so Base.metadata is complete ────────────
from models import *  # noqa: F401,F403


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
        roles_data = ["admin", "manager", "worker", "optician", "receptionist"]
        roles = []
        for r in roles_data:
            role = Role(role=r)
            db.add(role)
            roles.append(role)
        await db.flush()
        role_map = {r.role: r for r in roles}

        # ──────────────────────────────────────────────────────
        # 2. ADMIN (5)
        # ──────────────────────────────────────────────────────
        admins_data = [
            ("Parth Optical House", "Parth", "Soni", "parthsoni@gmail.com", "9876543210", "27AABCP1234A1ZX", "AABCP1234A"),
            ("Ayan Vision Center", "Ayan", "Mansuri", "ayan@gmail.com", "9876543211", "27AABCP1234A2ZX", "AABCP1234B"),
            ("Tech Optical Care", "John", "Doe", "john@gmail.com", "9876543212", "27AABCP1234A3ZX", "AABCP1234C"),
            ("Spectacle House", "Jane", "Smith", "jane@gmail.com", "9876543213", "27AABCP1234A4ZX", "AABCP1234D"),
            ("Elite Eye Studio", "Bob", "Johnson", "bob@gmail.com", "9876543214", "27AABCP1234A5ZX", "AABCP1234E"),
        ]
        admins = []
        for bus, fn, ln, em, ph, gst, pan in admins_data:
            adm = Admin(
                business_name=bus,
                owner_first_name=fn,
                owner_last_name=ln,
                email=em,
                phone=ph,
                password_hash=hash_password("123456"),
                gst_number=gst,
                pan_number=pan,
                address="101 MG Road, Camp",
                city="Pune",
                state="Maharashtra",
                pincode="411001",
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
        import hashlib
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
        # 3. STORES (5)
        # ──────────────────────────────────────────────────────
        stores_data = [
            ("Parth Optics — MG Road",     "POH-MG01",  "9876500001", "101 MG Road",        "Pune",     "Maharashtra", "411001"),
            ("Parth Optics — FC Road",     "POH-FC02",  "9876500002", "22 FC Road",         "Pune",     "Maharashtra", "411004"),
            ("Parth Optics — Baner",       "POH-BN03",  "9876500003", "DSK Ranwara, Baner", "Pune",     "Maharashtra", "411045"),
            ("Parth Optics — Hinjewadi",   "POH-HJ04",  "9876500004", "Phase 1, Hinjewadi", "Pune",     "Maharashtra", "411057"),
            ("Parth Optics — Kothrud",     "POH-KT05",  "9876500005", "Paud Road, Kothrud", "Pune",     "Maharashtra", "411038"),
        ]
        stores = []
        for name, code, phone, addr, city, state, pin in stores_data:
            s = Store(
                admin_id=admin.id, store_name=name, store_code=code,
                phone=phone, address=addr, city=city, state=state, pincode=pin,
            )
            db.add(s)
            stores.append(s)
        await db.flush()

        pwd = hash_password("123456")

        # ──────────────────────────────────────────────────────
        # 4. MANAGERS (5)
        # ──────────────────────────────────────────────────────
        managers_data = [
            ("Rahul",  "Sharma",  "rahul.m@store.com",  "9871000001", "MGR-001"),
            ("Sneha",  "Patel",   "sneha.m@store.com",  "9871000002", "MGR-002"),
            ("Arun",   "Gupta",   "arun.m@store.com",   "9871000003", "MGR-003"),
            ("Priya",  "Joshi",   "priya.m@store.com",  "9871000004", "MGR-004"),
            ("Vikram", "Singh",   "vikram.m@store.com",  "9871000005", "MGR-005"),
        ]
        managers = []
        for i, (fn, ln, em, ph, ec) in enumerate(managers_data):
            m = Manager(
                store_id=stores[i].id, role_id=role_map["manager"].id,
                first_name=fn, last_name=ln, email=em, phone=ph,
                password_hash=pwd, employee_code=ec,
                joining_date=date(2024, 1, 15),
            )
            db.add(m)
            managers.append(m)
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 5. WORKERS (5)
        # ──────────────────────────────────────────────────────
        workers_data = [
            ("Amit",   "Kumar",  "amit.w@store.com",   "9872000001", "WRK-001"),
            ("Pooja",  "Yadav",  "pooja.w@store.com",  "9872000002", "WRK-002"),
            ("Sunil",  "Verma",  "sunil.w@store.com",  "9872000003", "WRK-003"),
            ("Megha",  "Rao",    "megha.w@store.com",  "9872000004", "WRK-004"),
            ("Deepak", "Nair",   "deepak.w@store.com", "9872000005", "WRK-005"),
        ]
        workers = []
        for i, (fn, ln, em, ph, ec) in enumerate(workers_data):
            w = Worker(
                store_id=stores[i].id, role_id=role_map["worker"].id,
                first_name=fn, last_name=ln, email=em, phone=ph,
                password_hash=pwd, employee_code=ec,
                joining_date=date(2024, 3, 1),
            )
            db.add(w)
            workers.append(w)
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 6. OPTICIANS (5)
        # ──────────────────────────────────────────────────────
        opticians_data = [
            ("Dr. Anita", "Desai",   "anita.o@store.com",  "9873000001", "OPT-001", "OPT-LIC-1234"),
            ("Dr. Karan", "Mehta",   "karan.o@store.com",  "9873000002", "OPT-002", "OPT-LIC-2345"),
            ("Dr. Neha",  "Kapoor",  "neha.o@store.com",   "9873000003", "OPT-003", "OPT-LIC-3456"),
            ("Dr. Ravi",  "Iyer",    "ravi.o@store.com",   "9873000004", "OPT-004", "OPT-LIC-4567"),
            ("Dr. Sana",  "Khan",    "sana.o@store.com",   "9873000005", "OPT-005", "OPT-LIC-5678"),
        ]
        opticians = []
        for i, (fn, ln, em, ph, ec, lic) in enumerate(opticians_data):
            o = Optician(
                store_id=stores[i].id, role_id=role_map["optician"].id,
                first_name=fn, last_name=ln, email=em, phone=ph,
                password_hash=pwd, employee_code=ec,
                qualification=lic, joining_date=date(2024, 2, 1),
            )
            db.add(o)
            opticians.append(o)
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 7. BRANDS (5)
        # ──────────────────────────────────────────────────────
        brands_data = ["Ray-Ban", "Oakley", "Titan Eyeplus", "Lenskart Studio", "Vincent Chase"]
        brands = []
        for b in brands_data:
            brand = Brand(admin_id=admin.id, name=b)
            db.add(brand)
            brands.append(brand)
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 8. CATEGORIES (5) + SUBCATEGORIES (5)
        # ──────────────────────────────────────────────────────
        cats_data = ["Frames", "Lenses", "Sunglasses", "Contact Lenses", "Accessories"]
        categories = []
        for c in cats_data:
            cat = Category(admin_id=admin.id, name=c)
            db.add(cat)
            categories.append(cat)
        await db.flush()

        subcats_data = [
            ("Full-Rim Frames",  categories[0].id),
            ("Half-Rim Frames",  categories[0].id),
            ("Single Vision",    categories[1].id),
            ("Progressive",      categories[1].id),
            ("Cases & Cloths",   categories[4].id),
        ]
        subcategories = []
        for name, cat_id in subcats_data:
            sc = Subcategory(category_id=cat_id, name=name)
            db.add(sc)
            subcategories.append(sc)
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 9. PRODUCTS (15) + extensions
        # ──────────────────────────────────────────────────────
        products = []

        # 5 Frames
        frames_products_data = [
            ("Ray-Ban Aviator Classic", "FRM-RB-001", brands[0].id, Decimal("2500.00"), Decimal("4999.00")),
            ("Oakley Holbrook", "FRM-OK-002", brands[1].id, Decimal("3200.00"), Decimal("6499.00")),
            ("Titan Full Rim", "FRM-TT-003", brands[2].id, Decimal("1500.00"), Decimal("2999.00")),
            ("Lenskart Air", "FRM-LK-004", brands[3].id, Decimal("1200.00"), Decimal("2499.00")),
            ("Vincent Chase Wayfarer", "FRM-VC-005", brands[4].id, Decimal("900.00"), Decimal("1999.00")),
        ]
        for name, sku, brand_id, cost, sell in frames_products_data:
            p = Product(
                admin_id=admin.id, category_id=categories[0].id,
                subcategory_id=subcategories[0].id,
                sku=sku, name=name, brand_id=brand_id,
                cost_price=cost, selling_price=sell,
            )
            db.add(p)
            products.append(p)

        # 5 Lenses
        lenses_products_data = [
            ("Essilor Single Vision 1.56", "LNS-SV-003", brands[2].id, Decimal("800.00"), Decimal("1499.00")),
            ("Zeiss Progressive BlueCut", "LNS-PG-004", brands[3].id, Decimal("3500.00"), Decimal("7999.00")),
            ("Crizal Prevencia 1.5", "LNS-CR-006", brands[0].id, Decimal("1200.00"), Decimal("2499.00")),
            ("Hoya Nulux 1.6", "LNS-HY-007", brands[1].id, Decimal("2000.00"), Decimal("4500.00")),
            ("Kodak Unique Progressive", "LNS-KD-008", brands[4].id, Decimal("3000.00"), Decimal("6000.00")),
        ]
        for name, sku, brand_id, cost, sell in lenses_products_data:
            p = Product(
                admin_id=admin.id, category_id=categories[1].id,
                subcategory_id=subcategories[2].id,
                sku=sku, name=name, brand_id=brand_id,
                cost_price=cost, selling_price=sell,
            )
            db.add(p)
            products.append(p)

        # 5 Accessories
        accs_products_data = [
            ("Premium Leather Case", "ACC-CS-005", brands[4].id, Decimal("200.00"), Decimal("499.00")),
            ("Microfiber Cleaning Cloth", "ACC-CL-006", brands[3].id, Decimal("20.00"), Decimal("99.00")),
            ("Anti-Fog Spray", "ACC-SP-007", brands[2].id, Decimal("80.00"), Decimal("199.00")),
            ("Spectacle Cord/Strap", "ACC-ST-008", brands[1].id, Decimal("50.00"), Decimal("149.00")),
            ("Screwdriver Repair Kit", "ACC-KT-009", brands[0].id, Decimal("100.00"), Decimal("299.00")),
        ]
        for name, sku, brand_id, cost, sell in accs_products_data:
            p = Product(
                admin_id=admin.id, category_id=categories[4].id,
                subcategory_id=subcategories[4].id,
                sku=sku, name=name, brand_id=brand_id,
                cost_price=cost, selling_price=sell,
            )
            db.add(p)
            products.append(p)

        await db.flush()

        # Add Frame details (5 records)
        for i in range(5):
            db.add(FrameProduct(
                product_id=products[i].id, frame_type="Full-Rim", shape="Aviator" if i % 2 == 0 else "Rectangle",
                material="Metal" if i % 2 == 0 else "Acetate", color="Gold" if i % 2 == 0 else "Matte Black",
                lens_width="58", bridge_width="14", temple_length="135", gender="Unisex", age_group="Adult",
            ))

        # Add Lens details (5 records)
        for i in range(5, 10):
            db.add(LensProduct(
                product_id=products[i].id, lens_type="Single Vision" if i < 7 else "Progressive",
                material="CR-39" if i < 7 else "MR-8", index_value="1.56" if i < 7 else "1.60",
                coating="Anti-Reflective" if i < 7 else "Multi-Coat", tint_color="Clear",
                uv_protection="UV400", blue_cut="No" if i < 7 else "Yes", photochromic="No", polarized="No",
            ))

        # Add Accessory details (5 records)
        for i in range(10, 15):
            db.add(AccessoryProduct(
                product_id=products[i].id, accessory_type="Case" if i == 10 else "Cloth" if i == 11 else "Spray" if i == 12 else "Cord" if i == 13 else "Kit",
                material="Leather" if i == 10 else "Microfiber" if i == 11 else "Liquid" if i == 12 else "Nylon" if i == 13 else "Metal",
                color="Brown" if i == 10 else "Blue" if i == 11 else "Clear" if i == 12 else "Black" if i == 13 else "Silver",
                size="Medium",
            ))
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 10. INVENTORIES (15) — one per product in store 1
        # ──────────────────────────────────────────────────────
        inventories = []
        for i, prod in enumerate(products):
            inv = Inventory(
                owner_type=OwnerType.STORE, owner_id=stores[0].id,
                product_id=prod.id, quantity=50 + i * 10,
                available_quantity=50 + i * 10, reorder_level=10,
            )
            db.add(inv)
            inventories.append(inv)
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 11. SUPPLIERS (5)
        # ──────────────────────────────────────────────────────
        suppliers_data = [
            ("Luxottica India Pvt Ltd",    "Rajesh Mehra",    "rajesh@luxottica.in",  "9880001001", "Mumbai",    "Maharashtra", "400001", "27AALCL1234B1Z5", 30),
            ("Essilor India Pvt Ltd",      "Priya Nair",      "priya@essilor.in",     "9880001002", "Bangalore", "Karnataka",   "560001", "29AALCE5678C1Z2", 45),
            ("Titan Eye+ Distribution",    "Vikash Reddy",    "vikash@titan.in",      "9880001003", "Hyderabad", "Telangana",   "500001", "36AALCT9012D1Z8", 30),
            ("Vision Express Wholesale",   "Anjali Sharma",   "anjali@visionexp.in",  "9880001004", "Delhi",     "Delhi",       "110001", "07AALCV3456E1Z4", 60),
            ("GKB Opticals Distributors",  "Suresh Patel",    "suresh@gkb.in",        "9880001005", "Ahmedabad", "Gujarat",     "380001", "24AALCG7890F1Z1", 30),
        ]
        suppliers = []
        for cn, cp, em, ph, city, state, pin, gst, cd in suppliers_data:
            sup = Supplier(
                admin_id=admin.id, company_name=cn, contact_person=cp,
                email=em, phone=ph, city=city, state=state, pincode=pin,
                gst_number=gst, credit_days=cd,
            )
            db.add(sup)
            suppliers.append(sup)
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 12. SUPPLIER STORE LINKS (5)
        # ──────────────────────────────────────────────────────
        for i in range(5):
            link = SupplierStoreLink(
                supplier_id=suppliers[i].id,
                store_id=stores[i].id,
                is_primary=(i == 0),  # first is primary
            )
            db.add(link)
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 13. SUPPLIER PRODUCTS (5)
        # ──────────────────────────────────────────────────────
        for i in range(5):
            sp = SupplierProduct(
                supplier_id=suppliers[i].id,
                product_id=products[i].id,
                supplier_sku=f"SUP-SKU-{i+1:03d}",
                unit_price=products[i].cost_price - Decimal("100"),
                minimum_order_quantity=5 + i * 2,
                lead_time_days=3 + i,
            )
            db.add(sp)
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 14. PURCHASE ORDERS (5) + ITEMS (5)
        # ──────────────────────────────────────────────────────
        purchase_orders = []
        po_items = []
        for i in range(5):
            qty = 20 + i * 5
            unit_price = products[i].cost_price
            line_total = (unit_price * qty).quantize(Decimal("0.01"))
            tax = (line_total * Decimal("0.18")).quantize(Decimal("0.01"))
            total = line_total + tax

            po = PurchaseOrder(
                po_number=f"PO-2026-{i+1:05d}",
                admin_id=admin.id,
                store_id=stores[i].id,
                supplier_id=suppliers[i].id,
                status=POStatus.RECEIVED if i < 3 else POStatus.DRAFT,
                order_date=date(2026, 5, 1 + i * 5),
                expected_delivery_date=date(2026, 5, 10 + i * 5),
                received_date=date(2026, 5, 9 + i * 5) if i < 3 else None,
                subtotal=line_total,
                tax_amount=tax,
                discount_amount=Decimal("0"),
                total_amount=total,
                paid_amount=total if i < 2 else Decimal("0"),
                due_amount=Decimal("0") if i < 2 else total,
                due_date=date(2026, 6, 1 + i * 5),
                created_by=admin.id,
            )
            db.add(po)
            purchase_orders.append(po)
        await db.flush()

        for i in range(5):
            qty = 20 + i * 5
            unit_price = products[i].cost_price
            line_total = (unit_price * qty * Decimal("1.18")).quantize(Decimal("0.01"))

            item = PurchaseOrderItem(
                purchase_order_id=purchase_orders[i].id,
                product_id=products[i].id,
                inventory_id=inventories[i].id,
                quantity_ordered=qty,
                quantity_received=qty if i < 3 else 0,
                unit_price=unit_price,
                tax_percent=Decimal("18.00"),
                discount_percent=Decimal("0"),
                line_total=line_total,
            )
            db.add(item)
            po_items.append(item)
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 15. SUPPLIER PAYMENTS (5)
        # ──────────────────────────────────────────────────────
        payment_methods = [
            SupplierPaymentMethod.BANK_TRANSFER,
            SupplierPaymentMethod.UPI,
            SupplierPaymentMethod.CHEQUE,
            SupplierPaymentMethod.CASH,
            SupplierPaymentMethod.CREDIT_NOTE,
        ]
        for i in range(5):
            amt = purchase_orders[i].paid_amount if i < 2 else Decimal("5000.00")
            sp = SupplierPayment(
                purchase_order_id=purchase_orders[i].id,
                supplier_id=suppliers[i].id,
                admin_id=admin.id,
                payment_date=date(2026, 5, 15 + i),
                amount=amt,
                payment_method=payment_methods[i],
                reference_number=f"REF-SUP-{i+1:04d}",
                remarks=f"Payment for PO-2026-{i+1:05d}",
                created_by=admin.id,
            )
            db.add(sp)
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 16. CUSTOMERS (5)
        # ──────────────────────────────────────────────────────
        customers_data = [
            ("Aarav",   "Deshmukh", "aarav@email.com",   "9860001001", "MALE",          "-2.50", "-1.00", "90",  "-2.00", "-0.75", "85"),
            ("Isha",    "Kulkarni", "isha@email.com",    "9860001002", "FEMALE",         "-3.00", "-0.50", "180", "-2.75", "-0.50", "175"),
            ("Rohan",   "Thakur",   "rohan@email.com",   "9860001003", "MALE",          "+1.50", "0.00",  "0",   "+1.25", "0.00",  "0"),
            ("Meera",   "Jain",     "meera@email.com",   "9860001004", "FEMALE",         "-4.00", "-1.50", "45",  "-3.50", "-1.25", "135"),
            ("Siddharth","Pawar",   "siddharth@email.com","9860001005","NOT_SPECIFIED",  "-1.00", "-0.25", "170", "-0.75", "0.00",  "0"),
        ]
        customers = []
        for fn, ln, em, ph, gnd, sr, cr, ar, sl, cl, al in customers_data:
            cust = Customer(
                admin_id=admin.id, first_name=fn, last_name=ln,
                email=em, phone=ph, gender=gnd,
                first_visit_store_id=stores[0].id,
                city="Pune", state="Maharashtra", pincode="411001",
                prescription_sph_right=sr, prescription_cyl_right=cr,
                prescription_axis_right=ar,
                prescription_sph_left=sl, prescription_cyl_left=cl,
                prescription_axis_left=al,
                prescription_add="+1.00" if fn == "Rohan" else None,
                prescription_date=date(2026, 4, 15),
            )
            db.add(cust)
            customers.append(cust)
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 17. SALES (5) + SALE ITEMS (5) + SALE PAYMENTS (5)
        # ──────────────────────────────────────────────────────
        sales = []
        for i in range(5):
            qty = 1 + i
            unit_price = products[i].selling_price
            tax_pct = Decimal("18.00")
            base = unit_price * qty
            tax_amt = (base * tax_pct / Decimal("100")).quantize(Decimal("0.01"))
            total = (base + tax_amt).quantize(Decimal("0.01"))

            inv_num = f"INV-2026-{i+1:05d}"
            sale = Sale(
                invoice_number=inv_num,
                admin_id=admin.id,
                store_id=stores[0].id,
                customer_id=customers[i].id,
                sold_by_type=StaffType.MANAGER,
                sold_by_id=managers[0].id,
                sale_date=date(2026, 5, 20 + i),
                status=SaleStatus.COMPLETED,
                subtotal=base.quantize(Decimal("0.01")),
                discount_amount=Decimal("0"),
                tax_amount=tax_amt,
                total_amount=total,
                paid_amount=total,
                due_amount=Decimal("0"),
                loyalty_points_earned=int(total // Decimal("100")),
                loyalty_points_redeemed=0,
            )
            db.add(sale)
            sales.append(sale)
        await db.flush()

        for i in range(5):
            qty = 1 + i
            unit_price = products[i].selling_price
            tax_pct = Decimal("18.00")
            base = unit_price * qty
            tax_amt = (base * tax_pct / Decimal("100")).quantize(Decimal("0.01"))
            line_total = (base + tax_amt).quantize(Decimal("0.01"))

            si = SaleItem(
                sale_id=sales[i].id,
                product_id=products[i].id,
                inventory_id=inventories[i].id,
                quantity=qty,
                unit_price=unit_price,
                unit_cost=products[i].cost_price,
                discount_percent=Decimal("0"),
                tax_percent=tax_pct,
                line_total=line_total,
            )
            db.add(si)
        await db.flush()

        sale_pay_methods = [
            SalePaymentMethod.CASH,
            SalePaymentMethod.CARD,
            SalePaymentMethod.UPI,
            SalePaymentMethod.BANK_TRANSFER,
            SalePaymentMethod.CASH,
        ]
        for i in range(5):
            sp = SalePayment(
                sale_id=sales[i].id,
                amount=sales[i].total_amount,
                payment_method=sale_pay_methods[i],
                reference_number=f"REF-SALE-{i+1:04d}" if i > 0 else None,
                remarks=f"Full payment for {sales[i].invoice_number}",
            )
            db.add(sp)
        await db.flush()

        # ──────────────────────────────────────────────────────
        # 18. INVENTORY TRANSACTIONS (5) — sale transactions
        # ──────────────────────────────────────────────────────
        for i in range(5):
            qty = 1 + i
            txn = InventoryTransaction(
                inventory_id=inventories[i].id,
                product_id=products[i].id,
                transaction_type=TransactionType.SALE,
                quantity=qty,
                reference_id=sales[i].id,
                remarks=f"Sale {sales[i].invoice_number}",
                created_by=managers[0].id,
            )
            db.add(txn)

        # ── Commit everything ─────────────────────────────────
        await db.commit()

        print("=" * 60)
        print("  [SUCCESS] DATABASE SEEDED SUCCESSFULLY!")
        print("=" * 60)
        print()
        print(f"  Admins: {len(admins)} (e.g. parthsoni@gmail.com / 123456)")
        print(f"  Roles: {len(roles)}")
        print(f"  Refresh Tokens: 5")
        print(f"  Stores: {len(stores)}")
        print(f"  Managers: {len(managers)}")
        print(f"  Workers: {len(workers)}")
        print(f"  Opticians: {len(opticians)}")
        print(f"  Brands: {len(brands)}")
        print(f"  Categories: {len(categories)}")
        print(f"  Products: {len(products)} (5 Frames, 5 Lenses, 5 Accessories)")
        print(f"  Frame Products: 5")
        print(f"  Lens Products: 5")
        print(f"  Accessory Products: 5")
        print(f"  Inventories: {len(inventories)}")
        print(f"  Suppliers: {len(suppliers)}")
        print(f"  Supplier-Store Links: 5")
        print(f"  Supplier Products: 5")
        print(f"  Purchase Orders: {len(purchase_orders)}")
        print(f"  PO Items: 5")
        print(f"  Supplier Payments: 5")
        print(f"  Customers: {len(customers)}")
        print(f"  Sales: {len(sales)}")
        print(f"  Sale Items: 5")
        print(f"  Sale Payments: 5")
        print(f"  Inventory Transactions: 5")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed())
