# API: superadmin/analytics.py
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from core.deps import get_current_superadmin
from models.superadmin import SuperAdmin
from services.superadmin_analytics_service import (
    get_platform_economic_overview,
    get_revenue_time_series,
    get_payment_methods_breakdown,
    get_tenant_growth_and_health,
    get_geographic_distribution,
    get_optical_catalog_intelligence,
    get_operational_benchmarks,
)

router = APIRouter(prefix="/analytics", tags=["SuperAdmin - Analytics"])


@router.get("/overview")
async def get_analytics_overview(
    days: int = Query(30, ge=1, le=365, description="Period duration in days"),
    db: AsyncSession = Depends(get_db),
    current_superadmin: SuperAdmin = Depends(get_current_superadmin),
):
    """
    Returns platform-wide GMV, invoices, AOV, discounts, taxes with growth comparisons.
    """
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    return await get_platform_economic_overview(db, start_date=start_date, end_date=now)


@router.get("/revenue-trends")
async def get_analytics_revenue_trends(
    interval: str = Query("month", pattern="^(day|week|month)$"),
    days: int = Query(180, ge=7, le=730),
    db: AsyncSession = Depends(get_db),
    current_superadmin: SuperAdmin = Depends(get_current_superadmin),
):
    """
    Returns time series of GMV and completed invoices.
    """
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    return await get_revenue_time_series(db, interval=interval, start_date=start_date, end_date=now)


@router.get("/payment-methods")
async def get_analytics_payment_methods(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_superadmin: SuperAdmin = Depends(get_current_superadmin),
):
    """
    Returns cross-tenant breakdown of payment methods (UPI, Cash, Card, etc.).
    """
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    return await get_payment_methods_breakdown(db, start_date=start_date, end_date=now)


@router.get("/tenant-health")
async def get_analytics_tenant_health(
    db: AsyncSession = Depends(get_db),
    current_superadmin: SuperAdmin = Depends(get_current_superadmin),
):
    """
    Returns tenant acquisition cohorts, active vs dormant scoring, and leaderboard.
    """
    return await get_tenant_growth_and_health(db)


@router.get("/geographic")
async def get_analytics_geographic(
    db: AsyncSession = Depends(get_db),
    current_superadmin: SuperAdmin = Depends(get_current_superadmin),
):
    """
    Returns state-wise and city-wise stores, revenue contribution, and density.
    """
    return await get_geographic_distribution(db)


@router.get("/categories-brands")
async def get_analytics_categories_brands(
    db: AsyncSession = Depends(get_db),
    current_superadmin: SuperAdmin = Depends(get_current_superadmin),
):
    """
    Returns category market share, top brands, and direct vs prescription ratio.
    """
    return await get_optical_catalog_intelligence(db)


@router.get("/operational-health")
async def get_analytics_operational_health(
    db: AsyncSession = Depends(get_db),
    current_superadmin: SuperAdmin = Depends(get_current_superadmin),
):
    """
    Returns platform-wide inventory valuation, deadstock locked capital, and store infrastructure.
    """
    return await get_operational_benchmarks(db)
