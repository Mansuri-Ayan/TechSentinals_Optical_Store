"""
Automated Verification Script for Product Pricing and GST Display
Tests:
1. Product Model & Schema computed properties (Cost, Base Price, GST Amount, Price Incl. GST)
2. Inventory Schemas (UniversalInventoryRead, InventoryRead)
3. Purchase Order Item Schemas (Unit Cost, Tax Amount, Unit Cost with Tax)
4. Sale Item Schemas (Base Price, GST Amount, Price with GST)
5. HTML Bill Generation for Sales (Subtotal Before GST, Final Total Incl. GST)
6. HTML PO Invoice Generation (Subtotal Before GST, Grand Total Incl. GST)
"""

import sys
import os
from decimal import Decimal
import asyncio

# Add Backend to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from models.product import Product
from schemas.product import ProductRead
from schemas.inventory import InventoryRead, UniversalInventoryRead
from schemas.purchase_order import PurchaseOrderItemRead
from schemas.sale import SaleItemRead


def test_product_pricing_math():
    print("\n--- 1. Testing Product Model & Property Calculations ---")
    p = Product(
        id=1,
        admin_id=1,
        name="Classic Aviator Frame",
        sku="OPT-AVI-001",
        cost_price=Decimal("1000.00"),
        selling_price=Decimal("1200.00"),
        gst_percent=Decimal("10.00"),
        is_active=True,
    )
    
    assert p.cost_price == Decimal("1000.00"), f"Expected 1000.00, got {p.cost_price}"
    assert p.selling_price_before_gst == Decimal("1200.00"), f"Expected 1200.00, got {p.selling_price_before_gst}"
    assert p.gst_amount == Decimal("120.00"), f"Expected 120.00, got {p.gst_amount}"
    assert p.selling_price_with_gst == Decimal("1320.00"), f"Expected 1320.00, got {p.selling_price_with_gst}"
    print("  [PASS] Product model properties: cost=1000, before_gst=1200, gst=120, incl_gst=1320")

    # Test ProductRead Schema
    p_dict = {
        "id": 1,
        "admin_id": 1,
        "category_id": 1,
        "name": p.name,
        "sku": p.sku,
        "cost_price": p.cost_price,
        "selling_price": p.selling_price,
        "gst_percent": p.gst_percent,
        "is_active": True,
        "created_at": "2026-09-09T00:00:00",
        "updated_at": "2026-09-09T00:00:00",
    }
    read_obj = ProductRead.model_validate(p_dict)
    assert read_obj.selling_price_before_gst == Decimal("1200.00")
    assert read_obj.gst_amount == Decimal("120.00")
    assert read_obj.selling_price_with_gst == Decimal("1320.00")
    print("  [PASS] ProductRead schema validation: correctly derived 4-tier pricing fields")


def test_inventory_pricing_math():
    print("\n--- 2. Testing Inventory Schemas (Store & Universal) ---")
    inv_dict = {
        "id": 10,
        "owner_type": "STORE",
        "owner_id": 1,
        "product_id": 1,
        "quantity": 25,
        "reserved_quantity": 0,
        "available_quantity": 25,
        "reorder_level": 5,
        "is_active": True,
        "cost_price": Decimal("1000.00"),
        "selling_price": Decimal("1200.00"),
        "gst_percent": Decimal("10.00"),
        "created_at": "2026-09-09T00:00:00",
        "updated_at": "2026-09-09T00:00:00",
    }
    
    inv_read = InventoryRead.model_validate(inv_dict)
    assert inv_read.selling_price_before_gst == Decimal("1200.00")
    assert inv_read.gst_amount == Decimal("120.00")
    assert inv_read.selling_price_with_gst == Decimal("1320.00")
    print("  [PASS] InventoryRead schema: derived gst_amount=120, selling_price_with_gst=1320")

    univ_dict = {
        "id": 10,
        "product_id": 1,
        "product_name": "Classic Aviator Frame",
        "product_sku": "OPT-AVI-001",
        "quantity": 25,
        "available_quantity": 25,
        "cost_price": Decimal("1000.00"),
        "selling_price": Decimal("1200.00"),
        "gst_percent": Decimal("10.00"),
    }
    univ_read = UniversalInventoryRead.model_validate(univ_dict)
    assert univ_read.selling_price_before_gst == Decimal("1200.00")
    assert univ_read.gst_amount == Decimal("120.00")
    assert univ_read.selling_price_with_gst == Decimal("1320.00")
    print("  [PASS] UniversalInventoryRead schema: derived gst_amount=120, selling_price_with_gst=1320")


