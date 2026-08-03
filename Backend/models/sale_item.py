# Model: sale_item.py
"""
SaleItem — individual product lines within a Sale.
Each SaleItem triggers an InventoryTransaction (SALE) via the service layer,
decrementing the store's inventory for that product.
"""
from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    Text,
    JSON,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    sale_id = Column(    
        BigInteger,
        ForeignKey("sales.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → sales.id",
    )

    product_id = Column(
        BigInteger,
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False, 
        index=True,
        comment="FK → products.id — product sold (live catalogue reference)",
    )

    product_snapshot_id = Column(
        BigInteger,
        ForeignKey("product_snapshots.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        comment=(
            "FK → product_snapshots.id — frozen copy of the product as it was "
            "at the moment of this sale.  Use this for invoices and reports; "
            "never join products directly for price/name data."
        ),
    )

    inventory_id = Column(
        BigInteger,
        ForeignKey("inventories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → inventories.id — inventory record decremented by this sale",
    )

    deadstock_item_id = Column(
        BigInteger,
        ForeignKey("deadstock_items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → deadstock_items.id — deadstock item consumed by this sale",
    )
    
    quantity = Column(
        Integer,
        nullable=False,
        comment="Number of units sold",
    )

    unit_price = Column(
        Numeric(10, 2),
        nullable=False,
        comment="Selling price per unit at time of sale",
    )

    unit_cost = Column(
        Numeric(10, 2),
        nullable=True,
        comment="Cost price per unit at time of sale (for margin reporting)",
    )

    total_purchase_cost = Column(
        Numeric(12, 2),
        nullable=True,
        comment="Total purchase cost of the batches consumed by this line item",
    )

    consumed_batches = Column(
        JSON,
        nullable=True,
        comment="JSON metadata of consumed batches: [{'inventory_id': int, 'quantity': int, 'purchase_cost': float}]",
    )

    discount_percent = Column(
        Numeric(5, 2),
        nullable=False,
        default=0,
        server_default="0",
        comment="Discount percentage on this line item",
    )

    tax_percent = Column(
        Numeric(5, 2),
        nullable=False,
        default=0,
        server_default="0",
        comment="GST / tax percentage on this line item",
    )

    line_total = Column(
        Numeric(12, 2),
        nullable=False,
        comment="(unit_price × qty × (1 - discount/100)) + tax",
    )

    notes = Column(
        Text,
        nullable=True,
        comment="Optional notes for this line item (e.g. custom lens specs)",
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
    sale = relationship(
        "Sale",
        back_populates="items",
    )
    product = relationship(  # Live product fallback — prefer product_snapshot for historical accuracy
        "Product",
        lazy="selectin",
    )
    product_snapshot = relationship(
        "ProductSnapshot",
        lazy="selectin",
        foreign_keys="[SaleItem.product_snapshot_id]",
    )
    inventory = relationship(
        "Inventory",
        lazy="selectin",
    )
    deadstock_item = relationship(
        "DeadstockItem",
        lazy="selectin",
        foreign_keys="[SaleItem.deadstock_item_id]",
    )


    @property
    def unit_skus(self) -> list[str]:
        if "assigned_units" in self.__dict__ and self.assigned_units:
            return [u.unit_sku for u in self.assigned_units]
        return []

    def __repr__(self) -> str:
        return (
            f"<SaleItem(sale_id={self.sale_id!r}, product_id={self.product_id!r}, "
            f"qty={self.quantity!r}, total={self.line_total!r})>"
        )
