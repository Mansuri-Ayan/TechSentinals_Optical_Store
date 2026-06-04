# Model: customer.py
"""
Customer — a person who buys from a store.
Customers are scoped to an Admin's business but can visit any of their stores.
The CRM module enriches customers with loyalty, interactions, and appointments.
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

    # Optical prescription fields — critical for an optics business
    prescription_sph_right = Column(
        String(10),
        nullable=True,
        comment="Right eye sphere power (e.g. -2.50)",
    )
    prescription_cyl_right = Column(
        String(10),
        nullable=True,
        comment="Right eye cylinder power",
    )
    prescription_axis_right = Column(
        String(10),
        nullable=True,
        comment="Right eye axis",
    )
    prescription_sph_left = Column(
        String(10),
        nullable=True,
        comment="Left eye sphere power",
    )
    prescription_cyl_left = Column(
        String(10),
        nullable=True,
        comment="Left eye cylinder power",
    )
    prescription_axis_left = Column(
        String(10),
        nullable=True,
        comment="Left eye axis",
    )
    prescription_add = Column(
        String(10),
        nullable=True,
        comment="Addition (near vision) power",
    )
    prescription_date = Column(
        Date,
        nullable=True,
        comment="Date of the prescription",
    )
    prescription_notes = Column(
        Text,
        nullable=True,
        comment="Optician notes on the prescription",
    )

    notes = Column(
        Text,
        nullable=True,
        comment="Internal CRM notes about this customer",
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
    # NOTE: loyalty, interactions, and appointments relationships
    # will be added when those models are created in a future phase.

    def __repr__(self) -> str:
        return (
            f"<Customer(id={self.id!r}, name={self.first_name!r} "
            f"{self.last_name!r}, phone={self.phone!r})>"
        )
