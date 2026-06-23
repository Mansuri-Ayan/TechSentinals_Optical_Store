from sqlalchemy import Column, BigInteger, ForeignKey, Boolean, Integer, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship
from db.session import Base


class StoreCategoryLoyalty(Base):
    __tablename__ = "store_category_loyalty"
    __table_args__ = (UniqueConstraint("store_id", "category_id",
                      name="uq_store_category_loyalty"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    store_id = Column(BigInteger, ForeignKey("stores.id", ondelete="CASCADE"),
                      nullable=False)
    category_id = Column(BigInteger, ForeignKey("categories.id",
                         ondelete="CASCADE"), nullable=False)
    points_per_unit = Column(Integer, nullable=False, default=50)
                             # points earned per product unit purchased
    is_enabled = Column(Boolean, nullable=False, default=True,
                        server_default="true")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(),
                        onupdate=func.now())

    store = relationship("Store", back_populates="category_loyalties")
    category = relationship("Category", lazy="selectin")