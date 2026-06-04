# Model: supplier.py
"""
Supplier — a vendor/distributor that supplies products to an Admin's business.
An Admin can have many Suppliers. Each Supplier can be linked to one or more
Stores via supplier_store_links (a Store may have its own direct suppliers).
"""
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


class SupplierStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    BLACKLISTED = "BLACKLISTED"


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    admin_id = Column(
        BigInteger,
        ForeignKey("admins.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → admins.id — the business that owns this supplier record",
    )

    company_name = Column(
        String(255),
        nullable=False,
        comment="Supplier's company / business name",
    )

    contact_person = Column(
        String(200),
        nullable=True,
        comment="Primary contact person at the supplier",
    )

    email = Column(
        String(255),
        nullable=True,
        comment="Supplier contact email",
    )

    phone = Column(
        String(10),
        nullable=True,
        comment="Supplier primary phone (10 digits)",
    )

    alternate_phone = Column(
        String(10),
        nullable=True,
        comment="Alternate phone number",
    )

    address = Column(
        Text,
        nullable=True,
        comment="Supplier address",
    )

    city = Column(
        String(100),
        nullable=True,
        comment="City",
    )

    state = Column(
        String(100),
        nullable=True,
        comment="State",
    )

    pincode = Column(
        String(6),
        nullable=True,
        comment="6-digit pincode",
    )

    gst_number = Column(
        String(15),
        nullable=True,
        comment="Supplier GST registration number",
    )

    pan_number = Column(
        String(10),
        nullable=True,
        comment="Supplier PAN number",
    )

    bank_account_number = Column(
        String(20),
        nullable=True,
        comment="Bank account number for payment transfers",
    )

    bank_ifsc = Column(
        String(11),
        nullable=True,
        comment="IFSC code of supplier's bank branch",
    )

    bank_name = Column(
        String(100),
        nullable=True,
        comment="Bank name",
    )

    credit_days = Column(
        BigInteger,
        nullable=False,
        default=0,
        server_default="0",
        comment="Default credit period (days) agreed with this supplier",
    )

    status = Column(
        Enum(SupplierStatus, name="supplier_status_enum", create_constraint=True),
        nullable=False,
        default=SupplierStatus.ACTIVE,
        server_default="ACTIVE",
        comment="Supplier status: ACTIVE, INACTIVE, or BLACKLISTED",
    )

    notes = Column(
        Text,
        nullable=True,
        comment="Internal notes about this supplier",
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
    admin = relationship(
        "Admin",
        back_populates="suppliers",
        lazy="selectin",
    )
    store_links = relationship(
        "SupplierStoreLink",
        back_populates="supplier",
        cascade="all, delete-orphan",
        lazy="noload",
    )
    purchase_orders = relationship(
        "PurchaseOrder",
        back_populates="supplier",
        cascade="all, delete-orphan",
        lazy="noload",
    )
    supplier_products = relationship(
        "SupplierProduct",
        back_populates="supplier",
        cascade="all, delete-orphan",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return (
            f"<Supplier(id={self.id!r}, company={self.company_name!r}, "
            f"status={self.status!r})>"
        )
