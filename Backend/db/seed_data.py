# Seed script: seed_data.py
# Seeds 5 admins, 5 stores, 5 workers, 5 opticians, 5 managers
# + 5 brands, 5 categories, 5 subcategories, 5 products (with extensions),
#   5 inventories, 5 inventory transactions
import asyncio
import sys
from datetime import date, datetime, timedelta, timezone
import uuid
from pathlib import Path    

_backend_dir = Path(__file__).resolve().parent.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import hash_password
from db.session import async_session_maker, engine
from models.admin import Admin
from models.store import Store
from models.worker import Worker
from models.optician import Optician
from models.manager import Manager
from models.role import Role
from models.brand import Brand
from models.category import Category 
from models.subcategory import Subcategory
from models.product import Product
from models.frame_product import FrameProduct
from models.lens_product import LensProduct
from models.accessory_product import AccessoryProduct
from models.inventory import Inventory, OwnerType
from models.inventory_transaction import InventoryTransaction, TransactionType

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
from models.refresh_token import RefreshToken
from models.expense import Expense, ExpenseOwnerType, ExpensePaymentMethod, ExpenseRecordedByType
from models.expense_category import ExpenseCategory
from models.loyalty_config import LoyaltyConfig
from models.lab import Lab
from models.store_category_loyalty import StoreCategoryLoyalty
from models.loyalty_transaction import LoyaltyTransaction, LoyaltyTransactionType
from models.customer import CustomerMembershipTier

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

# ── Brands — all linked to admin[0] (Visionary Optics) ─────────
BRANDS = [
    {"name": "Ray-Ban"},
    {"name": "Titan Eyeplus"},
    {"name": "Lenskart Hustle"},
    {"name": "John Jacobs"},
    {"name": "Vincent Chase"},
]

# ── Categories — all linked to admin[0] ────────────────────────
CATEGORIES = [
    {"name": "Frames",       "description": "Eyeglass and sunglass frames"},
    {"name": "Lenses",       "description": "Prescription and non-prescription lenses"},
    {"name": "Sunglasses",   "description": "UV-protection and fashion sunglasses"},
    {"name": "Contact Lenses", "description": "Daily, monthly and yearly contact lenses"},
    {"name": "Accessories",  "description": "Cases, cloths, chains and solutions"},
]

# ── Subcategories — linked to categories by index ──────────────
SUBCATEGORIES = [
    {"category_index": 0, "name": "Full-Rim Frames",   "description": "Complete rim around the lenses"},
    {"category_index": 0, "name": "Half-Rim Frames",   "description": "Rim on the top half only"},
    {"category_index": 1, "name": "Single Vision",     "description": "Single focal point lenses"},
    {"category_index": 1, "name": "Progressive",       "description": "Multi-focal seamless gradient"},
    {"category_index": 4, "name": "Eyeglass Cases",    "description": "Protective storage cases"},
]

# ── Products — 2 frames, 2 lenses, 1 accessory ────────────────
PRODUCTS = [
    # Frames (5)
    {
        "sku": "FRM-RB-001",
        "name": "Ray-Ban Aviator Classic",
        "category_index": 0,
        "subcategory_index": 0,
        "brand_index": 0,
        "cost_price": 3200.00,
        "selling_price": 5999.00,
        "discount_percent": 15.00,
        "warranty_months": 24,
        "type": "frame",
        "details": {
            "frame_type": "Full-Rim",
            "shape": "Aviator",
            "material": "Metal",
            "color": "Gold",
            "lens_width": "58",
            "bridge_width": "14",
            "temple_length": "135",
            "gender": "Unisex",
            "age_group": "Adult",
        },
    },
    {
        "sku": "FRM-TE-001",
        "name": "Titan Eyeplus Rectangle",
        "category_index": 0,
        "subcategory_index": 1,
        "brand_index": 1,
        "cost_price": 1800.00,
        "selling_price": 3499.00,
        "discount_percent": 10.00,
        "warranty_months": 12,
        "type": "frame",
        "details": {
            "frame_type": "Half-Rim",
            "shape": "Rectangle",
            "material": "TR-90",
            "color": "Matte Black",
            "lens_width": "52",
            "bridge_width": "18",
            "temple_length": "140",
            "gender": "Male",
            "age_group": "Adult",
        },
    },
    {
        "sku": "FRM-RB-002",
        "name": "Ray-Ban Wayfarer Classic",
        "category_index": 0,
        "subcategory_index": 0,
        "brand_index": 0,
        "cost_price": 3500.00,
        "selling_price": 6499.00,
        "type": "frame",
        "details": {
            "frame_type": "Full-Rim",
            "shape": "Wayfarer",
            "material": "Acetate",
            "color": "Glossy Black",
            "lens_width": "50",
            "bridge_width": "22",
            "temple_length": "150",
            "gender": "Unisex",
            "age_group": "Adult",
        },
    },
    {
        "sku": "FRM-JJ-001",
        "name": "John Jacobs Round Metal",
        "category_index": 0,
        "subcategory_index": 0,
        "brand_index": 3,
        "cost_price": 2200.00,
        "selling_price": 4199.00,
        "type": "frame",
        "details": {
            "frame_type": "Full-Rim",
            "shape": "Round",
            "material": "Metal",
            "color": "Rose Gold",
            "lens_width": "48",
            "bridge_width": "20",
            "temple_length": "145",
            "gender": "Female",
            "age_group": "Adult",
        },
    },
    {
        "sku": "FRM-VC-001",
        "name": "Vincent Chase Cat-Eye Classic",
        "category_index": 0,
        "subcategory_index": 0,
        "brand_index": 4,
        "cost_price": 1200.00,
        "selling_price": 2499.00,
        "type": "frame",
        "details": {
            "frame_type": "Full-Rim",
            "shape": "Cat-Eye",
            "material": "TR-90",
            "color": "Red",
            "lens_width": "51",
            "bridge_width": "16",
            "temple_length": "138",
            "gender": "Female",
            "age_group": "Adult",
        },
    },
    # Lenses (5)
    {
        "sku": "LNS-SV-001",
        "name": "CR-39 Single Vision 1.56",
        "category_index": 1,
        "subcategory_index": 2,
        "brand_index": 2,
        "cost_price": 450.00,
        "selling_price": 999.00,
        "type": "lens",
        "details": {
            "lens_type": "Single Vision",
            "material": "CR-39",
            "index_value": "1.56",
            "coating": "Anti-Reflective",
            "tint_color": "Clear",
            "uv_protection": "UV400",
            "blue_cut": "No",
            "photochromic": "No",
            "polarized": "No",
        },
    },
    {
        "sku": "LNS-PG-001",
        "name": "Polycarbonate Progressive 1.60",
        "category_index": 1,
        "subcategory_index": 3,
        "brand_index": 2,
        "cost_price": 1800.00,
        "selling_price": 3999.00,
        "type": "lens",
        "details": {
            "lens_type": "Progressive",
            "material": "Polycarbonate",
            "index_value": "1.60",
            "coating": "HMC Multi-Coat",
            "tint_color": "Clear",
            "uv_protection": "UV400",
            "blue_cut": "Yes",
            "photochromic": "Yes",
            "polarized": "No",
        },
    },
    {
        "sku": "LNS-SV-002",
        "name": "CR-39 Single Vision Blue-Cut 1.56",
        "category_index": 1,
        "subcategory_index": 2,
        "brand_index": 2,
        "cost_price": 600.00,
        "selling_price": 1499.00,
        "type": "lens",
        "details": {
            "lens_type": "Single Vision",
            "material": "CR-39",
            "index_value": "1.56",
            "coating": "Anti-Reflective",
            "tint_color": "Clear",
            "uv_protection": "UV400",
            "blue_cut": "Yes",
            "photochromic": "No",
            "polarized": "No",
        },
    },
    {
        "sku": "LNS-PG-002",
        "name": "High Index Progressive 1.67",
        "category_index": 1,
        "subcategory_index": 3,
        "brand_index": 2,
        "cost_price": 2800.00,
        "selling_price": 5999.00,
        "type": "lens",
        "details": {
            "lens_type": "Progressive",
            "material": "High Index Plastic",
            "index_value": "1.67",
            "coating": "Super Hydrophobic",
            "tint_color": "Clear",
            "uv_protection": "UV400",
            "blue_cut": "Yes",
            "photochromic": "Yes",
            "polarized": "No",
        },
    },
    {
        "sku": "LNS-BF-001",
        "name": "Bifocal D-Segment 1.50",
        "category_index": 1,
        "subcategory_index": 2,
        "brand_index": 2,
        "cost_price": 800.00,
        "selling_price": 1999.00,
        "type": "lens",
        "details": {
            "lens_type": "Bifocal",
            "material": "CR-39",
            "index_value": "1.50",
            "coating": "Scratch-Resistant",
            "tint_color": "Clear",
            "uv_protection": "UV380",
            "blue_cut": "No",
            "photochromic": "No",
            "polarized": "No",
        },
    },
    # Accessories (5)
    {
        "sku": "ACC-CS-001",
        "name": "Premium Leather Hard Case",
        "category_index": 4,
        "subcategory_index": 4,
        "brand_index": 3,
        "cost_price": 250.00,
        "selling_price": 599.00,
        "type": "accessory",
        "details": {
            "accessory_type": "Hard Case",
            "material": "Genuine Leather",
            "color": "Brown",
            "size": "Standard (160x70x40 mm)",
        },
    },
    {
        "sku": "ACC-CS-002",
        "name": "Microfiber Cleaning Cloth",
        "category_index": 4,
        "subcategory_index": 4,
        "brand_index": 3,
        "cost_price": 20.00,
        "selling_price": 99.00,
        "type": "accessory",
        "details": {
            "accessory_type": "Cleaning Cloth",
            "material": "Microfiber",
            "color": "Blue",
            "size": "150x150 mm",
        },
    },
    {
        "sku": "ACC-CS-003",
        "name": "Anti-Fog Spray Solution",
        "category_index": 4,
        "subcategory_index": 4,
        "brand_index": 3,
        "cost_price": 50.00,
        "selling_price": 199.00,
        "type": "accessory",
        "details": {
            "accessory_type": "Cleaning Spray",
            "material": "Liquid Solution",
            "color": "Clear",
            "size": "50 ml",
        },
    },
    {
        "sku": "ACC-CS-004",
        "name": "Eyeglass Repair Kit",
        "category_index": 4,
        "subcategory_index": 4,
        "brand_index": 3,
        "cost_price": 80.00,
        "selling_price": 299.00,
        "type": "accessory",
        "details": {
            "accessory_type": "Repair Kit",
            "material": "Mixed Metal/Plastic",
            "color": "Silver",
            "size": "Pocket Size",
        },
    },
    {
        "sku": "ACC-CS-005",
        "name": "Sport Eyewear Strap",
        "category_index": 4,
        "subcategory_index": 4,
        "brand_index": 3,
        "cost_price": 40.00,
        "selling_price": 149.00,
        "type": "accessory",
        "details": {
            "accessory_type": "Strap",
            "material": "Neoprene",
            "color": "Black",
            "size": "Adjustable",
        },
    },
    {
        "sku": "GENERIC-OPTICAL",
        "name": "Custom Optical Item",
        "category_index": 0,
        "subcategory_index": 0,
        "brand_index": 0,
        "cost_price": 0.00,
        "selling_price": 0.00,
        "type": "frame",
        "details": {
            "frame_type": "Full-Rim",
            "shape": "Custom",
            "material": "Custom",
            "color": "Custom",
            "lens_width": "0",
            "bridge_width": "0",
            "temple_length": "0",
            "gender": "Unisex",
            "age_group": "Adult",
        },
    },
]

