# Model: admin.py
import enum
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class AdminStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"


class Admin(Base):
    __tablename__ = "admins"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    business_name = Column(
        String(255),
        nullable=False,
        comment="Name of the optical store business",
    )

    owner_first_name = Column(
        String(100),
        nullable=False,
        comment="Owner's first name",
    )
    owner_last_name = Column(
        String(100),
        nullable=False,
        comment="Owner's last name",
    )

    email = Column(
        String(255),
        nullable=False,
        unique=True,
        index=True,
        comment="Unique email — used as login identifier",
    )
    phone = Column(
        String(10),
        nullable=False,
        unique=True,
        index=True,
        comment="10-digit phone number",
    )

    password_hash = Column(
        Text,
        nullable=False,
        comment="bcrypt hash (cost=12) of the admin's password",
    )

    profile_image = Column(
        Text,
        nullable=True,
        comment="URL or path to profile image",
    )

    gst_number = Column(
        String(15),
        nullable=True,
        comment="GST registration number",
    )
    pan_number = Column(
        String(10),
        nullable=True,
        comment="PAN card number",
    )

    address = Column(
        Text,
        nullable=False,
        comment="Full address",
    )
    city = Column(
        String(100),
        nullable=False,
        comment="City name",
    )
    state = Column(
        String(100),
        nullable=False,
        comment="State name",
    )
    pincode = Column(
        String(6),
        nullable=False,
        comment="6-digit pincode",
    )

    role_id = Column(
        BigInteger,
        ForeignKey("roles.id", ondelete="RESTRICT"),
        nullable=False,
        comment="FK → roles.id — the role of this admin",
    )

    is_email_verified = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        comment="Whether the email has been verified",
    )
    is_phone_verified = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        comment="Whether the phone has been verified",
    )

    status = Column(
        Enum(AdminStatus, name="admin_status_enum", create_constraint=True),
        nullable=False,
        default=AdminStatus.ACTIVE,
        server_default="ACTIVE",
        comment="Account status: ACTIVE, INACTIVE, or SUSPENDED",
    )

    last_login_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Updated on every successful login",
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Row creation timestamp",
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
        comment="Row last-update timestamp",
    )
    deleted_at = Column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        comment="Soft-delete timestamp — NULL means active",
    )

    # ── Relationships ──────────────────────────────────────────
    stores = relationship(
        "Store",
        back_populates="admin",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    refresh_tokens = relationship(
        "RefreshToken",
        back_populates="admin",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    role = relationship(
        "Role",
        lazy="selectin",
    )

    # ── Inventory-module relationships ─────────────────────────
    categories = relationship(
        "Category",
        back_populates="admin",
        cascade="all, delete-orphan",
        lazy="noload",
    )
    brands = relationship(
        "Brand",
        back_populates="admin",
        cascade="all, delete-orphan",
        lazy="noload",
    )
    labs = relationship(
        "Lab",
        back_populates="admin",
        cascade="all, delete-orphan",
        lazy="noload",
    )
    products = relationship(
        "Product",
        back_populates="admin",
        cascade="all, delete-orphan",
        lazy="noload",
    )

    # ── Supplier & Sales module relationships ──────────────────
    suppliers = relationship(
        "Supplier",
        back_populates="admin",
        cascade="all, delete-orphan",
        lazy="noload",
    )
    customers = relationship(
        "Customer",
        back_populates="admin",
        cascade="all, delete-orphan",
        lazy="noload",
    )
    sales = relationship(
        "Sale",
        back_populates="admin",
        cascade="all, delete-orphan",
        lazy="noload",
    )
    purchase_orders = relationship(
        "PurchaseOrder",
        back_populates="admin",
        cascade="all, delete-orphan",
        lazy="noload",
    )
    expense_categories = relationship(
        "ExpenseCategory",
        back_populates="admin",
        cascade="all, delete-orphan",
        lazy="noload",
    )
    expenses = relationship(
        "Expense",
        back_populates="admin",
        cascade="all, delete-orphan",
        lazy="noload",
    )
    repairs = relationship(
        "Repair",
        back_populates="admin",
        cascade="all, delete-orphan",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return (
            f"<Admin(id={self.id!r}, email={self.email!r}, "
            f"business={self.business_name!r})>"
        )
