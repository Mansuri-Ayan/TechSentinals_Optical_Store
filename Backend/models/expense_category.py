# Model: expense_category.py
"""
ExpenseCategory — admin-defined labels for classifying store expenses.
Examples: Rent, Electricity, Staff Refreshments, Equipment Repair,
          Marketing, Stationery, Courier, Miscellaneous.

Scoped to an Admin so each business can maintain their own category list.
Linked back from Expense rows; deleting a category is RESTRICTED if any
expense is already using it (ondelete="RESTRICT" on the FK in Expense).
"""
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


class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

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
        comment="FK → admins.id — the business that owns this category",
    )

    name = Column(
        String(150),
        nullable=False,
        comment="Category display name (e.g. Rent, Electricity, Courier)",
    )

    description = Column(
        Text,
        nullable=True,
        comment="Optional description of what this category covers",
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        comment="Soft-disable without deleting — hides from new expense forms",
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
        back_populates="expense_categories",
    )
    expenses = relationship(
        "Expense",
        back_populates="category",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return (
            f"<ExpenseCategory(id={self.id!r}, name={self.name!r}, "
            f"admin_id={self.admin_id!r})>"
        )
