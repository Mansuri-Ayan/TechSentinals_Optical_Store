# Service: report_service.py
from datetime import date, datetime, timezone
from decimal import Decimal
from sqlalchemy import select, func, desc, and_, Date
from sqlalchemy.ext.asyncio import AsyncSession
from models.sale import Sale, StaffType
from models.sale_item import SaleItem
from models.customer import Customer
from models.inventory import Inventory
from models.product import Product
from models.store import Store
from models.manager import Manager
from models.worker import Worker
from models.optician import Optician
from schemas.report import (
    StoreReportDetails, ProductPerformance, InventoryAlertDetail,
    StaffReportDetails
)


async def get_store_report(
    db: AsyncSession,
    admin_id: int,
    store_id: int,
    start_date: date,
    end_date: date
) -> StoreReportDetails:
    """
    Compiles detailed store performance metrics (live calculation for the given date range)
    including top products and list of reorder alerts.
    """
    # 1. Fetch store info
    store_stmt = select(Store).where(Store.id == store_id, Store.admin_id == admin_id)
    store = (await db.execute(store_stmt)).scalar_one_or_none()
    if not store:
        raise ValueError("Store not found")

    # 2. Query basic sales metrics for the date range
    sales_data = await db.execute(
        select(
            func.count(Sale.id).label("sales_count"),
            func.sum(Sale.total_amount).label("revenue"),
            func.sum(Sale.discount_amount).label("discounts"),
            func.sum(Sale.tax_amount).label("tax_collected"),
            func.count(func.distinct(Sale.customer_id)).label("unique_customers")
        ).where(
            Sale.store_id == store_id,
            Sale.sale_date.between(start_date, end_date),
            Sale.admin_id == admin_id
        )
    )
    sales_row = sales_data.first()
    
    sales_count = sales_row.sales_count or 0
    revenue = sales_row.revenue or Decimal("0.00")
    discounts = sales_row.discounts or Decimal("0.00")
    tax_collected = sales_row.tax_collected or Decimal("0.00")
    unique_customers = sales_row.unique_customers or 0

    # 3. Total Cost
    cost_data = await db.execute(
        select(
            func.sum(func.coalesce(SaleItem.unit_cost, 0) * SaleItem.quantity).label("total_cost")
        ).join(Sale, Sale.id == SaleItem.sale_id).where(
            Sale.store_id == store_id,
            Sale.sale_date.between(start_date, end_date),
            Sale.admin_id == admin_id
        )
    )
    total_cost = cost_data.scalar() or Decimal("0.00")
    gross_profit = revenue - total_cost

    # 4. New Customers in the date range
    new_cust_data = await db.execute(
        select(func.count(Customer.id)).where(
            Customer.first_visit_store_id == store_id,
            func.cast(Customer.created_at, Date).between(start_date, end_date),
            Customer.admin_id == admin_id
        )
    )
    new_customers = new_cust_data.scalar() or 0

    # 5. Top selling products
    top_products_stmt = select(
        Product.id.label("product_id"),
        Product.name.label("product_name"),
        Product.sku.label("sku"),
        func.sum(SaleItem.quantity).label("quantity_sold"),
        func.sum(SaleItem.line_total).label("total_revenue"),
        func.sum(SaleItem.line_total - func.coalesce(SaleItem.unit_cost, 0) * SaleItem.quantity).label("total_profit")
    ).join(SaleItem, SaleItem.product_id == Product.id) \
     .join(Sale, Sale.id == SaleItem.sale_id) \
     .where(
        Sale.store_id == store_id,
        Sale.sale_date.between(start_date, end_date),
        Sale.admin_id == admin_id
    ).group_by(Product.id, Product.name, Product.sku) \
     .order_by(desc("quantity_sold")) \
     .limit(5)
    
    top_products_res = await db.execute(top_products_stmt)
    top_products = [
        ProductPerformance(
            product_id=row.product_id,
            product_name=row.product_name,
            sku=row.sku,
            quantity_sold=row.quantity_sold,
            total_revenue=row.total_revenue,
            total_profit=row.total_profit
        ) for row in top_products_res.all()
    ]

    # 6. Reorder Alerts List
    reorder_stmt = select(
        Inventory.id.label("inventory_id"),
        Inventory.product_id.label("product_id"),
        Product.name.label("product_name"),
        Product.sku.label("sku"),
        Inventory.quantity.label("current_quantity"),
        Inventory.reorder_level.label("reorder_level")
    ).join(Product, Product.id == Inventory.product_id) \
     .where(
         Inventory.owner_type == "STORE",
         Inventory.owner_id == store_id,
         Inventory.quantity <= Inventory.reorder_level
     )
    
    reorder_res = await db.execute(reorder_stmt)
    reorder_list = [
        InventoryAlertDetail(
            inventory_id=row.inventory_id,
            product_id=row.product_id,
            product_name=row.product_name,
            sku=row.sku,
            current_quantity=row.current_quantity,
            reorder_level=row.reorder_level
        ) for row in reorder_res.all()
    ]

    return StoreReportDetails(
        store_id=store_id,
        store_name=store.store_name,
        revenue=revenue,
        sales_count=sales_count,
        cost=total_cost,
        gross_profit=gross_profit,
        discounts=discounts,
        tax_collected=tax_collected,
        unique_customers=unique_customers,
        new_customers=new_customers,
        top_products=top_products,
        reorder_alerts_count=len(reorder_list),
        reorder_alerts_list=reorder_list
    )


