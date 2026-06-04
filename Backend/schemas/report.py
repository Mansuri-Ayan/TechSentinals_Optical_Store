# Schema: report.py
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


# High-level detail response schemas
class ProductPerformance(BaseModel):
    product_id: int
    product_name: str
    sku: str
    quantity_sold: int
    total_revenue: Decimal
    total_profit: Decimal


class CustomerStats(BaseModel):
    total_customers_served: int
    new_customers_count: int


class InventoryAlertDetail(BaseModel):
    inventory_id: int
    product_id: int
    product_name: str
    sku: str
    current_quantity: int
    reorder_level: int


class StoreReportDetails(BaseModel):
    store_id: int
    store_name: str
    revenue: Decimal
    sales_count: int
    cost: Decimal
    gross_profit: Decimal
    discounts: Decimal
    tax_collected: Decimal
    unique_customers: int
    new_customers: int
    top_products: list[ProductPerformance]
    reorder_alerts_count: int
    reorder_alerts_list: list[InventoryAlertDetail]


class StaffReportDetails(BaseModel):
    staff_id: int
    staff_type: str
    first_name: str
    last_name: str
    employee_code: str
    revenue: Decimal
    sales_count: int
    discounts_given: Decimal
    unique_customers_served: int
    top_products_sold: list[ProductPerformance]
