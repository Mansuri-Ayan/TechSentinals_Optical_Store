# Model: permission.py
from sqlalchemy import BigInteger, Boolean, Column, DateTime, String, Text, UniqueConstraint
from sqlalchemy.sql import func
from db.session import Base


class Permission(Base):
    __tablename__ = "permissions"
    __table_args__ = (UniqueConstraint("module", "action", name="uq_permission_module_action"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    module = Column(String(100), nullable=False, index=True)
    action = Column(String(100), nullable=False)
    key = Column(String(220), nullable=False, unique=True, index=True)
    display_name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    is_dangerous = Column(Boolean, nullable=False, default=False, server_default="false")
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<Permission(id={self.id!r}, key={self.key!r})>"