def test_purchase_order_pricing_math():
    print("\n--- 3. Testing Purchase Order Item Schemas (Supplier Pricing) ---")
    po_item_dict = {
        "id": 100,
        "purchase_order_id": 5,
        "product_id": 1,
        "quantity_ordered": 10,
        "quantity_received": 10,
        "unit_price": Decimal("1000.00"),
        "discount_percent": Decimal("0.00"),
        "tax_percent": Decimal("10.00"),
        "line_total": Decimal("11000.00"),
        "created_at": "2026-09-09T00:00:00",
        "updated_at": "2026-09-09T00:00:00",
    }
    po_item = PurchaseOrderItemRead.model_validate(po_item_dict)
    assert po_item.unit_cost_price == Decimal("1000.00"), f"Expected 1000.00, got {po_item.unit_cost_price}"
    assert po_item.tax_amount == Decimal("1000.00"), f"Expected 1000.00 (line tax for 10 units), got {po_item.tax_amount}"
    assert (po_item.tax_amount / po_item.quantity_ordered) == Decimal("100.00"), "Expected 100.00 unit tax"
    assert po_item.unit_cost_with_tax == Decimal("1100.00"), f"Expected 1100.00, got {po_item.unit_cost_with_tax}"
    print("  [PASS] PurchaseOrderItemRead: unit_cost=1000, line_tax=1000 (unit_tax=100), unit_cost_with_tax=1100")


def test_sale_item_pricing_math():
    print("\n--- 4. Testing Sale Item Schemas (Customer POS Pricing) ---")
    sale_item_dict = {
        "id": 200,
        "sale_id": 15,
        "product_id": 1,
        "unit_price": Decimal("1200.00"),
        "discount_percent": Decimal("0.00"),
        "tax_percent": Decimal("10.00"),
        "line_total": Decimal("2640.00"),
        "created_at": "2026-09-09T00:00:00",
        "updated_at": "2026-09-09T00:00:00",
    }
    sale_item = SaleItemRead.model_validate(sale_item_dict)
    assert sale_item.unit_price_before_gst == Decimal("1200.00")
    assert sale_item.gst_amount == Decimal("120.00")
    assert sale_item.unit_price_with_gst == Decimal("1320.00")
    print("  [PASS] SaleItemRead: unit_price_before_gst=1200, gst_amount=120, unit_price_with_gst=1320")