async def get_staff_report(
    db: AsyncSession,
    admin_id: int,
    staff_type: str,
    staff_id: int,
    start_date: date,
    end_date: date
) -> StaffReportDetails:
    """
    Compiles detailed sales performance report for a specific staff member
    (live calculation over date range) including their top sold products.
    """
    # 1. Fetch Staff Member details based on polymorphic StaffType
    first_name, last_name, employee_code = "Unknown", "Staff", "N/A"
    if staff_type == "MANAGER":
        staff_res = await db.execute(select(Manager).where(Manager.id == staff_id))
        staff = staff_res.scalar_one_or_none()
        if staff:
            first_name, last_name, employee_code = staff.first_name, staff.last_name, staff.employee_code
    elif staff_type == "WORKER":
        staff_res = await db.execute(select(Worker).where(Worker.id == staff_id))
        staff = staff_res.scalar_one_or_none()
        if staff:
            first_name, last_name, employee_code = staff.first_name, staff.last_name, staff.employee_code
    elif staff_type == "OPTICIAN":
        staff_res = await db.execute(select(Optician).where(Optician.id == staff_id))
        staff = staff_res.scalar_one_or_none()
        if staff:
            first_name, last_name, employee_code = staff.first_name, staff.last_name, staff.employee_code
    else:
        raise ValueError("Invalid staff type")

    # 2. Query sales metrics for this staff member
    sales_data = await db.execute(
        select(
            func.count(Sale.id).label("sales_count"),
            func.sum(Sale.total_amount).label("revenue"),
            func.sum(Sale.discount_amount).label("discounts_given"),
            func.count(func.distinct(Sale.customer_id)).label("unique_customers")
        ).where(
            Sale.sold_by_type == staff_type,
            Sale.sold_by_id == staff_id,
            Sale.sale_date.between(start_date, end_date),
            Sale.admin_id == admin_id
        )
    )
    sales_row = sales_data.first()
    
    sales_count = sales_row.sales_count or 0
    revenue = sales_row.revenue or Decimal("0.00")
    discounts_given = sales_row.discounts_given or Decimal("0.00")
    unique_customers = sales_row.unique_customers or 0

    # 3. Query top sold products by this staff member
    top_products_stmt = select(
        Product.id.label("product_id"),
        Product.name.label("product_name"),
        Product.sku.label("sku"),
        func.sum(SaleItem.quantity).label("quantity_sold"),
        func.sum(SaleItem.line_total).label("total_revenue"),
        func.sum(SaleItem.line_total - func.coalesce(SaleItem.unit_cost, 0) * SaleItem.quantity).label("total_profit")
    ).join(SaleItem, SaleItem.product_id == Product.id) \
     .join(Sale, Sale.id == SaleItem.sale_id) \
     .where(
        Sale.sold_by_type == staff_type,
        Sale.sold_by_id == staff_id,
        Sale.sale_date.between(start_date, end_date),
        Sale.admin_id == admin_id
    ).group_by(Product.id, Product.name, Product.sku) \
     .order_by(desc("quantity_sold")) \
     .limit(5)
    
    top_products_res = await db.execute(top_products_stmt)
    top_products = [
        ProductPerformance(
            product_id=row.product_id,
            product_name=row.product_name,
            sku=row.sku,
            quantity_sold=row.quantity_sold,
            total_revenue=row.total_revenue,
            total_profit=row.total_profit
        ) for row in top_products_res.all()
    ]

    return StaffReportDetails(
        staff_id=staff_id,
        staff_type=staff_type,
        first_name=first_name,
        last_name=last_name,
        employee_code=employee_code,
        revenue=revenue,
        sales_count=sales_count,
        discounts_given=discounts_given,
        unique_customers_served=unique_customers,
        top_products_sold=top_products
    )
