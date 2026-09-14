# Model: repair_bill.py
from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base

class RepairBill(Base):
    __tablename__ = "repair_bills"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key"
    )

    repair_id = Column(
        BigInteger,
        ForeignKey("repairs.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
        comment="FK -> repairs.id"
    )

    bill_number = Column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
        comment="Unique repair invoice/bill number (e.g. REP-2026-00001)"
    )

    html_content = Column(
        Text,
        nullable=False,
        comment="Generated HTML content of the repair bill"
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Row creation timestamp"
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
        comment="Row last-update timestamp"
    )

    # Relationship back to Repair
    repair = relationship("Repair", back_populates="bill", lazy="selectin")

    def __repr__(self) -> str:
        return f"<RepairBill(id={self.id!r}, bill_number={self.bill_number!r}, repair_id={self.repair_id!r})>"
