# API: auth/register.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.session import get_db
from core.security import hash_password
from models.admin import Admin, AdminStatus
from models.role import Role
from schemas.admin import AdminCreate, AdminRead
from services.permission_service import copy_global_permissions_to_admin
from services.otp_service import verify_registration_token

router = APIRouter()


@router.post(
    "/register/admin",
    response_model=AdminRead,
    status_code=status.HTTP_201_CREATED,
    summary="Public Admin registration",
    description="Register a new Admin account. Validates OTP verification token and copies default permissions.",
)
async def register_admin(
    payload: AdminCreate,
    db: AsyncSession = Depends(get_db)
) -> AdminRead:
    # 1. Check OTP verification token
    if payload.verification_token:
        is_valid = verify_registration_token(payload.verification_token, payload.email)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email verification token is invalid or expired. Please verify your email with OTP first.",
            )
        is_email_verified = True
    else:
        is_email_verified = False

    # Check unique email constraint
    stmt = select(Admin).where(Admin.email == payload.email)
    existing_email = (await db.execute(stmt)).scalar_one_or_none()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Check unique phone constraint
    stmt = select(Admin).where(Admin.phone == payload.phone)
    existing_phone = (await db.execute(stmt)).scalar_one_or_none()
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered",
        )

    # Get "admin" role
    stmt = select(Role).where(Role.role == "admin")
    admin_role = (await db.execute(stmt)).scalar_one_or_none()
    if not admin_role:
        admin_role = Role(role="admin")
        db.add(admin_role)
        await db.commit()
        await db.refresh(admin_role)

    new_admin = Admin(
        business_name=payload.business_name,
        owner_first_name=payload.owner_first_name,
        owner_last_name=payload.owner_last_name,
        email=payload.email,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        profile_image=payload.profile_image,
        gst_number=payload.gst_number,
        pan_number=payload.pan_number,
        address=payload.address,
        city=payload.city,
        state=payload.state,
        pincode=payload.pincode,
        role_id=admin_role.id,
        status=AdminStatus.ACTIVE,
        warehouse_enabled=False,
        is_email_verified=is_email_verified,
        is_phone_verified=False,
    )
    db.add(new_admin)
    await db.commit()
    await db.refresh(new_admin)

    # Copy global permissions defaults to admin overrides
    await copy_global_permissions_to_admin(db, new_admin.id)

    return new_admin
