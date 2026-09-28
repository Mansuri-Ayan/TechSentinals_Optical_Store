# API: superadmin/settings.py
import sys
import platform
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from db.session import get_db
from core.deps import get_current_superadmin
from core.security import verify_password, hash_password
from models.superadmin import SuperAdmin
from schemas.superadmin import SuperAdminOut

router = APIRouter(prefix="/settings", tags=["SuperAdmin - Settings"])


@router.get("/profile")
async def get_profile(
    current_superadmin: SuperAdmin = Depends(get_current_superadmin),
):
    """
    Returns current authenticated SuperAdmin's profile.
    """
    return {
        "id": current_superadmin.id,
        "first_name": current_superadmin.first_name,
        "last_name": current_superadmin.last_name,
        "email": current_superadmin.email,
        "status": current_superadmin.status.value if hasattr(current_superadmin.status, "value") else str(current_superadmin.status),
        "profile_image": current_superadmin.profile_image,
        "created_at": current_superadmin.created_at.isoformat() if current_superadmin.created_at else None,
        "last_login_at": current_superadmin.last_login_at.isoformat() if current_superadmin.last_login_at else None,
    }


@router.put("/profile")
async def update_profile(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_superadmin: SuperAdmin = Depends(get_current_superadmin),
):
    """
    Updates SuperAdmin profile (first_name, last_name, profile_image).
    """
    if "first_name" in payload and payload["first_name"]:
        current_superadmin.first_name = payload["first_name"].strip()
    if "last_name" in payload and payload["last_name"]:
        current_superadmin.last_name = payload["last_name"].strip()
    if "profile_image" in payload:
        current_superadmin.profile_image = payload["profile_image"]

    await db.commit()
    await db.refresh(current_superadmin)

    return {
        "success": True,
        "message": "Profile updated successfully",
        "profile": {
            "first_name": current_superadmin.first_name,
            "last_name": current_superadmin.last_name,
            "email": current_superadmin.email,
            "profile_image": current_superadmin.profile_image,
        }
    }


@router.post("/change-password")
async def change_password(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_superadmin: SuperAdmin = Depends(get_current_superadmin),
):
    """
    Changes SuperAdmin password with current password verification.
    """
    current_password = payload.get("current_password")
    new_password = payload.get("new_password")

    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="Current password and new password are required")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    # Verify current password
    if not verify_password(current_password, current_superadmin.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    current_superadmin.password_hash = hash_password(new_password)
    await db.commit()

    return {
        "success": True,
        "message": "Password changed successfully",
    }


@router.get("/system-health")
async def get_system_health(
    db: AsyncSession = Depends(get_db),
    current_superadmin: SuperAdmin = Depends(get_current_superadmin),
):
    """
    Returns platform diagnostics: PostgreSQL connectivity, Python runtime, uptime.
    """
    # Test DB ping
    db_connected = False
    db_version = "Unknown"
    try:
        res = await db.execute(text("SELECT version();"))
        db_version = str(res.scalar() or "Connected")
        db_connected = True
    except Exception as e:
        db_version = str(e)

    return {
        "status": "HEALTHY" if db_connected else "DEGRADED",
        "database": {
            "connected": db_connected,
            "version": db_version[:80] + "..." if len(db_version) > 80 else db_version,
            "type": "PostgreSQL",
        },
        "environment": {
            "python_version": platform.python_version(),
            "os": f"{platform.system()} {platform.release()}",
            "arch": platform.machine(),
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
