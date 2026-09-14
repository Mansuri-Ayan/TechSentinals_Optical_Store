# API: manager/update.py
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_user
from db.session import get_db
from models.admin import Admin
from models.manager import Manager
from schemas.manager import ManagerRead, ManagerUpdate
from services.store_service import get_store
from services.manager_service import get_manager, update_manager

router = APIRouter()


@router.put(
    "/managers/{manager_id}",
    response_model=Any,
    summary="Update a manager",
    description="Update fields on a manager.",
)
async def update_manager_endpoint(
    manager_id: int,
    payload: ManagerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
) -> Any:
    manager = await get_manager(db, manager_id)
    if manager is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manager not found",
        )

    # Allow currently logged-in manager to edit their own details
    is_self = isinstance(current_user, Manager) and current_user.id == manager_id

    if not is_self:
        from core.deps import get_user_admin_id
        from services.permission_service import has_permission
        from models.superadmin import SuperAdmin
        
        actor_type = None
        if isinstance(current_user, SuperAdmin):
            actor_type = "SUPER_ADMIN"
        elif isinstance(current_user, Admin):
            actor_type = "ADMIN"
        elif isinstance(current_user, Manager):
            actor_type = "MANAGER"
        
        if not actor_type:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unrecognized actor type")
            
        if actor_type not in ("SUPER_ADMIN", "ADMIN"):
            actor_admin_id = get_user_admin_id(current_user)
            granted = await has_permission(db, actor_type, current_user.id, actor_admin_id, "managers:update")
            if not granted:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Missing permission. Required: managers:update",
                )

    if isinstance(current_user, Admin):
        store = await get_store(db, manager.store_id)
        if store is None or store.admin_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Manager not found",
            )
    elif isinstance(current_user, Manager):
        if current_user.store_id != manager.store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this manager's details",
            )
    else:
        from models.superadmin import SuperAdmin
        if not isinstance(current_user, SuperAdmin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

    if payload.store_id is not None:
        from models.superadmin import SuperAdmin
        if isinstance(current_user, Admin):
            target_store = await get_store(db, payload.store_id)
            if target_store is None or target_store.admin_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid target store: Store does not exist or belongs to another administrator",
                )
        elif isinstance(current_user, SuperAdmin):
            target_store = await get_store(db, payload.store_id)
            if target_store is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid target store: Store does not exist",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators are allowed to change the assigned store of a staff member",
            )

    if payload.role is not None and payload.role.lower() != "manager":
        from models.superadmin import SuperAdmin
        if not isinstance(current_user, Admin) and not isinstance(current_user, SuperAdmin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators are allowed to change the role of a staff member",
            )
        target_role = payload.role.lower()
        if target_role not in ("worker", "optician"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid target role. Must be 'worker' or 'optician'.",
            )
        
        from services.staff_service import transition_staff_role
        update_data = payload.model_dump(exclude_unset=True)
        updated = await transition_staff_role(
            db=db,
            staff_id=manager_id,
            current_role="manager",
            target_role=target_role,
            update_payload=update_data,
        )
        if target_role == "worker":
            from schemas.worker import WorkerRead
            return WorkerRead.model_validate(updated)
        else:
            from schemas.optician import OpticianRead
            return OpticianRead.model_validate(updated)

    updated = await update_manager(db, manager, payload)
    return ManagerRead.model_validate(updated)
