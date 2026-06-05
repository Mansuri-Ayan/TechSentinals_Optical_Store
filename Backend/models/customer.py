# Model: customer.py
"""
Customer — a person who buys from a store.
Customers are scoped to an Admin's business and mapped to a specific Store.
Prescription data is stored in a separate `prescriptions` table.
"""
import enum
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class CustomerGender(str, enum.Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"
    NOT_SPECIFIED = "NOT_SPECIFIED"


class Customer(Base):
    __tablename__ = "customers"

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
        comment="FK → admins.id — the business this customer belongs to",
    )

    store_id = Column(
        BigInteger,
        ForeignKey("stores.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → stores.id — the store this customer is mapped to",
    )

    # The store where the customer first registered / was created
    first_visit_store_id = Column(
        BigInteger,
        ForeignKey("stores.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → stores.id — store where customer was first registered",
    )

    first_name = Column(
        String(100),
        nullable=False,
        comment="Customer first name",
    )

    last_name = Column(
        String(100),
        nullable=True,
        comment="Customer last name",
    )

    email = Column(
        String(255),
        nullable=True,
        index=True,
        comment="Customer email (optional)",
    )

    phone = Column(
        String(10),
        nullable=False,
        index=True,
        comment="Customer phone — primary identifier",
    )

    date_of_birth = Column(
        Date,
        nullable=True,
        comment="Date of birth — used for birthday campaigns",
    )

    gender = Column(
        Enum(CustomerGender, name="customer_gender_enum", create_constraint=True),
        nullable=False,
        default=CustomerGender.NOT_SPECIFIED,
        server_default="NOT_SPECIFIED",
        comment="Customer gender",
    )

    address = Column(
        Text,
        nullable=True,
        comment="Customer address",
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
        comment="Pincode",
    )

    remark = Column(
        Text,
        nullable=True,
        comment="Internal CRM remark / notes about this customer",
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        comment="Whether customer record is active",
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
        comment="Soft-delete timestamp",
    )

    # ── Relationships ──────────────────────────────────────────
    admin = relationship(
        "Admin",
        back_populates="customers",
        lazy="selectin",
    )
    store = relationship(
        "Store",
        foreign_keys=[store_id],
        back_populates="customers",
        lazy="selectin",
    )
    first_visit_store = relationship(
        "Store",
        foreign_keys=[first_visit_store_id],
        lazy="selectin",
    )
    sales = relationship(
        "Sale",
        back_populates="customer",
        lazy="noload",
    )
    prescriptions = relationship(
        "Prescription",
        back_populates="customer",
        cascade="all, delete-orphan",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return (
            f"<Customer(id={self.id!r}, name={self.first_name!r} "
            f"{self.last_name!r}, phone={self.phone!r})>"
        )
