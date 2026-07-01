from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db
from core.deps import get_current_user
from services.permission_service import get_effective_permission_map

router = APIRouter()

@router.get("/permissions/me")
async def get_my_permissions(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Returns full effective permission map for current user."""
    permission_map = await get_effective_permission_map(
        db,
        actor_type=current_user.token_role.upper(),
        actor_id=current_user.id,
        admin_id=getattr(current_user, "computed_admin_id", None)
    )
    return {
        "role": current_user.token_role.upper(),
        "permissions": permission_map
    }
