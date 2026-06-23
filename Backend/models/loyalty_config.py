from sqlalchemy import Column, BigInteger, ForeignKey, Boolean, Integer, DateTime, func
from sqlalchemy.orm import relationship
from db.session import Base


class LoyaltyConfig(Base):
    __tablename__ = "loyalty_configs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    store_id = Column(BigInteger, ForeignKey("stores.id", ondelete="CASCADE"),
                      nullable=False, unique=True)

    # Global status toggle
    is_enabled = Column(Boolean, nullable=False, default=True,
                        server_default="true")

    # Feature toggles
    category_points_enabled = Column(Boolean, nullable=False, default=True,
                                     server_default="true")
    price_points_enabled = Column(Boolean, nullable=False, default=True,
                                  server_default="true")

    # Max redemption limit
    max_redemption_percentage = Column(Integer, nullable=False, default=100,
                                       server_default="100")

    # Price-based earning rule
    price_interval = Column(Integer, nullable=False, default=200)
                            # every X rupees earns Y points
    price_points = Column(Integer, nullable=False, default=50)

    # Redemption rate
    points_per_rupee = Column(Integer, nullable=False, default=50)
                              # 50 points = ₹1

    # Redemption minimum
    min_redemption_points = Column(Integer, nullable=False, default=50)

    # Tier thresholds
    silver_max = Column(Integer, nullable=False, default=5000)
    gold_max = Column(Integer, nullable=False, default=15000)
    # Platinum = gold_max + 1 and above (no upper limit)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(),
                        onupdate=func.now())

    # Relationship
    store = relationship("Store", back_populates="loyalty_config")