# Model: global_role_permission.py
"""
GlobalRolePermission — SuperAdmin's platform-wide default for one
(role_type, permission) pair. This is the final fallback in the
permission resolution chain (see permission_service.has_permission).
Editing a row here takes effect immediately for every business/user
that has nothing more specific set at the AdminRolePermissionOverride
or UserPermissionOverride tiers — there is no propagation step because
nothing downstream is ever cloned from this table.
"""
import enum
from sqlalchemy import BigInteger, Boolean, Column, DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class PermissionRoleType(str, enum.Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    WORKER = "WORKER"
    OPTICIAN = "OPTICIAN"
    ACCOUNTANT = "ACCOUNTANT"
    # SuperAdmin excluded — always full access, never goes through this chain.


class GlobalRolePermission(Base):
    __tablename__ = "global_role_permissions"
    __table_args__ = (UniqueConstraint("role_type", "permission_id", name="uq_global_role_permission"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    role_type = Column(Enum(PermissionRoleType, name="permission_role_type_enum",
                             create_constraint=True), nullable=False, index=True)
    permission_id = Column(BigInteger, ForeignKey("permissions.id", ondelete="CASCADE"),
                            nullable=False, index=True)
    is_granted = Column(Boolean, nullable=False, default=False, server_default="false")
    updated_by_superadmin_id = Column(BigInteger, ForeignKey("super_admins.id", ondelete="SET NULL"),
                                       nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    permission = relationship("Permission", lazy="selectin")

    def __repr__(self) -> str:
        return f"<GlobalRolePermission(role_type={self.role_type!r}, permission_id={self.permission_id!r})>"