# ── Inventories — admin warehouse + store stock for each product
# These will be created programmatically in the seed function.

# ── Inventory Transactions — purchase + admin-to-store transfers
# These will be created programmatically in the seed function.


# ── Suppliers Data ─────────────────────────────────────────────
SUPPLIERS_DATA = [
    {
        "company_name": "Visionary Optical Supplies",
        "contact_person": "Vikram Patel",
        "email": "contact@visionarysupplies.com",
        "phone": "9998887771",
        "address": "101 Industrial Area, Phase II",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "pincode": "380009",
    },
    {
        "company_name": "Delhi Lens Distributors",
        "contact_person": "Ramesh Gupta",
        "email": "sales@delhilens.com",
        "phone": "9998887772",
        "address": "42 Darya Ganj",
        "city": "New Delhi",
        "state": "Delhi",
        "pincode": "110002",
    },
    {
        "company_name": "Karnataka Frame Tech",
        "contact_person": "Sharat Hegde",
        "email": "info@frametech.in",
        "phone": "9998887773",
        "address": "15/B Peenya Industrial Area",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560058",
    },
    {
        "company_name": "Mumbai Opti-Tech Accessories",
        "contact_person": "Anjali Mehta",
        "email": "orders@mumbaioptitech.com",
        "phone": "9998887774",
        "address": "Shreeji Chambers, Opera House",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400004",
    },
    {
        "company_name": "Chennai LensCraft Wholesale",
        "contact_person": "M. Kumar",
        "email": "kumar@chennailenscraft.com",
        "phone": "9998887775",
        "address": "88 Mount Road",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "pincode": "600002",
    },
]

# ── Customers Data ─────────────────────────────────────────────
CUSTOMERS_DATA = [
    {
        "first_name": "Aarav",
        "last_name": "Mehta",
        "email": "aarav.mehta@gmail.com",
        "phone": "9876500001",
        "gender": CustomerGender.MALE,
        "date_of_birth": date(1990, 5, 15),
        "address": "101, Residency Road",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "remark": "Customer prefers contact via email"
    },
    {
        "first_name": "Diya",
        "last_name": "Patel",
        "email": "diya.patel@gmail.com",
        "phone": "9876500002",
        "gender": CustomerGender.FEMALE,
        "date_of_birth": date(1985, 10, 22),
        "address": "202, SV Road, Bandra",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400050",
        "remark": "Needs progressives with high addition power"
    },
    {
        "first_name": "Kabir",
        "last_name": "Sharma",
        "email": "kabir.sharma@gmail.com",
        "phone": "9876500003",
        "gender": CustomerGender.MALE,
        "date_of_birth": date(1995, 3, 3),
        "address": "Flat 4A, Green Glades",
        "city": "Pune",
        "state": "Maharashtra",
        "pincode": "411001",
        "remark": "Requires lightweight frames (titanium)"
    },
    {
        "first_name": "Ira",
        "last_name": "Singh",
        "email": "ira.singh@gmail.com",
        "phone": "9876500004",
        "gender": CustomerGender.FEMALE,
        "date_of_birth": date(2000, 12, 1),
        "address": "Sector 15, Vashi",
        "city": "Navi Mumbai",
        "state": "Maharashtra",
        "pincode": "400703",
        "remark": "Student discount applies"
    },
    {
        "first_name": "Reyansh",
        "last_name": "Joshi",
        "email": "reyansh.joshi@gmail.com",
        "phone": "9876500005",
        "gender": CustomerGender.MALE,
        "date_of_birth": date(1978, 7, 8),
        "address": "78, Mahatma Gandhi Road",
        "city": "Bangalore",
        "state": "Karnataka",
        "pincode": "560001",
        "remark": "Prefers photochromic lenses"
    },
]

