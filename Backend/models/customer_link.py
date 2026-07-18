# Model: customer_link.py
from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class CustomerLink(Base):
    __tablename__ = "customer_links"

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
        comment="FK → admins.id — owning business",
    )

    store_id = Column(
        BigInteger,
        ForeignKey("stores.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="FK → stores.id — store where link was created",
    )

    from_customer_id = Column(
        BigInteger,
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → customers.id — source customer",
    )

    to_customer_id = Column(
        BigInteger,
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → customers.id — target customer",
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Row creation timestamp",
    )

    __table_args__ = (
        UniqueConstraint('from_customer_id', 'to_customer_id', name='ix_customer_links_unique'),
    )

    # ── Relationships ──────────────────────────────────────────
    admin = relationship("Admin", lazy="noload")
    store = relationship("Store", lazy="noload")
    from_customer = relationship("Customer", foreign_keys=[from_customer_id], lazy="noload")
    to_customer = relationship("Customer", foreign_keys=[to_customer_id], lazy="noload")

    def __repr__(self) -> str:
        return f"<CustomerLink(from={self.from_customer_id!r}, to={self.to_customer_id!r})>"
