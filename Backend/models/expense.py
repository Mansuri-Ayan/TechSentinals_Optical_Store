# Model: expense.py
"""
Expense — a single expense incurred by a Store (or Admin-level warehouse).
Can also be associated with a specific staff member (incurred_by_type/incurred_by_id)
to track salaries, commissions, reimbursements, or advances.
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
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class ExpenseOwnerType(str, enum.Enum):
    ADMIN = "ADMIN"    # Head-office / warehouse expense
    STORE = "STORE"    # Branch-level expense


class ExpensePaymentMethod(str, enum.Enum):
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"
    UPI = "UPI"
    CHEQUE = "CHEQUE"
    CARD = "CARD"


class ExpenseRecordedByType(str, enum.Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    WORKER = "WORKER"
    OPTICIAN = "OPTICIAN"


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    # ── Ownership (who incurred the expense) ──────────────────
    admin_id = Column(
        BigInteger,
        ForeignKey("admins.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → admins.id — owning business (multi-tenant anchor)",
    )

    owner_type = Column(
        Enum(ExpenseOwnerType, name="expense_owner_type_enum", create_constraint=True),
        nullable=False,
        comment="ADMIN = head-office expense, STORE = branch expense",
    )

    owner_id = Column(
        BigInteger,
        nullable=False,
        index=True,
        comment=(
            "Polymorphic FK — admins.id when owner_type=ADMIN, "
            "stores.id when owner_type=STORE"
        ),
    )

    # ── Classification ────────────────────────────────────────
    category_id = Column(
        BigInteger,
        ForeignKey("expense_categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="FK → expense_categories.id — what type of expense this is",
    )

    # ── Core fields ───────────────────────────────────────────
    title = Column(
        String(255),
        nullable=False,
        comment="Short human-readable title (e.g. 'Monthly rent — June 2025')",
    )

    description = Column(
        Text,
        nullable=True,
        comment="Detailed notes / vendor name / what was purchased",
    )

    amount = Column(
        Numeric(12, 2),
        nullable=False,
        comment="Expense amount in INR",
    )

    expense_date = Column(
        Date,
        nullable=False,
        index=True,
        comment="Date the expense was incurred (for period-based reporting)",
    )

    payment_method = Column(
        Enum(
            ExpensePaymentMethod,
            name="expense_payment_method_enum",
            create_constraint=True,
        ),
        nullable=False,
        comment="How the expense was paid",
    )

    reference_number = Column(
        String(100),
        nullable=True,
        comment="UTR / cheque number / UPI transaction ID / invoice number",
    )

    receipt_url = Column(
        Text,
        nullable=True,
        comment="URL or file path to the uploaded bill / receipt image",
    )


    # ── Approval workflow ─────────────────────────────────────
    is_approved = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
        comment="Whether this expense has been approved by an admin/manager",
    )

    approved_by = Column(
        BigInteger,
        nullable=True,
        comment=(
            "admins.id of the admin who approved this expense — "
            "NULL means pending approval"
        ),
    )

    approved_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when the expense was approved",
    )

    is_rejected = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
        comment="Whether this expense has been rejected by an admin",
    )

    rejected_by = Column(
        BigInteger,
        nullable=True,
        comment="admins.id of the admin who rejected this expense",
    )

    rejected_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when the expense was rejected",
    )

    rejection_reason = Column(
        Text,
        nullable=True,
        comment="Reason provided for rejection",
    )

    # ── Who recorded it (polymorphic) ─────────────────────────
    recorded_by_type = Column(
        Enum(
            ExpenseRecordedByType,
            name="expense_recorded_by_type_enum",
            create_constraint=True,
        ),
        nullable=False,
        comment="Role of the person who logged this expense",
    )

    recorded_by_id = Column(
        BigInteger,
        nullable=False,
        index=True,
        comment=(
            "Polymorphic FK — admins.id / managers.id / "
            "workers.id / opticians.id"
        ),
    )

    # ── Whom the expense was spent on (polymorphic, optional) ──
    incurred_by_type = Column(
        Enum(
            ExpenseRecordedByType,
            name="expense_incurred_by_type_enum",
            create_constraint=True,
        ),
        nullable=True,
        comment="Role of the staff member who incurred / received this expense",
    )

    incurred_by_id = Column(
        BigInteger,
        nullable=True,
        index=True,
        comment=(
            "Polymorphic FK — admins.id / managers.id / "
            "workers.id / opticians.id of the staff member"
        ),
    )

    # ── Audit timestamps ──────────────────────────────────────
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
        back_populates="expenses",
        lazy="selectin",
    )
    category = relationship(
        "ExpenseCategory",
        back_populates="expenses",
        lazy="selectin",
    )

    # owner_id is polymorphic so we cannot place a real FK on the column.
    # Use a viewonly relationship with an explicit primaryjoin for store-level
    # access — mirrors the same pattern used in Inventory / inventories.
    store = relationship(
        "Store",
        primaryjoin=(
            "and_(foreign(Expense.owner_id) == Store.id, "
            "Expense.owner_type == 'STORE')"
        ),
        viewonly=True,
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<Expense(id={self.id!r}, title={self.title!r}, "
            f"amount={self.amount!r}, date={self.expense_date!r}, "
            f"approved={self.is_approved!r})>"
        )
