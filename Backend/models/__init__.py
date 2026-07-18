# Models package — re-export all models for convenient imports
from models.admin import Admin, AdminStatus
from models.store import Store
from models.worker import Worker
from models.optician import Optician
from models.manager import Manager
from models.refresh_token import RefreshToken
from models.role import Role
from models.brand import Brand
from models.category import Category
from models.subcategory import Subcategory
from models.product import Product
from models.frame_product import FrameProduct
from models.lens_product import LensProduct
from models.accessory_product import AccessoryProduct
from models.product_snapshot import ProductSnapshot, ProductType
from models.inventory import Inventory, OwnerType
from models.inventory_transaction import InventoryTransaction, TransactionType

# ── Supplier Management ───────────────────────────────────────
from models.supplier import Supplier, SupplierStatus
from models.supplier_store_link import SupplierStoreLink
from models.supplier_product import SupplierProduct
from models.purchase_order import PurchaseOrder, POStatus
from models.purchase_order_item import PurchaseOrderItem
from models.supplier_payment import SupplierPayment, SupplierPaymentMethod

# ── Sales ─────────────────────────────────────────────────────
from models.customer import Customer, CustomerGender, CustomerMembershipTier
from models.prescription import Prescription
from models.sale import Sale, SaleStatus, StaffType
from models.sale_item import SaleItem
from models.sale_payment import SalePayment, SalePaymentMethod

# ── Loyalty ───────────────────────────────────────────────────
from models.loyalty_config import LoyaltyConfig
from models.store_category_loyalty import StoreCategoryLoyalty
from models.loyalty_transaction import LoyaltyTransaction, LoyaltyTransactionType

# ── Expense ───────────────────────────────────────────────────
from models.expense import Expense, ExpenseOwnerType, ExpensePaymentMethod, ExpenseRecordedByType
from models.expense_category import ExpenseCategory

# ── Repair & Services ─────────────────────────────────────────
from models.repair import Repair, RepairType, RepairStatus, RepairStaffType

# ── Notifications ─────────────────────────────────────────────
from models.notification import Notification, NotificationType

# ── Lab Partners ──────────────────────────────────────────────
from models.lab import Lab

# ── Permissions & Roles (V2) ──────────────────────────────────
from models.permission import Permission
from models.global_role_permission import GlobalRolePermission, PermissionRoleType
from models.admin_role_permission_override import AdminRolePermissionOverride
from models.user_permission_override import UserPermissionOverride, PermissionUserType
from models.superadmin import SuperAdmin
from models.accountant import Accountant

from models.bill_settings import BillSettings
from models.bill import Bill
from models.exchange import Exchange, ExchangeStatus
