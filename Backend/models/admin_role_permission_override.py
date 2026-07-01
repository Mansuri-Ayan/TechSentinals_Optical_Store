# Model: admin_role_permission_override.py
"""
AdminRolePermissionOverride — one specific Admin's own default for an
entire role type within their business, e.g. "all MY Workers can do X
by default." Sits between GlobalRolePermission (platform default) and
UserPermissionOverride (one person) in the resolution chain. Does not
apply to role_type=ADMIN (an Admin has no business above them besides
SuperAdmin itself, so Admin's own chain skips this tier).

Editing a row here takes effect immediately for every current
Manager/Worker/Optician/Accountant under this Admin who does not have
a more specific UserPermissionOverride for the same permission.
"""
from sqlalchemy import BigInteger, Boolean, Column, DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base
from models.global_role_permission import PermissionRoleType


class AdminRolePermissionOverride(Base):
    __tablename__ = "admin_role_permission_overrides"
    __table_args__ = (
        UniqueConstraint("admin_id", "role_type", "permission_id",
                          name="uq_admin_role_permission_override"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    admin_id = Column(BigInteger, ForeignKey("admins.id", ondelete="CASCADE"),
                       nullable=False, index=True,
                       comment="The business this role-level override belongs to")
    role_type = Column(Enum(PermissionRoleType, name="permission_role_type_enum",
                             create_constraint=True), nullable=False, index=True,
                        comment="MANAGER / WORKER / OPTICIAN / ACCOUNTANT only — never ADMIN")
    permission_id = Column(BigInteger, ForeignKey("permissions.id", ondelete="CASCADE"),
                            nullable=False, index=True)
    is_granted = Column(Boolean, nullable=False, default=False, server_default="false")

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    admin = relationship("Admin", lazy="selectin")
    permission = relationship("Permission", lazy="selectin")

    def __repr__(self) -> str:
        return (f"<AdminRolePermissionOverride(admin_id={self.admin_id!r}, "
                f"role_type={self.role_type!r}, permission_id={self.permission_id!r})>")
