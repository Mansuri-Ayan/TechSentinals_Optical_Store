# Model: user_permission_override.py
"""
UserPermissionOverride — a permission explicitly set for ONE specific
person, overriding both AdminRolePermissionOverride and
GlobalRolePermission for that permission key. Rows here are sparse —
only written when someone actually customizes something for that
person; absence of a row means "fall through to the next tier," not
"deny." user_type+user_id is polymorphic, mirroring the owner_type/
owner_id pattern already used by Inventory and Expense in this codebase.
"""
import enum
from sqlalchemy import BigInteger, Boolean, Column, DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class PermissionUserType(str, enum.Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    WORKER = "WORKER"
    OPTICIAN = "OPTICIAN"
    ACCOUNTANT = "ACCOUNTANT"


class PermissionActorType(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"


class UserPermissionOverride(Base):
    __tablename__ = "user_permission_overrides"
    __table_args__ = (
        UniqueConstraint("user_type", "user_id", "permission_id", name="uq_user_permission_override"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_type = Column(Enum(PermissionUserType, name="permission_user_type_enum",
                             create_constraint=True), nullable=False, index=True)
    user_id = Column(BigInteger, nullable=False, index=True,
                      comment="Polymorphic FK — admins/managers/workers/opticians/accountants.id")
    permission_id = Column(BigInteger, ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False, index=True)
    is_granted = Column(Boolean, nullable=False, default=False, server_default="false")

    admin_id = Column(BigInteger, ForeignKey("admins.id", ondelete="CASCADE"), nullable=False, index=True)
    granted_by_id = Column(BigInteger, nullable=False, comment="admins.id of who set this override")

    set_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    permission = relationship("Permission", lazy="selectin")
    admin = relationship("Admin", lazy="selectin", foreign_keys=[admin_id])

    def __repr__(self) -> str:
        return (f"<UserPermissionOverride(user_type={self.user_type!r}, user_id={self.user_id!r}, "
                f"granted={self.is_granted!r})>")