PRESCRIPTIONS_DATA = [
    {
        "sph_right": "-1.50", "cyl_right": "-0.50", "axis_right": "180",
        "sph_left": "-1.75", "cyl_left": "-0.25", "axis_left": "170",
        "addition": "+1.50", "pupillary_distance": "63",
        "prescription_date": date(2025, 1, 10), "notes": "Initial prescription"
    },
    {
        "sph_right": "-2.00", "cyl_right": "-0.75", "axis_right": "180",
        "sph_left": "-2.25", "cyl_left": "-0.50", "axis_left": "170",
        "addition": "+1.75", "pupillary_distance": "63",
        "prescription_date": date(2025, 6, 5), "notes": "Updated prescription, spherical power increased slightly"
    },
    {
        "sph_right": "+0.50", "cyl_right": "0.00", "axis_right": "0",
        "sph_left": "+0.50", "cyl_left": "0.00", "axis_left": "0",
        "addition": "+2.00", "pupillary_distance": "64",
        "prescription_date": date(2025, 2, 20), "notes": "Reading glasses prescription"
    },
    {
        "sph_right": "-0.75", "cyl_right": "-0.25", "axis_right": "90",
        "sph_left": "-0.75", "cyl_left": "-0.25", "axis_left": "90",
        "addition": None, "pupillary_distance": "62",
        "prescription_date": date(2025, 3, 15), "notes": "Distance vision prescription"
    },
    {
        "sph_right": "-3.00", "cyl_right": "-1.25", "axis_right": "165",
        "sph_left": "-2.75", "cyl_left": "-1.00", "axis_left": "15",
        "addition": "+2.25", "pupillary_distance": "65",
        "prescription_date": date(2025, 4, 1), "notes": "Progressive lens recommendation"
    },
]

EXPENSE_CATEGORIES_DATA = [
    {"name": "Rent", "description": "Monthly office or store retail space rental payments"},
    {"name": "Electricity", "description": "Utility bill payments for power consumption"},
    {"name": "Staff Salaries", "description": "Monthly wages, salary, or advances paid to store staff"},
    {"name": "Marketing & Ads", "description": "Local offline flyer distribution or online ad campaigns"},
    {"name": "Store Supplies & Stationery", "description": "Purchase of notebooks, pens, cleaning supplies, etc."},
]

EXPENSES_DATA = [
    {
        "title": "Monthly Retail Store Rent",
        "description": "Paid to landlord for retail store space",
        "amount": 25000.00,
        "expense_date": date(2025, 6, 1),
        "payment_method": ExpensePaymentMethod.BANK_TRANSFER,
        "reference_number": "TXN-RENT-001",
        "is_recurring": True,
        "recurring_interval": "MONTHLY",
        "owner_type": ExpenseOwnerType.STORE,
        "recorded_by_type": ExpenseRecordedByType.MANAGER,
        "incurred_by_type": None,
        "is_approved": True,
    },
    {
        "title": "May Electricity Bill",
        "description": "Utility power payment for store branch",
        "amount": 4250.00,
        "expense_date": date(2025, 6, 5),
        "payment_method": ExpensePaymentMethod.UPI,
        "reference_number": "TXN-ELEC-002",
        "is_recurring": False,
        "owner_type": ExpenseOwnerType.STORE,
        "recorded_by_type": ExpenseRecordedByType.WORKER,
        "incurred_by_type": None,
        "is_approved": False,
    },
    {
        "title": "Monthly Optician Wage",
        "description": "Salary payout for primary store optician",
        "amount": 35000.00,
        "expense_date": date(2025, 6, 5),
        "payment_method": ExpensePaymentMethod.BANK_TRANSFER,
        "reference_number": "TXN-SAL-003",
        "is_recurring": True,
        "recurring_interval": "MONTHLY",
        "owner_type": ExpenseOwnerType.STORE,
        "recorded_by_type": ExpenseRecordedByType.ADMIN,
        "incurred_by_type": ExpenseRecordedByType.OPTICIAN,
        "is_approved": True,
    },
    {
        "title": "Local Ad Banner Campaign",
        "description": "Head office marketing expenditure for business branding",
        "amount": 12500.00,
        "expense_date": date(2025, 6, 2),
        "payment_method": ExpensePaymentMethod.CARD,
        "reference_number": "TXN-MKT-004",
        "is_recurring": False,
        "owner_type": ExpenseOwnerType.ADMIN,
        "recorded_by_type": ExpenseRecordedByType.ADMIN,
        "incurred_by_type": None,
        "is_approved": True,
    },
    {
        "title": "Stationery & Cleaning Supplies",
        "description": "Reimbursement for store purchase of stationery and floor cleaner",
        "amount": 750.00,
        "expense_date": date(2025, 6, 8),
        "payment_method": ExpensePaymentMethod.CASH,
        "reference_number": "TXN-SUP-005",
        "is_recurring": False,
        "owner_type": ExpenseOwnerType.STORE,
        "recorded_by_type": ExpenseRecordedByType.WORKER,
        "incurred_by_type": ExpenseRecordedByType.WORKER,
        "is_approved": False,
    },
]

# ===============================================================
#  SEED FUNCTIONS
# ===============================================================

def _expand_list(lst, target=30):
    original_len = len(lst)
    if original_len == 0 or original_len >= target:
        return
    for i in range(original_len, target):
        base_item = lst[i % original_len]
        new_item = dict(base_item)
        if "email" in new_item and new_item["email"]:
            parts = new_item["email"].split("@")
            new_item["email"] = f"{parts[0]}{i+1}@{parts[1]}"
        if "phone" in new_item and new_item["phone"]:
            new_item["phone"] = f"9{str(i+1).zfill(9)}"
        if "business_name" in new_item and new_item["business_name"]:
            new_item["business_name"] = f"{base_item['business_name']} {i+1}"
        if "store_code" in new_item and new_item["store_code"]:
            new_item["store_code"] = f"{base_item['store_code']}-{i+1}"
        if "employee_code" in new_item and new_item["employee_code"]:
            new_item["employee_code"] = f"{base_item['employee_code']}-{i+1}"
        if "sku" in new_item and new_item["sku"]:
            new_item["sku"] = f"{base_item['sku']}-{i+1}"
        if "name" in new_item and new_item["name"]:
            new_item["name"] = f"{base_item['name']} {i+1}"
        if "company_name" in new_item and new_item["company_name"]:
            new_item["company_name"] = f"{base_item['company_name']} {i+1}"
        if "category_index" in new_item:
            new_item["category_index"] = i % target
        if "subcategory_index" in new_item:
            new_item["subcategory_index"] = i % target
        if "brand_index" in new_item:
            new_item["brand_index"] = i % target
        lst.append(new_item)

_expand_list(ADMINS)
_expand_list(STORES)
_expand_list(WORKERS)
_expand_list(OPTICIANS)
_expand_list(MANAGERS)
_expand_list(BRANDS)
_expand_list(CATEGORIES)
_expand_list(SUBCATEGORIES)
_expand_list(PRODUCTS)
_expand_list(SUPPLIERS_DATA)
_expand_list(CUSTOMERS_DATA)
_expand_list(PRESCRIPTIONS_DATA)
_expand_list(EXPENSE_CATEGORIES_DATA)
_expand_list(EXPENSES_DATA)

