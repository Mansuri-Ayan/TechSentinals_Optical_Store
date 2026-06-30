# Schema: report.py
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict
from schemas.staff import StaffRead


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


# ── Dashboard & Analyses Response Schemas ───────────────────────

class TrendDataPoint(BaseModel):
    label: str
    value: Decimal


class StatusBreakdownPoint(BaseModel):
    name: str
    value: int
    color: str


class StoreOrderComparisonPoint(BaseModel):
    name: str
    orders: int
    sales: Decimal
    color: str


class LeaderboardStore(BaseModel):
    rank: int
    name: str
    revenue: Decimal
    orders: int
    growth: float


class InventoryStatusPoint(BaseModel):
    label: str
    value: int
    color: str


class InventoryDistributionPoint(BaseModel):
    name: str
    value: int
    color: str


class BusinessInsights(BaseModel):
    top_eyewear_brand: str
    top_eyewear_brand_sales: Decimal
    top_eyewear_brand_units: int
    leading_lens_supplier: str
    leading_lens_supplier_rating: float
    leading_lens_supplier_count: int
    highest_performing_month: str
    highest_performing_month_sales: Decimal


class RecentOrderRow(BaseModel):
    order_id: str
    customer_name: str
    product_name: str
    branch_name: str
    total_amount: Decimal
    status: str
    order_date: date


class RecentTransactionRow(BaseModel):
    transaction_id: str
    customer_name: str
    branch_name: str
    payment_method: str
    paid_amount: Decimal
    date: date
    payment_status: str


class RecentCustomerRow(BaseModel):
    customer_id: int
    name: str
    phone: str
    email: str | None = None
    city: str
    status: str
    date: date


class DashboardKPIs(BaseModel):
    revenue: Decimal
    today_revenue: Decimal
    orders_count: int
    pending_orders_count: int
    customers_count: int
    active_staff_count: int
    inventory_val: Decimal
    outstanding_payments: Decimal
    low_stock_count: int


class DashboardReport(BaseModel):
    kpis: DashboardKPIs
    sales_trend: list[TrendDataPoint]
    sales_status: list[StatusBreakdownPoint]
    branch_order_comparisons: list[StoreOrderComparisonPoint]
    best_performing_stores: list[LeaderboardStore]
    inventory_status: list[InventoryStatusPoint]
    store_inventory_distribution: list[InventoryDistributionPoint]
    business_insights: BusinessInsights
    recent_orders: list[RecentOrderRow]
    recent_transactions: list[RecentTransactionRow]
    recent_customers: list[RecentCustomerRow]


class RevenueBreakdownPoint(BaseModel):
    name: str
    value: Decimal
    color: str


class SupplierVolumePoint(BaseModel):
    label: str
    value: int
    color: str


class PaymentMethodPoint(BaseModel):
    name: str
    value: int
    color: str


class BrandRevenuePoint(BaseModel):
    label: str
    value: int
    color: str


class AnalysesKPIs(BaseModel):
    revenue: Decimal
    orders_count: int
    customers_count: int
    profit: Decimal
    inventory_val: Decimal
    stores_count: int


class AnalysesReport(BaseModel):
    kpis: AnalysesKPIs
    sales_trend: list[TrendDataPoint]
    sales_status: list[StatusBreakdownPoint]
    revenue_breakdown: list[RevenueBreakdownPoint]
    inventory_status: list[InventoryStatusPoint]
    branch_performance: list[StoreOrderComparisonPoint]
    best_performing_stores: list[LeaderboardStore]
    store_inventory_distribution: list[InventoryDistributionPoint]
    supplier_volumes: list[SupplierVolumePoint]
    transaction_payment_analytics: list[PaymentMethodPoint]
    brand_revenue_comparison: list[BrandRevenuePoint]
    monthly_customer_growth: list[TrendDataPoint]


class StaffSaleRow(BaseModel):
    id: int
    invoice_number: str
    customer_name: str | None = None
    total_amount: Decimal
    status: str
    sale_date: date


class StaffExpenseRow(BaseModel):
    id: int
    title: str
    category_name: str
    amount: Decimal
    expense_date: date
    payment_method: str
    is_approved: bool
    is_rejected: bool


class StaffDetailResponse(BaseModel):
    staff_info: StaffRead
    revenue: Decimal
    sales_count: int
    discounts_given: Decimal
    unique_customers_served: int
    total_expenses_incurred: Decimal
    sales: list[StaffSaleRow]
    expenses: list[StaffExpenseRow]
    sales_trend: list[TrendDataPoint]

