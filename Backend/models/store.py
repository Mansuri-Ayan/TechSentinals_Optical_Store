# Model: store.py
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class Store(Base):
    __tablename__ = "stores"

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
        comment="FK → admins.id — owner of this store",
    )

    store_name = Column(
        String(255),
        nullable=False,
        comment="Display name of the store",
    )
    store_code = Column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
        comment="Unique store identifier code",
    )

    email = Column(
        String(255),
        nullable=True,
        comment="Store contact email",
    )
    phone = Column(
        String(10),
        nullable=False,
        comment="Store contact phone (10 digits)",
    )

    address = Column(
        Text,
        nullable=False,
        comment="Full store address",
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

    gst_number = Column(
        String(15),
        nullable=True,
        comment="Store-level GST registration number",
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        comment="Whether the store is currently active",
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
        back_populates="stores",
    )
    workers = relationship(
        "Worker",
        back_populates="store",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    opticians = relationship(
        "Optician",
        back_populates="store",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    managers = relationship(
        "Manager",
        back_populates="store",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    # ── Inventory-module relationships ─────────────────────────
    # owner_id is polymorphic (not a real FK to stores), so we
    # use a manual primaryjoin to tell SQLAlchemy how to resolve it.
    inventories = relationship(
        "Inventory",
        primaryjoin=(
            "and_(foreign(Inventory.owner_id) == Store.id, "
            "Inventory.owner_type == 'STORE')"
        ),
        viewonly=True,
        lazy="noload",
    )

    # ── Supplier & Sales module relationships ──────────────────
    supplier_links = relationship(
        "SupplierStoreLink",
        back_populates="store",
        cascade="all, delete-orphan",
        lazy="noload",
    )
    purchase_orders = relationship(
        "PurchaseOrder",
        back_populates="store",
        lazy="noload",
    )
    sales = relationship(
        "Sale",
        back_populates="store",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return (
            f"<Store(id={self.id!r}, store_name={self.store_name!r}, "
            f"store_code={self.store_code!r})>"
        )
