# Routes: superadmin_router.py
from fastapi import APIRouter
from apis.superadmin.admins import router as admins_router

superadmin_router = APIRouter(
    prefix="/superadmin",
    tags=["SuperAdmin"],
)

superadmin_router.include_router(admins_router)