async def seed() -> None:
    async with async_session_maker() as session:
        admin_ids: list[int] = []
        store_ids: list[int] = []

        # ── 0. Seed roles ──────────────────────────────────────
        print("\n" + "=" * 60)
        print("  Seeding Roles")
        print("=" * 60)
        role_map = {}
        for role_name in ["admin", "manager", "worker", "optician", "cashier"]:
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

        # ── 6. Seed brands ─────────────────────────────────────
        print("\n" + "=" * 60)
        print("  Seeding Brands for all Admins")
        print("=" * 60)
        admin_brand_map = {}
        for admin_id in admin_ids:
            brand_ids = []
            for data in BRANDS:
                stmt = select(Brand).where(
                    Brand.name == data["name"],
                    Brand.admin_id == admin_id,
                )
                result = await session.execute(stmt)
                existing = result.scalar_one_or_none()
                if existing:
                    brand_ids.append(existing.id)
                    continue

                brand = Brand(
                    admin_id=admin_id,
                    name=data["name"],
                )
                session.add(brand)
                await session.flush()
                brand_ids.append(brand.id)
            admin_brand_map[admin_id] = brand_ids
            print(f"  [OK] seeded brands for Admin ID={admin_id}")

        # ── 7. Seed categories ─────────────────────────────────
        print("\n" + "=" * 60)
        print("  Seeding Categories for all Admins")
        print("=" * 60)
        admin_category_map = {}
        for admin_id in admin_ids:
            category_ids = []
            for data in CATEGORIES:
                stmt = select(Category).where(
                    Category.name == data["name"],
                    Category.admin_id == admin_id,
                )
                result = await session.execute(stmt)
                existing = result.scalar_one_or_none()
                if existing:
                    category_ids.append(existing.id)
                    continue

                category = Category(
                    admin_id=admin_id,
                    name=data["name"],
                    description=data.get("description"),
                )
                session.add(category)
                await session.flush()
                category_ids.append(category.id)
            admin_category_map[admin_id] = category_ids
            print(f"  [OK] seeded categories for Admin ID={admin_id}")

        # ── 8. Seed LoyaltyConfig ──────────────────────────────
        print("\n" + "=" * 60)
        print("  Seeding LoyaltyConfig for all Stores")
        print("=" * 60)
        for store_id in store_ids:
            stmt = select(LoyaltyConfig).where(LoyaltyConfig.store_id == store_id)
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            if existing:
                print(f"  [SKIP] LoyaltyConfig for Store ID={store_id} (already exists)")
                continue

            loyalty_config = LoyaltyConfig(
                store_id=store_id,
                category_points_enabled=True,
                price_points_enabled=True,
                price_interval=200,
                price_points=50,
                points_per_rupee=50,
                min_redemption_points=50,
                silver_max=5000,
                gold_max=15000,
            )
            session.add(loyalty_config)
            print(f"  [OK]   LoyaltyConfig for Store ID={store_id}")
        
        # ── 9. Seed StoreCategoryLoyalty ───────────────────────
        print("\n" + "=" * 60)
        print("  Seeding StoreCategoryLoyalty for all Stores and Categories")
        print("=" * 60)
        for store_id in store_ids:
            # Fetch the categories for the admin associated with this store
            # Assuming a 1-to-1 mapping of store_ids to admin_ids for simplicity in seed data
            admin_id = admin_ids[store_ids.index(store_id)]
            category_ids = admin_category_map[admin_id]
            for category_id in category_ids:
                stmt = select(StoreCategoryLoyalty).where(
                    StoreCategoryLoyalty.store_id == store_id,
                    StoreCategoryLoyalty.category_id == category_id,
                )
                result = await session.execute(stmt)
                existing = result.scalar_one_or_none()
                if existing:
                    # print(f"  [SKIP] StoreCategoryLoyalty for Store {store_id}, Category {category_id} (already exists)")
                    continue

                store_cat_loyalty = StoreCategoryLoyalty(
                    store_id=store_id,
                    category_id=category_id,
                    points_per_unit=50,
                    is_enabled=True,
                )
                session.add(store_cat_loyalty)
            print(f"  [OK]   StoreCategoryLoyalty for Store ID={store_id}")

        # ── 10. Seed subcategories ──────────────────────────────
        print("\n" + "=" * 60)
        print("  Seeding Subcategories for all Admins")
        print("=" * 60)
        admin_subcategory_map = {}
        for admin_id in admin_ids:
            category_ids = admin_category_map[admin_id]
            subcategory_ids = []
            for data in SUBCATEGORIES:
                cat_id = category_ids[data["category_index"]]
                stmt = select(Subcategory).where(
                    Subcategory.name == data["name"],
                    Subcategory.category_id == cat_id,
                )
                result = await session.execute(stmt)
                existing = result.scalar_one_or_none()
                if existing:
                    subcategory_ids.append(existing.id)
                    continue

                subcategory = Subcategory(
                    category_id=cat_id,
                    name=data["name"],
                    description=data.get("description"),
                )
                session.add(subcategory)
                await session.flush()
                subcategory_ids.append(subcategory.id)
            admin_subcategory_map[admin_id] = subcategory_ids
            print(f"  [OK] seeded subcategories for Admin ID={admin_id}")

        # ── 9. Seed products + extensions ──────────────────────
        print("\n" + "=" * 60)
        print("  Seeding Products for all Admins")
        print("=" * 60)
        admin_product_map = {}
        for admin_id in admin_ids:
            category_ids = admin_category_map[admin_id]
            subcategory_ids = admin_subcategory_map[admin_id]
            brand_ids = admin_brand_map[admin_id]
            product_ids = []

            for data in PRODUCTS:
                # Suffix SKU to ensure global SKU uniqueness per admin
                sku = f"{data['sku']}-A{admin_id}"
                stmt = select(Product).where(Product.sku == sku)
                result = await session.execute(stmt)
                existing = result.scalar_one_or_none()
                if existing:
                    product_ids.append(existing.id)
                    continue

                product = Product(
                    admin_id=admin_id,
                    category_id=category_ids[data["category_index"]],
                    subcategory_id=subcategory_ids[data["subcategory_index"]],
                    sku=sku,
                    name=data["name"],
                    brand_id=brand_ids[data["brand_index"]],
                    cost_price=data["cost_price"],
                    selling_price=data["selling_price"],
                    discount_percent=data.get("discount_percent", 0.00),
                    warranty_months=data.get("warranty_months", 0),
                )
                session.add(product)
                await session.flush()
                product_ids.append(product.id)

                # Create type-specific extension
                if data["type"] == "frame":
                    ext = FrameProduct(product_id=product.id, **data["details"])
                    session.add(ext)
                elif data["type"] == "lens":
                    ext = LensProduct(product_id=product.id, **data["details"])
                    session.add(ext)
                elif data["type"] == "accessory":
                    ext = AccessoryProduct(product_id=product.id, **data["details"])
                    session.add(ext)

            admin_product_map[admin_id] = product_ids
            print(f"  [OK] seeded products for Admin ID={admin_id}")

        await session.commit()

        # ── 10. Seed inventories (admin warehouse + store) ─────
        print("\n" + "=" * 60)
        print("  Seeding Inventories for all Admins & Stores")
        print("=" * 60)
        admin_inv_map = {}
        store_inv_map = {}
        warehouse_quantities = [50, 40, 60, 70, 80, 200, 100, 150, 120, 180, 150, 300, 250, 100, 80, 100]
        store_quantities     = [10,  8, 12, 14, 16,  50,  20,  30,  24,  36,  30,  60,  50,  20, 16, 100]

        for idx, admin_id in enumerate(admin_ids):
            product_ids = admin_product_map[admin_id]
            store_id = store_ids[idx]
            admin_invs = []
            store_invs = []

            for i, pid in enumerate(product_ids):
                # Admin warehouse inventory
                stmt = select(Inventory).where(
                    Inventory.owner_type == OwnerType.ADMIN,
                    Inventory.owner_id == admin_id,
                    Inventory.product_id == pid,
                )
                result = await session.execute(stmt)
                existing = result.scalar_one_or_none()
                if existing:
                    admin_invs.append(existing.id)
                else:
                    wh_qty = warehouse_quantities[i % len(warehouse_quantities)]
                    inv = Inventory(
                        owner_type=OwnerType.ADMIN,
                        owner_id=admin_id,
                        product_id=pid,
                        quantity=wh_qty,
                        available_quantity=wh_qty,
                        reserved_quantity=0,
                        reorder_level=10,
                        last_purchase_price=PRODUCTS[i % len(PRODUCTS)]["cost_price"],
                    )
                    session.add(inv)
                    await session.flush()
                    admin_invs.append(inv.id)

                # Store inventory
                stmt = select(Inventory).where(
                    Inventory.owner_type == OwnerType.STORE,
                    Inventory.owner_id == store_id,
                    Inventory.product_id == pid,
                )
                result = await session.execute(stmt)
                existing = result.scalar_one_or_none()
                if existing:
                    store_invs.append(existing.id)
                else:
                    st_qty = store_quantities[i % len(store_quantities)]
                    inv = Inventory(
                        owner_type=OwnerType.STORE,
                        owner_id=store_id,
                        product_id=pid,
                        quantity=st_qty,
                        available_quantity=st_qty,
                        reserved_quantity=0,
                        reorder_level=10,
                    )
                    session.add(inv)
                    await session.flush()
                    store_invs.append(inv.id)

            admin_inv_map[admin_id] = admin_invs
            store_inv_map[store_id] = store_invs
            print(f"  [OK] seeded inventories for Admin ID={admin_id}, Store ID={store_id}")

        await session.commit()

        # ── 11. Seed inventory transactions ────────────────────
        print("\n" + "=" * 60)
        print("  Seeding Inventory Transactions for all Admins & Stores")
        print("=" * 60)
        # Check if transactions already exist
        stmt = select(InventoryTransaction).limit(1)
        result = await session.execute(stmt)
        if result.scalar_one_or_none():
            print("  [SKIP] Transactions already exist, skipping")
        else:
            for idx, admin_id in enumerate(admin_ids):
                product_ids = admin_product_map[admin_id]
                store_id = store_ids[idx]
                admin_inv_ids = admin_inv_map[admin_id]
                store_inv_ids = store_inv_map[store_id]

                txn_data = [
                    # Purchase transactions (stock entering admin warehouse)
                    {
                        "inventory_id": admin_inv_ids[0],
                        "product_id": product_ids[0],
                        "transaction_type": TransactionType.PURCHASE,
                        "quantity": 50,
                        "remarks": f"Initial purchase of Ray-Ban Aviator frames for Admin {admin_id}",
                    },
                    {
                        "inventory_id": admin_inv_ids[2],
                        "product_id": product_ids[2],
                        "transaction_type": TransactionType.PURCHASE,
                        "quantity": 200,
                        "remarks": f"Bulk purchase of CR-39 lenses for Admin {admin_id}",
                    },
                    # Admin → Store transfer
                    {
                        "inventory_id": admin_inv_ids[0],
                        "product_id": product_ids[0],
                        "transaction_type": TransactionType.ADMIN_TRANSFER_OUT,
                        "quantity": 10,
                        "receive_store_id": store_id,
                        "remarks": f"Sent 10 Aviator frames to Store {store_id}",
                    },
                    {
                        "inventory_id": store_inv_ids[0],
                        "product_id": product_ids[0],
                        "transaction_type": TransactionType.ADMIN_TRANSFER_IN,
                        "quantity": 10,
                        "receive_store_id": store_id,
                        "remarks": f"Received 10 Aviator frames from admin warehouse",
                    },
                    # Sale at store
                    {
                        "inventory_id": store_inv_ids[0],
                        "product_id": product_ids[0],
                        "transaction_type": TransactionType.SALE,
                        "quantity": 2,
                        "send_store_id": store_id,
                        "remarks": "Sold 2 Aviator frames to customer",
                    },
                ]
                for td in txn_data:
                    txn = InventoryTransaction(
                        inventory_id=td["inventory_id"],
                        product_id=td["product_id"],
                        transaction_type=td["transaction_type"],
                        quantity=td["quantity"],
                        send_store_id=td.get("send_store_id"),
                        receive_store_id=td.get("receive_store_id"),
                        remarks=td.get("remarks"),
                        created_by=admin_id,
                    )
                    session.add(txn)
                print(f"  [OK] seeded transactions for Admin ID={admin_id}")

            await session.commit()

        # ── 12. Seed RefreshTokens ─────────────────────────────
        print("\n" + "=" * 60)
        print("  Seeding Refresh Tokens")
        print("=" * 60)
        stmt = select(func.count()).select_from(RefreshToken)
        res = await session.execute(stmt)
        token_count = res.scalar()
        if token_count >= 5:
            print(f"  [SKIP] Refresh tokens already exist (count={token_count})")
        else:
            for idx in range(5 - token_count):
                admin_id = admin_ids[idx % len(admin_ids)]
                token = RefreshToken(
                    admin_id=admin_id,
                    token_hash=f"token_hash_admin_{admin_id}_{uuid.uuid4().hex[:8]}",
                    expires_at=datetime.utcnow() + timedelta(days=7),
                    device_fingerprint=f"device_fingerprint_{idx}"
                )
                session.add(token)
            print(f"  [OK] seeded {5 - token_count} refresh tokens to reach at least 5")

        # ── 13. Seed Suppliers ─────────────────────────────────
        print("\n" + "=" * 60)
        print("  Seeding Suppliers")
        print("=" * 60)
        admin_supplier_map = {}
        for admin_id in admin_ids:
            supplier_ids = []
            for data in SUPPLIERS_DATA:
                stmt = select(Supplier).where(
                    Supplier.company_name == data["company_name"],
                    Supplier.admin_id == admin_id
                )
                res = await session.execute(stmt)
                existing = res.scalar_one_or_none()
                if existing:
                    supplier_ids.append(existing.id)
                    continue
                
                supplier = Supplier(
                    admin_id=admin_id,
                    company_name=data["company_name"],
                    contact_person=data["contact_person"],
                    email=data["email"],
                    phone=data["phone"],
                    address=data["address"],
                    city=data["city"],
                    state=data["state"],
                    pincode=data["pincode"],
                    status=SupplierStatus.ACTIVE
                )
                session.add(supplier)
                await session.flush()
                supplier_ids.append(supplier.id)
            admin_supplier_map[admin_id] = supplier_ids
            print(f"  [OK] seeded 5 suppliers for Admin {admin_id}")

        # ── 14. Seed SupplierStoreLinks ────────────────────────
        print("\n" + "=" * 60)
        print("  Seeding Supplier Store Links")
        print("=" * 60)
        for idx, admin_id in enumerate(admin_ids):
            store_id = store_ids[idx]
            supplier_ids = admin_supplier_map[admin_id]
            for s_id in supplier_ids:
                stmt = select(SupplierStoreLink).where(
                    SupplierStoreLink.supplier_id == s_id,
                    SupplierStoreLink.store_id == store_id
                )
                res = await session.execute(stmt)
                existing = res.scalar_one_or_none()
                if existing:
                    continue
                
                link = SupplierStoreLink(
                    supplier_id=s_id,
                    store_id=store_id,
                    is_primary=True,
                    is_active=True
                )
                session.add(link)
            print(f"  [OK] seeded supplier store links for Store {store_id}")

        # ── 15. Seed SupplierProducts ──────────────────────────
        print("\n" + "=" * 60)
        print("  Seeding Supplier Products")
        print("=" * 60)
        for admin_id in admin_ids:
            p_ids = admin_product_map[admin_id]
            s_ids = admin_supplier_map[admin_id]
            for i in range(5):
                stmt = select(SupplierProduct).where(
                    SupplierProduct.supplier_id == s_ids[i],
                    SupplierProduct.product_id == p_ids[i]
                )
                res = await session.execute(stmt)
                existing = res.scalar_one_or_none()
                if existing:
                    continue
                
                sp = SupplierProduct(
                    supplier_id=s_ids[i],
                    product_id=p_ids[i],
                    supplier_sku=f"SUP-SKU-{i}",
                    unit_price=PRODUCTS[i]["cost_price"] * 0.9,
                    minimum_order_quantity=1,
                    lead_time_days=3,
                    is_active=True
                )
                session.add(sp)
            print(f"  [OK] seeded supplier products for Admin {admin_id}")

        # ── 16. Seed PurchaseOrders & Items & Payments ──────────
        print("\n" + "=" * 60)
        print("  Seeding Purchase Orders, Items, Payments")
        print("=" * 60)
        for idx, admin_id in enumerate(admin_ids):
            store_id = store_ids[idx]
            s_ids = admin_supplier_map[admin_id]
            p_ids = admin_product_map[admin_id]
            admin_inv_ids = admin_inv_map[admin_id]
            
            for i in range(5):
                po_num = f"PO-A{admin_id}-00{i+1}"
                stmt = select(PurchaseOrder).where(PurchaseOrder.po_number == po_num)
                res = await session.execute(stmt)
                existing = res.scalar_one_or_none()
                if existing:
                    continue
                
                total_po_amt = (PRODUCTS[i]["cost_price"] * 10) * 1.18
                
                if i == 1:
                    po_status = POStatus.SENT
                    qty_received = 0
                    rec_date = None
                    po_paid = 0
                    po_due = total_po_amt
                elif i == 3:
                    po_status = POStatus.PARTIALLY_RECEIVED
                    qty_received = 5
                    rec_date = None
                    po_paid = total_po_amt / 2
                    po_due = total_po_amt / 2
                else:
                    po_status = POStatus.RECEIVED
                    qty_received = 10
                    rec_date = date(2025, 6, 4)
                    po_due = total_po_amt / 2 if i == 0 else 0
                    po_paid = total_po_amt - po_due

                po = PurchaseOrder(
                    po_number=po_num,
                    admin_id=admin_id,
                    store_id=store_id,
                    supplier_id=s_ids[i],
                    status=po_status,
                    order_date=date(2025, 6, 1),
                    expected_delivery_date=date(2025, 6, 4),
                    received_date=rec_date,
                    subtotal=PRODUCTS[i]["cost_price"] * 10,
                    tax_amount=(PRODUCTS[i]["cost_price"] * 10) * 0.18,
                    discount_amount=0,
                    total_amount=total_po_amt,
                    paid_amount=po_paid,
                    due_amount=po_due,
                    created_by=admin_id
                )
                session.add(po)
                await session.flush()
                
                po_item = PurchaseOrderItem(
                    purchase_order_id=po.id,
                    product_id=p_ids[i],
                    inventory_id=admin_inv_ids[i],
                    quantity_ordered=10,
                    quantity_received=qty_received,
                    unit_price=PRODUCTS[i]["cost_price"],
                    tax_percent=18.00,
                    discount_percent=0.00,
                    line_total=po.total_amount
                )
                session.add(po_item)
                
                if po_paid > 0:
                    payment = SupplierPayment(
                        purchase_order_id=po.id,
                        supplier_id=s_ids[i],
                        admin_id=admin_id,
                        payment_date=date(2025, 6, 5),
                        amount=po_paid,
                        payment_method=SupplierPaymentMethod.BANK_TRANSFER,
                        reference_number=f"UTR-{uuid.uuid4().hex[:8].upper()}",
                        created_by=admin_id
                    )
                    session.add(payment)
            print(f"  [OK] seeded 5 purchase orders, items, and payments for Admin {admin_id}")

        # ── 17. Seed Customers ─────────────────────────────────
        print("\n" + "=" * 60)
        print("  Seeding Customers")
        print("=" * 60)
        admin_customer_map = {}
        all_seeded_customers = [] # To store Customer objects for later LoyaltyTransactions
        for idx, admin_id in enumerate(admin_ids):
            store_id = store_ids[idx]
            cust_ids = []
            
            # Fetch LoyaltyConfig for the current store
            stmt = select(LoyaltyConfig).where(LoyaltyConfig.store_id == store_id)
            result = await session.execute(stmt)
            loyalty_config: LoyaltyConfig = result.scalar_one_or_none()
            
            # Use default values if config not found (should not happen if seeded correctly)
            silver_max = loyalty_config.silver_max if loyalty_config else 5000
            gold_max = loyalty_config.gold_max if loyalty_config else 15000

            for data in CUSTOMERS_DATA:
                stmt = select(Customer).where(
                    Customer.phone == data["phone"],
                    Customer.admin_id == admin_id
                )
                res = await session.execute(stmt)
                existing_customer = res.scalar_one_or_none()
                if existing_customer:
                    cust_ids.append(existing_customer.id)
                    all_seeded_customers.append(existing_customer)
                    continue
                
                # Calculate realistic current_points and membership_tier
                current_points = 0
                if data["first_name"] == "Aarav": # Give Aarav some points for SILVER
                    current_points = 3500
                elif data["first_name"] == "Diya": # Give Diya more points for GOLD
                    current_points = 7500
                elif data["first_name"] == "Kabir": # Give Kabir points for PLATINUM
                    current_points = 18000
                else: # Other customers get random points or none
                    current_points = (hash(data["phone"]) % 1000) * 10 # Random points between 0-9990
                    
                membership_tier = CustomerMembershipTier.NONE
                if current_points > gold_max:
                    membership_tier = CustomerMembershipTier.PLATINUM
                elif current_points > silver_max:
                    membership_tier = CustomerMembershipTier.GOLD
                elif current_points > 0:
                    membership_tier = CustomerMembershipTier.SILVER

                customer = Customer(
                    admin_id=admin_id,
                    store_id=store_id,
                    first_visit_store_id=store_id,
                    first_name=data["first_name"],
                    last_name=data["last_name"],
                    email=data["email"],
                    phone=data["phone"],
                    gender=data["gender"],
                    date_of_birth=data["date_of_birth"],
                    address=data["address"],
                    city=data["city"],
                    state=data["state"],
                    pincode=data["pincode"],
                    remark=data["remark"],
                    is_active=True,
                    current_points=current_points,
                    membership_tier=membership_tier,
                    loyalty_points_earned=current_points,
                    loyalty_points_redeemed=0,
                )
                session.add(customer)
                await session.flush()
                cust_ids.append(customer.id)
                all_seeded_customers.append(customer) # Store the object
            admin_customer_map[admin_id] = cust_ids
            print(f"  [OK] seeded 5 customers for Admin {admin_id}")

        # ── 19. Seed Prescriptions ────────────────────────────
        print("\n" + "=" * 60)
        print("  Seeding Prescriptions")
        print("=" * 60)
        customer_prescriptions = {}
        for idx, admin_id in enumerate(admin_ids):
            store_id = store_ids[idx]
            cust_ids = admin_customer_map[admin_id]

            # Fetch optician for this store
            stmt = select(Optician).where(Optician.store_id == store_id).limit(1)
            res = await session.execute(stmt)
            opt = res.scalar_one_or_none()
            optician_id = opt.id if opt else None

            # Seed 5 prescriptions for the customer(s)
            for i in range(5):
                cust_id = cust_ids[i]
                p_data = PRESCRIPTIONS_DATA[i]

                stmt = select(Prescription).where(
                    Prescription.customer_id == cust_id,
                    Prescription.prescription_date == p_data["prescription_date"]
                )
                res = await session.execute(stmt)
                existing = res.scalars().first()
                if existing:
                    customer_prescriptions[cust_id] = existing.id
                    continue

                prescription = Prescription(
                    customer_id=cust_id,
                    store_id=store_id,
                    optician_id=optician_id,
                    sph_right=p_data["sph_right"],
                    cyl_right=p_data["cyl_right"],
                    axis_right=p_data["axis_right"],
                    sph_left=p_data["sph_left"],
                    cyl_left=p_data["cyl_left"],
                    axis_left=p_data["axis_left"],
                    addition=p_data["addition"],
                    pupillary_distance=p_data["pupillary_distance"],
                    prescription_date=p_data["prescription_date"],
                    notes=p_data["notes"],
                    lens_type="Single Vision",
                    lens_material="CR-39",
                    lens_coating="Anti-Reflective",
                    frame_preference="Full-Rim",
                    expiry_date=p_data["prescription_date"] + timedelta(days=365),
                    recommended_usage="Constant Wear",
                    doctor_name=f"{opt.first_name} {opt.last_name}" if opt else "Optician",
                    is_active=True
                )
                session.add(prescription)
                await session.flush()
                customer_prescriptions[cust_id] = prescription.id
            print(f"  [OK] seeded 5 prescriptions for Admin {admin_id}")

        # ── 17.5. Seed Lab Partners ───────────────────────────
        print("\n" + "=" * 60)
        print("  Seeding Lab Partners")
        print("=" * 60)
        admin_lab_map = {} # Maps admin_id to list of Lab IDs
        for admin_id in admin_ids:
            admin_lab_map[admin_id] = []
            for l_data in [
                {"name": "Central Optic Lab", "email": "central@opticlab.in", "contact_number": "9876543210"},
                {"name": "Precision Lens Lab", "email": "precision@lenslab.in", "contact_number": "9876543211"},
                {"name": "Apex Optical Processing", "email": "apex@apexoptics.in", "contact_number": "9876543212"},
            ]:
                stmt = select(Lab).where(
                    Lab.admin_id == admin_id,
                    Lab.name == l_data["name"]
                )
                res = await session.execute(stmt)
                existing_lab = res.scalar_one_or_none()
                if existing_lab:
                    admin_lab_map[admin_id].append(existing_lab.id)
                else:
                    lab = Lab(
                        admin_id=admin_id,
                        name=l_data["name"],
                        email=l_data["email"],
                        contact_number=l_data["contact_number"],
                        is_active=True
                    )
                    session.add(lab)
                    await session.flush()
                    admin_lab_map[admin_id].append(lab.id)
            print(f"  [OK] seeded 3 lab partners for Admin {admin_id}")

        # ── 18. Seed Sales & Items & Payments ──────────────────
        print("\n" + "=" * 60)
        print("  Seeding Sales, Items, Payments")
        print("=" * 60)
        all_seeded_sales = [] # Store Sale objects for later LoyaltyTransactions
        for idx, admin_id in enumerate(admin_ids):
            store_id = store_ids[idx]
            cust_ids = admin_customer_map[admin_id]
            p_ids = admin_product_map[admin_id]
            store_inv_ids = store_inv_map[store_id]
            
            # Fetch LoyaltyConfig for the current store
            stmt = select(LoyaltyConfig).where(LoyaltyConfig.store_id == store_id)
            result = await session.execute(stmt)
            loyalty_config: LoyaltyConfig = result.scalar_one_or_none()
            
            # Use default values if config not found
            price_interval = loyalty_config.price_interval if loyalty_config else 200
            price_points = loyalty_config.price_points if loyalty_config else 50
            
            stmt = select(Manager).where(Manager.store_id == store_id).limit(1)
            res = await session.execute(stmt)
            mgr = res.scalar_one_or_none()
            sold_by_id = mgr.id if mgr else 1
            sold_by_type = StaffType.MANAGER if mgr else StaffType.WORKER
            
            for i in range(5):
                inv_num = f"INV-A{admin_id}-00{i+1}"
                stmt = select(Sale).where(Sale.invoice_number == inv_num)
                res = await session.execute(stmt)
                existing_sale = res.scalar_one_or_none()
                if existing_sale:
                    all_seeded_sales.append(existing_sale)
                    continue
                
                total_sale_amt = PRODUCTS[i]["selling_price"] * 1.18
                sale_due = total_sale_amt / 2 if i == 0 else 0
                sale_paid = total_sale_amt - sale_due
                sale_status = SaleStatus.PARTIALLY_PAID if i == 0 else SaleStatus.COMPLETED

                # Calculate loyalty points earned for this sale
                loyalty_points_earned = 0
                if loyalty_config and loyalty_config.price_points_enabled:
                    loyalty_points_earned = int((PRODUCTS[i]["selling_price"] / price_interval) * price_points)

                # Determine lab tracking details for seeded orders
                pres_id = customer_prescriptions.get(cust_ids[i])
                lab_status = None
                lab_id = None
                lab_name = None
                sent_to_lab_date = None
                expected_delivery_date = None
                
                # We only seed lab tracking fields if there is a prescription (i < 4)
                if pres_id and i < 4:
                    stages = ["Confirmed", "Sent To Lab", "Ready For Pickup", "Delivered"]
                    lab_status = stages[i]
                    if lab_status in ["Sent To Lab", "Ready For Pickup", "Delivered"]:
                        lab_name = "Central Optic Lab"
                        lab_id = admin_lab_map[admin_id][0] # Select Central Optic Lab ID
                        sent_to_lab_date = date(2025, 6, 6)
                        expected_delivery_date = date(2025, 6, 10)
                        
                    if lab_status == "Delivered":
                        # Delivered is fully paid and COMPLETED
                        sale_paid = total_sale_amt
                        sale_due = 0
                        sale_status = SaleStatus.COMPLETED
                    elif lab_status == "Ready For Pickup":
                        # Ready for pickup is partially paid
                        sale_status = SaleStatus.PARTIALLY_PAID
                        sale_due = total_sale_amt / 2
                        sale_paid = total_sale_amt - sale_due
                    elif lab_status == "Confirmed":
                        # Confirmed is unpaid
                        sale_paid = 0
                        sale_due = total_sale_amt
                        sale_status = SaleStatus.PENDING

                sale = Sale(
                    invoice_number=inv_num,
                    admin_id=admin_id,
                    store_id=store_id,
                    customer_id=cust_ids[i],
                    sold_by_type=sold_by_type,
                    sold_by_id=sold_by_id,
                    sale_date=date(2025, 6, 5),
                    status=sale_status,
                    subtotal=PRODUCTS[i]["selling_price"],
                    discount_amount=0,
                    tax_amount=PRODUCTS[i]["selling_price"] * 0.18,
                    total_amount=total_sale_amt,
                    paid_amount=sale_paid,
                    due_amount=sale_due,
                    loyalty_points_earned=loyalty_points_earned,
                    loyalty_points_redeemed=0,
                    prescription_id=pres_id,
                    lab_status=lab_status,
                    lab_id=lab_id,
                    lab_name=lab_name,
                    sent_to_lab_date=sent_to_lab_date,
                    expected_delivery_date=expected_delivery_date,
                )
                session.add(sale)
                await session.flush()
                all_seeded_sales.append(sale) # Store the Sale object
                
                sale_item = SaleItem(
                    sale_id=sale.id,
                    product_id=p_ids[i],
                    inventory_id=store_inv_ids[i],
                    quantity=1,
                    unit_price=PRODUCTS[i]["selling_price"],
                    unit_cost=PRODUCTS[i]["cost_price"],
                    discount_percent=0.00,
                    tax_percent=18.00,
                    line_total=sale.total_amount
                )
                session.add(sale_item)
                
                if sale_paid > 0:
                    payment = SalePayment(
                        sale_id=sale.id,
                        amount=sale_paid,
                        payment_method=SalePaymentMethod.UPI,
                        reference_number=f"TXN-{uuid.uuid4().hex[:8].upper()}"
                    )
                    session.add(payment)
            print(f"  [OK] seeded 5 sales, items, and payments for Store {store_id}")

        # Section 19 Seed Prescriptions was moved before Section 18 to allow linking sales.

        # ── 20. Seed LoyaltyTransaction ──────────────────────
        print("\n" + "=" * 60)
        print("  Seeding Loyalty Transactions")
        print("=" * 60)
        for customer in all_seeded_customers:
            if customer.current_points > 0:
                # Create a few transactions to account for the current_points
                remaining_points = customer.current_points
                
                # Transaction 1: Earned from category purchases
                if remaining_points >= 500:
                    points = 500
                    transaction = LoyaltyTransaction(
                        customer_id=customer.id,
                        store_id=customer.store_id,
                        sale_id=None, # Link to a sale if available, otherwise None
                        type=LoyaltyTransactionType.EARNED_CATEGORY,
                        points=points,
                        note="Seeded: earned from category purchases"
                    )
                    session.add(transaction)
                    remaining_points -= points
                
                # Transaction 2: Earned from price-based rule
                if remaining_points >= 300:
                    points = 300
                    transaction = LoyaltyTransaction(
                        customer_id=customer.id,
                        store_id=customer.store_id,
                        sale_id=None,
                        type=LoyaltyTransactionType.EARNED_PRICE,
                        points=points,
                        note="Seeded: earned from price-based rule"
                    )
                    session.add(transaction)
                    remaining_points -= points
                
                # Transaction 3: Remaining points (could be from various sources or sales)
                if remaining_points > 0:
                    transaction = LoyaltyTransaction(
                        customer_id=customer.id,
                        store_id=customer.store_id,
                        sale_id=None,
                        type=LoyaltyTransactionType.EARNED_PRICE,
                        points=remaining_points,  # exact remainder so sum == current_points
                        note="Seeded: price-based points balance"
                    )
                    session.add(transaction)
                print(f"  [OK] seeded loyalty transactions for Customer ID={customer.id} (Total Points: {customer.current_points})")

        # ── 21. Seed Expense Categories & Expenses ────────────
        print("\n" + "=" * 60)
        print("  Seeding Expense Categories & Expenses")
        print("=" * 60)
        for idx, admin_id in enumerate(admin_ids):
            store_id = store_ids[idx]

            # 1. Seed Categories
            cat_map = {}
            for c_data in EXPENSE_CATEGORIES_DATA:
                stmt = select(ExpenseCategory).where(
                    ExpenseCategory.admin_id == admin_id,
                    ExpenseCategory.name == c_data["name"]
                )
                res = await session.execute(stmt)
                existing = res.scalar_one_or_none()
                if existing:
                    cat_map[c_data["name"]] = existing.id
                else:
                    category = ExpenseCategory(
                        admin_id=admin_id,
                        name=c_data["name"],
                        description=c_data["description"],
                        is_active=True
                    )
                    session.add(category)
                    await session.flush()
                    cat_map[c_data["name"]] = category.id

            # 2. Fetch staff for store-level expense mappings
            stmt_mgr = select(Manager).where(Manager.store_id == store_id).limit(1)
            mgr_res = await session.execute(stmt_mgr)
            mgr = mgr_res.scalar_one_or_none()
            manager_id = mgr.id if mgr else admin_id

            stmt_wrk = select(Worker).where(Worker.store_id == store_id).limit(1)
            wrk_res = await session.execute(stmt_wrk)
            wrk = wrk_res.scalar_one_or_none()
            worker_id = wrk.id if wrk else admin_id

            stmt_opt = select(Optician).where(Optician.store_id == store_id).limit(1)
            opt_res = await session.execute(stmt_opt)
            opt = opt_res.scalar_one_or_none()
            optician_id = opt.id if opt else admin_id

            # 3. Seed Expenses
            category_names = list(cat_map.keys())
            for i, exp_tpl in enumerate(EXPENSES_DATA):
                cat_name = category_names[i % len(category_names)]
                category_id = cat_map[cat_name]

                owner_id = admin_id if exp_tpl["owner_type"] == ExpenseOwnerType.ADMIN else store_id

                if exp_tpl["recorded_by_type"] == ExpenseRecordedByType.ADMIN:
                    recorded_by_id = admin_id
                elif exp_tpl["recorded_by_type"] == ExpenseRecordedByType.MANAGER:
                    recorded_by_id = manager_id
                else:
                    recorded_by_id = worker_id

                incurred_by_id = None
                if exp_tpl["incurred_by_type"] is not None:
                    if exp_tpl["incurred_by_type"] == ExpenseRecordedByType.OPTICIAN:
                        incurred_by_id = optician_id
                    elif exp_tpl["incurred_by_type"] == ExpenseRecordedByType.WORKER:
                        incurred_by_id = worker_id
                    elif exp_tpl["incurred_by_type"] == ExpenseRecordedByType.MANAGER:
                        incurred_by_id = manager_id
                    else:
                        incurred_by_id = admin_id

                stmt_exp = select(Expense).where(
                    Expense.admin_id == admin_id,
                    Expense.title == exp_tpl["title"]
                )
                exp_res = await session.execute(stmt_exp)
                existing_exp = exp_res.scalar_one_or_none()
                if existing_exp:
                    continue

                approved_by_admin = admin_id if exp_tpl["is_approved"] else None
                approved_at_dt = datetime.now(timezone.utc) if exp_tpl["is_approved"] else None

                expense = Expense(
                    admin_id=admin_id,
                    owner_type=exp_tpl["owner_type"],
                    owner_id=owner_id,
                    category_id=category_id,
                    title=exp_tpl["title"],
                    description=exp_tpl["description"],
                    amount=exp_tpl["amount"],
                    expense_date=exp_tpl["expense_date"],
                    payment_method=exp_tpl["payment_method"],
                    reference_number=exp_tpl["reference_number"],
                    is_recurring=exp_tpl.get("is_recurring", False),
                    recurring_interval=exp_tpl.get("recurring_interval"),
                    is_approved=exp_tpl["is_approved"],
                    approved_by=approved_by_admin,
                    approved_at=approved_at_dt,
                    recorded_by_type=exp_tpl["recorded_by_type"],
                    recorded_by_id=recorded_by_id,
                    incurred_by_type=exp_tpl["incurred_by_type"],
                    incurred_by_id=incurred_by_id
                )
                session.add(expense)
            print(f"  [OK] seeded 5 expense categories and 5 expenses for Admin {admin_id}")

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
    print("  Inventory seed summary (per admin/store):")
    print(f"  Brands:        {len(BRANDS)}")
    print(f"  Categories:    {len(CATEGORIES)}")
    print(f"  Subcategories: {len(SUBCATEGORIES)}")
    print(f"  Products:      {len(PRODUCTS)} (5 frames, 5 lenses, 5 accessories)")
    print(f"  Inventories:   {len(PRODUCTS) * 2} (admin warehouse + store)")
    print(f"  Inv. Transactions:  5 (2 purchases, 2 transfers, 1 sale)")
    print(f"  Loyalty Configs:    {len(store_ids)}")
    print(f"  Store Category Loyalties: {len(store_ids) * len(CATEGORIES)}")
    print(f"  Loyalty Transactions: 30 (approx)")
    print(f"  Prescriptions: 5")
    print(f"  Expense Categories: 5")
    print(f"  Expenses:      5")
    print()


async def main() -> None:
    try:
        await seed()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
