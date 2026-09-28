# Service: superadmin_analytics_service.py
"""
SuperAdmin Platform Analytics & Intelligence Service.
High-performance analytical engine aggregating platform-wide economics,
tenant lifecycle & health scoring, geographic distribution, optical catalog share,
and operational supply-chain benchmarks.
"""
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional, List, Dict, Any

from sqlalchemy import (
    select,
    func,
    or_,
    and_,
    desc,
    case,
    text,
    distinct,
)
from sqlalchemy.ext.asyncio import AsyncSession

from models.admin import Admin, AdminStatus
from models.store import Store
from models.sale import Sale, SaleStatus
from models.sale_payment import SalePayment
from models.sale_item import SaleItem
from models.product import Product
from models.category import Category
from models.brand import Brand
from models.inventory import Inventory
from models.deadstock_item import DeadstockItem
from models.manager import Manager
from models.worker import Worker
from models.optician import Optician
from models.accountant import Accountant


async def get_platform_economic_overview(
    db: AsyncSession,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Returns high-level economic KPIs (GMV, invoices, AOV, discounts, taxes)
    with automated comparison to the prior period of equal length.
    """
    now = datetime.now(timezone.utc)
    if not end_date:
        end_date = now
    if not start_date:
        start_date = now - timedelta(days=30)

    period_duration = end_date - start_date
    prior_start = start_date - period_duration
    prior_end = start_date

    # Current Period Query
    curr_stmt = select(
        func.coalesce(func.sum(Sale.total_amount), 0).label("gmv"),
        func.coalesce(func.sum(Sale.discount_amount), 0).label("discounts"),
        func.coalesce(func.sum(Sale.tax_amount), 0).label("tax"),
        func.count(Sale.id).label("invoices"),
    ).where(
        Sale.status == SaleStatus.COMPLETED,
        Sale.created_at >= start_date,
        Sale.created_at <= end_date,
    )
    curr_res = (await db.execute(curr_stmt)).first()
    curr_gmv = float(curr_res.gmv or 0)
    curr_discounts = float(curr_res.discounts or 0)
    curr_tax = float(curr_res.tax or 0)
    curr_invoices = int(curr_res.invoices or 0)
    curr_aov = round(curr_gmv / curr_invoices, 2) if curr_invoices > 0 else 0.0

    # Prior Period Query for growth calculation
    prior_stmt = select(
        func.coalesce(func.sum(Sale.total_amount), 0).label("gmv"),
        func.count(Sale.id).label("invoices"),
    ).where(
        Sale.status == SaleStatus.COMPLETED,
        Sale.created_at >= prior_start,
        Sale.created_at <= prior_end,
    )
    prior_res = (await db.execute(prior_stmt)).first()
    prior_gmv = float(prior_res.gmv or 0)
    prior_invoices = int(prior_res.invoices or 0)

    # Growth calculations
    gmv_growth = round(((curr_gmv - prior_gmv) / prior_gmv) * 100, 1) if prior_gmv > 0 else 0.0
    invoices_growth = round(((curr_invoices - prior_invoices) / prior_invoices) * 100, 1) if prior_invoices > 0 else 0.0

    # Lifetime Platform Totals
    lifetime_stmt = select(
        func.coalesce(func.sum(Sale.total_amount), 0).label("lifetime_gmv"),
        func.count(Sale.id).label("lifetime_invoices"),
    ).where(Sale.status == SaleStatus.COMPLETED)
    lifetime_res = (await db.execute(lifetime_stmt)).first()
    lifetime_gmv = float(lifetime_res.lifetime_gmv or 0)
    lifetime_invoices = int(lifetime_res.lifetime_invoices or 0)

    return {
        "period": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
            "gmv": curr_gmv,
            "invoices": curr_invoices,
            "aov": curr_aov,
            "discounts": curr_discounts,
            "tax": curr_tax,
            "gmv_growth_pct": gmv_growth,
            "invoices_growth_pct": invoices_growth,
        },
        "lifetime": {
            "gmv": lifetime_gmv,
            "invoices": lifetime_invoices,
        }
    }


async def get_revenue_time_series(
    db: AsyncSession,
    interval: str = "month",
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """
    Returns time series data of GMV and completed invoices grouped by day, week, or month.
    """
    now = datetime.now(timezone.utc)
    if not end_date:
        end_date = now
    if not start_date:
        start_date = now - timedelta(days=180 if interval == "month" else 30)

    trunc_unit = "day" if interval in ("day", "daily") else ("week" if interval in ("week", "weekly") else "month")

    stmt = select(
        func.date_trunc(trunc_unit, Sale.created_at).label("time_bucket"),
        func.coalesce(func.sum(Sale.total_amount), 0).label("gmv"),
        func.count(Sale.id).label("invoices"),
    ).where(
        Sale.status == SaleStatus.COMPLETED,
        Sale.created_at >= start_date,
        Sale.created_at <= end_date,
    ).group_by(
        text("time_bucket")
    ).order_by(
        text("time_bucket ASC")
    )

    result = await db.execute(stmt)
    rows = result.fetchall()

    series = []
    for r in rows:
        dt = r.time_bucket
        if trunc_unit == "day":
            label = dt.strftime("%d %b")
        elif trunc_unit == "week":
            label = f"Wk {dt.strftime('%d %b')}"
        else:
            label = dt.strftime("%b %Y")

        series.append({
            "timestamp": dt.isoformat() if hasattr(dt, "isoformat") else str(dt),
            "label": label,
            "value": float(r.gmv or 0),
            "invoices": int(r.invoices or 0),
        })

    return series


async def get_payment_methods_breakdown(
    db: AsyncSession,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """
    Returns cross-tenant breakdown of payment methods (UPI, Cash, Card, etc.).
    """
    conditions = []
    if start_date:
        conditions.append(SalePayment.created_at >= start_date)
    if end_date:
        conditions.append(SalePayment.created_at <= end_date)

    stmt = select(
        SalePayment.payment_method,
        func.coalesce(func.sum(SalePayment.amount), 0).label("total_amount"),
        func.count(SalePayment.id).label("tx_count"),
    )
    if conditions:
        stmt = stmt.where(and_(*conditions))
    stmt = stmt.group_by(SalePayment.payment_method).order_by(desc("total_amount"))

    result = await db.execute(stmt)
    rows = result.fetchall()

    total_sum = sum(float(r.total_amount or 0) for r in rows) or 1.0

    breakdown = []
    for r in rows:
        amt = float(r.total_amount or 0)
        breakdown.append({
            "method": r.payment_method or "Other",
            "amount": amt,
            "count": int(r.tx_count or 0),
            "percentage": round((amt / total_sum) * 100, 1),
        })

    return breakdown


async def get_tenant_growth_and_health(
    db: AsyncSession,
) -> Dict[str, Any]:
    """
    Returns Tenant Acquisition Cohorts, Active vs Dormant (Health Scoring),
    Multi-Store expansion metrics, and Top 10 Leaderboard.
    """
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)
    fourteen_days_ago = now - timedelta(days=14)
    thirty_days_ago = now - timedelta(days=30)

    # 1. Total Tenants and Status breakdown
    admin_stmt = select(
        Admin.status,
        func.count(Admin.id).label("count")
    ).where(Admin.deleted_at.is_(None)).group_by(Admin.status)
    admin_res = (await db.execute(admin_stmt)).fetchall()

    status_counts = {"ACTIVE": 0, "SUSPENDED": 0, "INACTIVE": 0}
    total_tenants = 0
    for r in admin_res:
        st = r.status.value if hasattr(r.status, "value") else str(r.status)
        status_counts[st] = int(r.count or 0)
        total_tenants += int(r.count or 0)

    # 2. Monthly Acquisition Cohorts (Last 12 months)
    one_year_ago = now - timedelta(days=365)
    acq_stmt = select(
        func.date_trunc("month", Admin.created_at).label("month"),
        func.count(Admin.id).label("new_tenants")
    ).where(
        Admin.deleted_at.is_(None),
        Admin.created_at >= one_year_ago,
    ).group_by(text("month")).order_by(text("month ASC"))
    acq_res = (await db.execute(acq_stmt)).fetchall()

    cohorts = [
        {
            "label": r.month.strftime("%b %Y"),
            "value": int(r.new_tenants or 0)
        }
        for r in acq_res
    ]

    # 3. Tenant Activity Health Scoring
    # Query all active admins with their latest sale date
    health_stmt = select(
        Admin.id,
        Admin.business_name,
        Admin.owner_first_name,
        Admin.owner_last_name,
        Admin.email,
        Admin.phone,
        Admin.status,
        func.max(Sale.created_at).label("latest_sale"),
        func.coalesce(func.sum(case((Sale.status == SaleStatus.COMPLETED, Sale.total_amount), else_=0)), 0).label("gmv"),
        func.count(distinct(Store.id)).label("store_count"),
    ).outerjoin(
        Sale, and_(Sale.admin_id == Admin.id, Sale.status == SaleStatus.COMPLETED)
    ).outerjoin(
        Store, and_(Store.admin_id == Admin.id, Store.deleted_at.is_(None))
    ).where(
        Admin.deleted_at.is_(None)
    ).group_by(
        Admin.id
    )
    health_res = (await db.execute(health_stmt)).fetchall()

    thriving_count = 0
    active_count = 0
    dormant_count = 0
    multi_store_tenants = 0
    single_store_tenants = 0

    leaderboard = []

    for row in health_res:
        stores = int(row.store_count or 0)
        if stores >= 2:
            multi_store_tenants += 1
        elif stores == 1:
            single_store_tenants += 1

        latest = row.latest_sale
        gmv_val = float(row.gmv or 0)

        # Activity classification
        if latest and latest >= seven_days_ago:
            thriving_count += 1
            health_status = "THRIVING"
        elif latest and latest >= fourteen_days_ago:
            active_count += 1
            health_status = "ACTIVE"
        else:
            dormant_count += 1
            health_status = "DORMANT"

        leaderboard.append({
            "admin_id": row.id,
            "business_name": row.business_name,
            "owner_name": f"{row.owner_first_name or ''} {row.owner_last_name or ''}".strip(),
            "email": row.email,
            "phone": row.phone,
            "store_count": stores,
            "gmv": gmv_val,
            "health_status": health_status,
            "latest_sale_date": latest.isoformat() if latest else None,
        })

    # Sort leaderboard by GMV descending (top 10)
    leaderboard.sort(key=lambda x: x["gmv"], reverse=True)
    top_10 = leaderboard[:10]

    expansion_rate = round((multi_store_tenants / total_tenants * 100), 1) if total_tenants > 0 else 0.0

    return {
        "summary": {
            "total_tenants": total_tenants,
            "active_tenants": status_counts.get("ACTIVE", 0),
            "suspended_tenants": status_counts.get("SUSPENDED", 0),
            "inactive_tenants": status_counts.get("INACTIVE", 0),
            "thriving_tenants": thriving_count,
            "active_weekly_tenants": active_count,
            "dormant_tenants": dormant_count,
            "multi_store_tenants": multi_store_tenants,
            "single_store_tenants": single_store_tenants,
            "multi_store_expansion_rate_pct": expansion_rate,
        },
        "acquisition_cohorts": cohorts,
        "top_tenants_leaderboard": top_10,
        "dormant_tenants_sample": [t for t in leaderboard if t["health_status"] == "DORMANT"][:8],
    }


async def get_geographic_distribution(
    db: AsyncSession,
) -> Dict[str, Any]:
    """
    Returns state-wise and top city-wise store distribution and GMV contributions.
    """
    # 1. State-wise aggregation
    state_stmt = select(
        func.coalesce(Store.state, "Unknown").label("state_name"),
        func.count(distinct(Store.id)).label("total_stores"),
        func.count(distinct(case((Store.is_active == True, Store.id)))).label("active_stores"),
        func.coalesce(func.sum(case((Sale.status == SaleStatus.COMPLETED, Sale.total_amount), else_=0)), 0).label("gmv"),
    ).outerjoin(
        Sale, and_(Sale.store_id == Store.id, Sale.status == SaleStatus.COMPLETED)
    ).where(
        Store.deleted_at.is_(None)
    ).group_by(
        text("state_name")
    ).order_by(
        desc("gmv")
    )
    state_res = (await db.execute(state_stmt)).fetchall()

    total_platform_gmv = sum(float(r.gmv or 0) for r in state_res) or 1.0

    states = []
    for r in state_res:
        gmv_val = float(r.gmv or 0)
        states.append({
            "state": r.state_name,
            "stores": int(r.total_stores or 0),
            "active_stores": int(r.active_stores or 0),
            "gmv": gmv_val,
            "share_pct": round((gmv_val / total_platform_gmv) * 100, 1),
        })

    # 2. City-wise Top 10
    city_stmt = select(
        func.coalesce(Store.city, "Unknown").label("city_name"),
        func.coalesce(Store.state, "Unknown").label("state_name"),
        func.count(distinct(Store.id)).label("stores"),
        func.coalesce(func.sum(case((Sale.status == SaleStatus.COMPLETED, Sale.total_amount), else_=0)), 0).label("gmv"),
    ).outerjoin(
        Sale, and_(Sale.store_id == Store.id, Sale.status == SaleStatus.COMPLETED)
    ).where(
        Store.deleted_at.is_(None)
    ).group_by(
        text("city_name"), text("state_name")
    ).order_by(
        desc("gmv")
    ).limit(10)
    city_res = (await db.execute(city_stmt)).fetchall()

    cities = [
        {
            "city": r.city_name,
            "state": r.state_name,
            "stores": int(r.stores or 0),
            "gmv": float(r.gmv or 0),
        }
        for r in city_res
    ]

    return {
        "states": states,
        "top_cities": cities,
    }


async def get_optical_catalog_intelligence(
    db: AsyncSession,
) -> Dict[str, Any]:
    """
    Returns category market share, brand popularity, and direct vs prescription ratio.
    """
    # 1. Category Volume Share
    cat_stmt = select(
        Category.name.label("category_name"),
        func.count(SaleItem.id).label("units_sold"),
        func.coalesce(func.sum(SaleItem.line_total), 0).label("total_revenue")
    ).join(
        Product, SaleItem.product_id == Product.id
    ).join(
        Category, Product.category_id == Category.id
    ).group_by(
        Category.name
    ).order_by(
        desc("total_revenue")
    )
    cat_res = (await db.execute(cat_stmt)).fetchall()

    total_cat_rev = sum(float(r.total_revenue or 0) for r in cat_res) or 1.0

    categories = [
        {
            "name": r.category_name,
            "units_sold": int(r.units_sold or 0),
            "revenue": float(r.total_revenue or 0),
            "share_pct": round((float(r.total_revenue or 0) / total_cat_rev) * 100, 1),
        }
        for r in cat_res
    ]

    # 2. Top Brands across Platform
    brand_stmt = select(
        Brand.name.label("brand_name"),
        func.count(SaleItem.id).label("units_sold"),
        func.coalesce(func.sum(SaleItem.line_total), 0).label("total_revenue")
    ).join(
        Product, SaleItem.product_id == Product.id
    ).join(
        Brand, Product.brand_id == Brand.id
    ).group_by(
        Brand.name
    ).order_by(
        desc("total_revenue")
    ).limit(10)
    brand_res = (await db.execute(brand_stmt)).fetchall()

    top_brands = [
        {
            "brand": r.brand_name,
            "units_sold": int(r.units_sold or 0),
            "revenue": float(r.total_revenue or 0),
        }
        for r in brand_res
    ]

    # 3. Direct Sale vs Prescription/Order Ratio
    # Processing type on SaleItem: 'DIRECT' vs 'ORDER'
    proc_stmt = select(
        func.coalesce(SaleItem.processing_type, "DIRECT").label("ptype"),
        func.count(SaleItem.id).label("item_count"),
        func.coalesce(func.sum(SaleItem.line_total), 0).label("amount")
    ).group_by(text("ptype"))
    proc_res = (await db.execute(proc_stmt)).fetchall()

    direct_units = 0
    direct_amount = 0.0
    order_units = 0
    order_amount = 0.0

    for r in proc_res:
        ptype = str(r.ptype).upper()
        if "ORDER" in ptype:
            order_units += int(r.item_count or 0)
            order_amount += float(r.amount or 0)
        else:
            direct_units += int(r.item_count or 0)
            direct_amount += float(r.amount or 0)

    total_units = direct_units + order_units or 1

    return {
        "categories": categories,
        "top_brands": top_brands,
        "workflow_ratio": {
            "direct_sales_units": direct_units,
            "direct_sales_amount": direct_amount,
            "direct_percentage": round((direct_units / total_units) * 100, 1),
            "prescription_order_units": order_units,
            "prescription_order_amount": order_amount,
            "prescription_percentage": round((order_units / total_units) * 100, 1),
        }
    }


async def get_operational_benchmarks(
    db: AsyncSession,
) -> Dict[str, Any]:
    """
    Returns platform-wide inventory valuation, deadstock locked capital,
    and lab turnaround benchmarks.
    """
    # 1. Total Platform Inventory Valuation & Unit Count
    inv_stmt = select(
        func.coalesce(func.sum(Inventory.quantity), 0).label("total_units"),
        func.coalesce(func.sum(Inventory.available_quantity), 0).label("available_units"),
        func.coalesce(
            func.sum(Inventory.quantity * func.coalesce(Product.cost_price, Product.selling_price, 0)),
            0
        ).label("total_valuation")
    ).join(Product, Inventory.product_id == Product.id).where(Inventory.is_active.is_(True))
    inv_res = (await db.execute(inv_stmt)).first()

    total_stock_units = int(inv_res.total_units or 0)
    available_stock_units = int(inv_res.available_units or 0)
    total_inventory_valuation = float(inv_res.total_valuation or 0)

    # 2. Deadstock Locked Capital
    dead_stmt = select(
        func.count(DeadstockItem.id).label("deadstock_items_count"),
        func.coalesce(func.sum(DeadstockItem.quantity), 0).label("deadstock_units"),
        func.coalesce(func.sum(DeadstockItem.original_price * DeadstockItem.quantity), 0).label("locked_capital"),
    ).where(DeadstockItem.status == "AVAILABLE")
    dead_res = (await db.execute(dead_stmt)).first()

    deadstock_items = int(dead_res.deadstock_items_count or 0) if dead_res else 0
    deadstock_units = int(dead_res.deadstock_units or 0) if dead_res else 0
    deadstock_locked_capital = float(dead_res.locked_capital or 0) if dead_res else 0.0

    # 3. Total Stores & Staff Count
    stores_count_stmt = select(func.count(Store.id)).where(Store.deleted_at.is_(None))
    total_stores = (await db.execute(stores_count_stmt)).scalar() or 0

    mgr_count = (await db.execute(select(func.count(Manager.id)).where(Manager.deleted_at.is_(None)))).scalar() or 0
    wrk_count = (await db.execute(select(func.count(Worker.id)).where(Worker.deleted_at.is_(None)))).scalar() or 0
    opt_count = (await db.execute(select(func.count(Optician.id)).where(Optician.deleted_at.is_(None)))).scalar() or 0
    acc_count = (await db.execute(select(func.count(Accountant.id)).where(Accountant.deleted_at.is_(None)))).scalar() or 0
    total_staff = mgr_count + wrk_count + opt_count + acc_count

    return {
        "inventory": {
            "total_stock_units": total_stock_units,
            "available_stock_units": available_stock_units,
            "total_inventory_valuation": round(total_inventory_valuation, 2),
        },
        "deadstock": {
            "deadstock_items_count": deadstock_items,
            "deadstock_units": deadstock_units,
            "locked_capital": round(deadstock_locked_capital, 2),
        },
        "infrastructure": {
            "total_stores": total_stores,
            "total_staff": total_staff,
            "managers": mgr_count,
            "workers": wrk_count,
            "opticians": opt_count,
            "accountants": acc_count,
        }
    }
