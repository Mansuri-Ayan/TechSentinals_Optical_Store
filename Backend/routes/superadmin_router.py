# Routes: superadmin_router.py
from fastapi import APIRouter
from apis.superadmin.admins import router as admins_router
from apis.superadmin.dashboard import router as dashboard_router
from apis.superadmin.analytics import router as analytics_router
from apis.superadmin.stores import router as stores_router
from apis.superadmin.permissions import router as permissions_router
from apis.superadmin.settings import router as settings_router

superadmin_router = APIRouter(
    prefix="/superadmin",
    tags=["SuperAdmin"],
)

superadmin_router.include_router(dashboard_router)
superadmin_router.include_router(admins_router)
superadmin_router.include_router(analytics_router)
superadmin_router.include_router(stores_router)
superadmin_router.include_router(permissions_router)
superadmin_router.include_router(settings_router)

