# Model: bill.py
from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base

class Bill(Base):
    __tablename__ = "bills"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key"
    )

    sale_id = Column(
        BigInteger,
        ForeignKey("sales.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
        comment="FK -> sales.id"
    )

    bill_number = Column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
        comment="Unique invoice/bill number"
    )

    html_content = Column(
        Text,
        nullable=False,
        comment="Generated HTML content of the bill"
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Row creation timestamp"
    )

    # Relationship back to Sale
    sale = relationship("Sale", back_populates="bill", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Bill(id={self.id!r}, bill_number={self.bill_number!r}, sale_id={self.sale_id!r})>"
