# Schema: permission.py
from typing import Dict, List, Literal, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class PermissionOut(BaseModel):
    id: int
    module: str
    action: str
    key: str
    label: str
    is_special: bool

    model_config = ConfigDict(from_attributes=True)


class EffectivePermissionItem(BaseModel):
    permission: PermissionOut
    is_granted: bool
    source_tier: Literal["GLOBAL", "ADMIN_ROLE", "USER", "NONE"]


class MyPermissionsResponse(BaseModel):
    permissions: Dict[str, bool]


class PermissionUpdateBase(BaseModel):
    is_granted: bool


class GlobalRolePermissionUpdate(PermissionUpdateBase):
    pass


class AdminRolePermissionUpdate(PermissionUpdateBase):
    pass


class UserPermissionUpdate(PermissionUpdateBase):
    pass


class PermissionAuditLogOut(BaseModel):
    id: int
    level: str
    actor_type: str
    actor_id: int
    target_role_type: Optional[str] = None
    target_admin_id: Optional[int] = None
    target_user_type: Optional[str] = None
    target_user_id: Optional[int] = None
    permission_id: Optional[int] = None
    permission_key: str
    old_value: Optional[bool] = None
    new_value: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
