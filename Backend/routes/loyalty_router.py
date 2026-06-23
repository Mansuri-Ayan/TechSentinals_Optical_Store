from fastapi import APIRouter

from apis.loyalty.config import router as loyalty_config_router
from apis.loyalty.categories import router as loyalty_categories_router
from apis.loyalty.stats import router as loyalty_stats_router
from apis.loyalty.customers import router as loyalty_customers_router
from apis.loyalty.adjust import router as loyalty_adjust_router

router = APIRouter()

router.include_router(loyalty_config_router, tags=["Loyalty - Admin"])
router.include_router(loyalty_categories_router, tags=["Loyalty - Admin"])
router.include_router(loyalty_stats_router, tags=["Loyalty - Admin"])
router.include_router(loyalty_customers_router, tags=["Loyalty - Admin"])
router.include_router(loyalty_adjust_router, tags=["Loyalty - Admin"])
