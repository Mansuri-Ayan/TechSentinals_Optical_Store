# Model: sale.py
"""
Sale — a completed sales transaction at a store.
Links: Store → Customer → Staff (sold by) → Sale Items → Sale Payments.
Staff who made the sale is recorded via sold_by_type + sold_by_id (polymorphic),
supporting Manager, Worker, and Optician roles.
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
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class SaleStatus(str, enum.Enum):
    PENDING = "PENDING"          # Order placed, not yet fulfilled
    COMPLETED = "COMPLETED"      # Fully paid and items delivered
    PARTIALLY_PAID = "PARTIALLY_PAID"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


class StaffType(str, enum.Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    WORKER = "WORKER"
    OPTICIAN = "OPTICIAN"


class Sale(Base):
    __tablename__ = "sales"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    invoice_number = Column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
        comment="Human-readable invoice number (e.g. INV-2024-00001)",
    )

    admin_id = Column(
        BigInteger,
        ForeignKey("admins.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → admins.id — owning business (for multi-tenant queries)",
    )

    store_id = Column(
        BigInteger,
        ForeignKey("stores.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="FK → stores.id — store where the sale happened",
    )

    customer_id = Column(
        BigInteger,
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → customers.id — NULL for walk-in anonymous sales",
    )

    billing_account_customer_id = Column(
        BigInteger,
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment=(
            "FK → customers.id — the billing account holder. "
            "NULL means same as customer_id (normal sale). "
            "When set, sale shows in both customers' histories."
        )
    )

    loyalty_awarded_to_customer_id = Column(
        BigInteger,
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment=(
            "FK → customers.id — who receives loyalty points. "
            "NULL means points go to customer_id (the buyer). "
        )
    )

    loyalty_redeemed_from_customer_id = Column(
        BigInteger,
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment=(
            "FK → customers.id — whose points were redeemed. "
            "NULL means no redemption or same as customer_id."
        )
    )

    loyalty_redeemed_other_customer_id = Column(
        BigInteger,
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → customers.id — the second customer (Person B) whose points were redeemed."
    )

    loyalty_points_redeemed_self = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Points redeemed from the main customer (Person A) in this sale"
    )

    loyalty_points_redeemed_other = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Points redeemed from the other customer (Person B) in this sale"
    )


    # Polymorphic staff reference (Manager / Worker / Optician)
    sold_by_type = Column(
        Enum(StaffType, name="staff_type_enum", create_constraint=True),
        nullable=False,
        comment="Type of staff member who handled the sale",
    )

    sold_by_id = Column(
        BigInteger,
        nullable=False,
        index=True,
        comment="Polymorphic FK — managers.id / workers.id / opticians.id",
    )

    sale_date = Column(
        Date,
        nullable=False,
        comment="Date the sale was made",
    )

    status = Column(
        Enum(SaleStatus, name="sale_status_enum", create_constraint=True),
        nullable=False,
        default=SaleStatus.COMPLETED,
        server_default="COMPLETED",
        comment="Sale lifecycle status",
    )

    subtotal = Column(
        Numeric(12, 2),
        nullable=False,
        default=0,
        server_default="0",
        comment="Sum of all line item totals before discount and tax",
    )

    discount_amount = Column(
        Numeric(12, 2),
        nullable=False,
        default=0,
        server_default="0",
        comment="Total discount given on this sale",
    )

    tax_amount = Column(
        Numeric(12, 2),
        nullable=False,
        default=0,
        server_default="0",
        comment="Total tax (GST) on this sale",
    )

    total_amount = Column(
        Numeric(12, 2),
        nullable=False,
        comment="subtotal - discount_amount + tax_amount",
    )

    paid_amount = Column(
        Numeric(12, 2),
        nullable=False,
        default=0,
        server_default="0",
        comment="Total amount paid by the customer so far",
    )

    due_amount = Column(
        Numeric(12, 2),
        nullable=False,
        default=0,
        server_default="0",
        comment="total_amount - paid_amount",
    )

    loyalty_points_earned = Column(
        BigInteger,
        nullable=False,
        default=0,
        server_default="0",
        comment="Loyalty points awarded on this sale",
    )

    loyalty_points_redeemed = Column(
        BigInteger,
        nullable=False,
        default=0,
        server_default="0",
        comment="Loyalty points redeemed on this sale",
    )

    notes = Column(
        Text,
        nullable=True,
        comment="Optional notes / special instructions for this sale",
    )

    prescription_id = Column(
        BigInteger,
        ForeignKey("prescriptions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → prescriptions.id — associated prescription for custom lens",
    )

    lab_id = Column(
        BigInteger,
        ForeignKey("labs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → labs.id — associated processing lab",
    )

    lab_status = Column(
        String(50),
        nullable=True,
        comment="Current stage in custom spectacles lab workflow",
    )

    lab_name = Column(
        String(100),
        nullable=True,
        comment="Name of the processing lab",
    )

    sent_to_lab_date = Column(
        Date,
        nullable=True,
        comment="Date sent to lab",
    )

    expected_delivery_date = Column(
        Date,
        nullable=True,
        comment="Expected delivery date from lab",
    )

    is_exchanged = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="FALSE",
        comment="Indicates if any items from this sale have been exchanged",
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

    # ── Relationships ──────────────────────────────────────────
    admin = relationship(
        "Admin",
        back_populates="sales",
        lazy="selectin",
    )
    store = relationship(
        "Store",
        back_populates="sales",
        lazy="selectin",
    )
    customer = relationship(
        "Customer",
        foreign_keys=[customer_id],
        back_populates="sales",
        lazy="selectin",
    )
    billing_account_customer = relationship(
        "Customer",
        foreign_keys=[billing_account_customer_id],
        lazy="selectin",
    )
    loyalty_awarded_to_customer = relationship(
        "Customer",
        foreign_keys=[loyalty_awarded_to_customer_id],
        lazy="selectin",
    )
    loyalty_redeemed_from_customer = relationship(
        "Customer",
        foreign_keys=[loyalty_redeemed_from_customer_id],
        lazy="selectin",
    )
    loyalty_redeemed_other_customer = relationship(
        "Customer",
        foreign_keys=[loyalty_redeemed_other_customer_id],
        lazy="selectin",
    )
    items = relationship(
        "SaleItem",
        back_populates="sale",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    payments = relationship(
        "SalePayment",
        back_populates="sale",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    bill = relationship(
        "Bill",
        back_populates="sale",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    repairs = relationship(
        "Repair",
        back_populates="sale",
        lazy="noload",
    )
    prescription = relationship(
        "Prescription",
        lazy="selectin",
    )
    lab = relationship(
        "Lab",
        back_populates="lab_orders",
        lazy="selectin",
    )
    exchange_record = relationship(
        "Exchange",
        primaryjoin="Sale.id == Exchange.new_sale_id",
        uselist=False,
        viewonly=True,
        lazy="selectin",
    )
    # NOTE: loyalty_transactions relationship will be added
    # when the LoyaltyTransaction model is created in a future phase.

    def __repr__(self) -> str:
        return (
            f"<Sale(id={self.id!r}, invoice={self.invoice_number!r}, "
            f"total={self.total_amount!r}, status={self.status!r})>"
        )