def test_html_bill_labels():
    print("\n--- 5. Testing Bill & PO Invoice HTML Rendering Standards ---")
    from services.bill_service import generate_bill_html, generate_po_invoice_html
    from unittest.mock import MagicMock, AsyncMock

    # Mock Sale
    mock_sale = MagicMock()
    mock_sale.id = 1
    mock_sale.store_id = 1
    mock_sale.invoice_number = "INV-2026-0001"
    mock_sale.created_at = MagicMock()
    mock_sale.created_at.strftime = lambda fmt: "09 Sep 2026 14:30"
    mock_sale.subtotal = Decimal("2400.00")
    mock_sale.tax_amount = Decimal("240.00")
    mock_sale.discount_amount = Decimal("0.00")
    mock_sale.loyalty_points_redeemed = 0
    mock_sale.loyalty_discount_amount = Decimal("0.00")
    mock_sale.total_amount = Decimal("2640.00")
    mock_sale.paid_amount = Decimal("2640.00")
    mock_sale.due_amount = Decimal("0.00")
    mock_sale.status = "COMPLETED"
    mock_sale.payment_method = "CASH"
    mock_sale.customer = None
    mock_sale.billing_account_customer = None
    mock_sale.prescription = None
    mock_sale.payments = []
    mock_sale.cashier = None
    mock_sale.salesperson = None
    mock_sale.optician = None
    mock_sale.store = MagicMock()
    mock_sale.store.store_name = "TechSentinals Optics"
    mock_sale.store.email = "optics@techsentinals.com"
    mock_sale.store.phone = "9876543210"
    mock_sale.store.address = "123 Main Road"
    mock_sale.store.city = "Mumbai"
    mock_sale.store.state = "MH"
    mock_sale.store.pincode = "400001"
    mock_sale.store.gst_number = "27AAAAA0000A1Z5"
    mock_sale.items = []

    # Mock DB session
    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_res

    sale_html = asyncio.run(generate_bill_html(mock_sale, mock_db))
    assert "Subtotal (Before GST)" in sale_html, "Sale HTML must contain 'Subtotal (Before GST)'"
    assert "Final Total (Incl. GST)" in sale_html, "Sale HTML must contain 'Final Total (Incl. GST)'"
    print("  [PASS] Sale Bill HTML correctly renders 'Subtotal (Before GST)' and 'Final Total (Incl. GST)'")

    # Mock PO
    mock_po = MagicMock()
    mock_po.id = 1
    mock_po.store_id = 1
    mock_po.po_number = "PO-2026-0001"
    mock_po.invoice_number = "SUP-INV-101"
    mock_po.order_date = MagicMock()
    mock_po.order_date.strftime = lambda fmt: "09 Sep 2026"
    mock_po.due_date = None
    mock_po.status = MagicMock()
    mock_po.status.value = "RECEIVED"
    mock_po.subtotal = Decimal("10000.00")
    mock_po.tax_amount = Decimal("1000.00")
    mock_po.discount_amount = Decimal("0.00")
    mock_po.total_amount = Decimal("11000.00")
    mock_po.paid_amount = Decimal("11000.00")
    mock_po.due_amount = Decimal("0.00")
    mock_po.store = mock_sale.store
    mock_po.supplier = MagicMock()
    mock_po.supplier.company_name = "Global Lens Suppliers"
    mock_po.supplier.phone = "9123456780"
    mock_po.supplier.email = "orders@globallens.com"
    mock_po.supplier.address = "Industrial Area"
    mock_po.supplier.gst_number = "27BBBBB1111B1Z2"
    mock_po.items = []
    mock_po.payments = []

    po_html = asyncio.run(generate_po_invoice_html(mock_po, mock_db))
    assert "Subtotal (Before GST)" in po_html, "PO HTML must contain 'Subtotal (Before GST)'"
    assert "Grand Total (Incl. GST)" in po_html, "PO HTML must contain 'Grand Total (Incl. GST)'"
    assert "Cost (Excl. GST)" in po_html, "PO HTML table header must contain 'Cost (Excl. GST)'"
    print("  [PASS] PO Invoice HTML correctly renders 'Subtotal (Before GST)', 'Cost (Excl. GST)', and 'Grand Total (Incl. GST)'")


async def async_test_live_db():
    print("\n--- 6. Testing Live Database Queries & Model Properties ---")
    from db.session import async_session_maker
    from sqlalchemy import select
    from models.product import Product

    async with async_session_maker() as db:
        stmt = select(Product).where(Product.is_active.is_(True)).limit(1)
        res = await db.execute(stmt)
        product = res.scalar_one_or_none()
        if product:
            print(f"  [DB] Found product id={product.id}, name='{product.name}', selling_price={product.selling_price}, gst_percent={product.gst_percent}")
            assert hasattr(product, "selling_price_before_gst")
            assert hasattr(product, "gst_amount")
            assert hasattr(product, "selling_price_with_gst")
            assert product.selling_price_before_gst == product.selling_price
            print(f"  [PASS] Live Product model properties: before_gst={product.selling_price_before_gst}, gst_amount={product.gst_amount}, with_gst={product.selling_price_with_gst}")
        else:
            print("  [SKIP] No products in DB to query")


def test_live_db():
    asyncio.run(async_test_live_db())


if __name__ == "__main__":
    print("=" * 60)
    print("RUNNING PRODUCT PRICING & GST SYSTEM VERIFICATION")
    print("=" * 60)
    test_product_pricing_math()
    test_inventory_pricing_math()
    test_purchase_order_pricing_math()
    test_sale_item_pricing_math()
    test_html_bill_labels()
    test_live_db()
    print("\n" + "=" * 60)
    print("ALL 6 PRICING & GST VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)
