# Service: stock_aging_service.py
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from models.inventory import Inventory, AgingStage
from models.product import Product
from models.inventory_config import InventoryConfig
from models.product_aging_override import ProductAgingOverride
from models.notification import Notification, NotificationType
from schemas.inventory_config import InventoryConfigUpdate, ProductAgingOverrideUpsert


class AgingConfigResolved:
    def __init__(self, aging_enabled, normal_period_months, stage_1_months, stage_1_discount,
                 stage_2_months, stage_2_discount, stage_3_months, stage_3_discount):
        self.aging_enabled = aging_enabled
        self.normal_period_months = normal_period_months
        self.stage_1_months = stage_1_months
        self.stage_1_discount = Decimal(str(stage_1_discount))
        self.stage_2_months = stage_2_months
        self.stage_2_discount = Decimal(str(stage_2_discount))
        self.stage_3_months = stage_3_months
        self.stage_3_discount = Decimal(str(stage_3_discount))


async def get_effective_aging_config(db: AsyncSession, admin_id: int, product_id: int) -> AgingConfigResolved:
    """Resolve aging configuration for a specific product and admin."""
    # 1. Check Product Override
    override = await db.scalar(
        select(ProductAgingOverride).where(ProductAgingOverride.product_id == product_id)
    )

    # 2. Check Admin Config
    config = await get_inventory_config(db, admin_id)

    # Hardcoded Fallbacks
    def_enabled = True
    def_normal = 6
    def_s1_m = 3
    def_s1_d = Decimal("10.00")
    def_s2_m = 3
    def_s2_d = Decimal("20.00")
    def_s3_m = 3
    def_s3_d = Decimal("50.00")

    # Resolve values
    aging_enabled = (
        override.aging_enabled if override and override.aging_enabled is not None
        else (config.aging_enabled if config else def_enabled)
    )
    normal_period_months = (
        override.normal_period_months if override and override.normal_period_months is not None
        else (config.normal_period_months if config else def_normal)
    )
    stage_1_months = (
        override.stage_1_months if override and override.stage_1_months is not None
        else (config.stage_1_months if config else def_s1_m)
    )
    stage_1_discount = (
        override.stage_1_discount if override and override.stage_1_discount is not None
        else (config.stage_1_discount if config else def_s1_d)
    )
    stage_2_months = (
        override.stage_2_months if override and override.stage_2_months is not None
        else (config.stage_2_months if config else def_s2_m)
    )
    stage_2_discount = (
        override.stage_2_discount if override and override.stage_2_discount is not None
        else (config.stage_2_discount if config else def_s2_d)
    )
    stage_3_months = (
        override.stage_3_months if override and override.stage_3_months is not None
        else (config.stage_3_months if config else def_s3_m)
    )
    stage_3_discount = (
        override.stage_3_discount if override and override.stage_3_discount is not None
        else (config.stage_3_discount if config else def_s3_d)
    )

    return AgingConfigResolved(
        aging_enabled=aging_enabled,
        normal_period_months=normal_period_months,
        stage_1_months=stage_1_months,
        stage_1_discount=stage_1_discount,
        stage_2_months=stage_2_months,
        stage_2_discount=stage_2_discount,
        stage_3_months=stage_3_months,
        stage_3_discount=stage_3_discount,
    )


def evaluate_batch_aging_stage(config: AgingConfigResolved, purchase_date: datetime, now: datetime) -> tuple[AgingStage, Decimal]:
    """Pure logic to evaluate aging stage and discount percent."""
    if not config.aging_enabled:
        return AgingStage.NORMAL, Decimal("0.00")

    # Difference in months
    months = (now.year - purchase_date.year) * 12 + now.month - purchase_date.month
    if now.day < purchase_date.day:
        months -= 1

    if months < 0:
        months = 0

    cutoff_1 = config.normal_period_months
    cutoff_2 = cutoff_1 + config.stage_1_months
    cutoff_3 = cutoff_2 + config.stage_2_months
    cutoff_4 = cutoff_3 + config.stage_3_months

    if months <= cutoff_1:
        return AgingStage.NORMAL, Decimal("0.00")
    elif months <= cutoff_2:
        return AgingStage.STAGE_1, config.stage_1_discount
    elif months <= cutoff_3:
        return AgingStage.STAGE_2, config.stage_2_discount
    elif months <= cutoff_4:
        return AgingStage.STAGE_3, config.stage_3_discount
    else:
        return AgingStage.DEAD_STOCK, config.stage_3_discount


async def run_aging_evaluation(db: AsyncSession) -> dict:
    """Evaluate aging for all active inventory batches and generate notifications."""
    now = datetime.now(timezone.utc)
    
    # Query all active inventory batches with positive quantity
    stmt = (
        select(Inventory)
        .join(Product, Inventory.product_id == Product.id)
        .where(
            Inventory.quantity > 0,
            Inventory.is_active.is_(True)
        )
    )
    
    res = await db.execute(stmt)
    batches = res.scalars().all()
    
    evaluated = len(batches)
    stage_changes = 0
    new_dead_stock = 0
    notifications_sent = 0

    # Group transition notifications by admin_id
    # admin_id -> { "STAGE_1": count, "STAGE_2": count, "STAGE_3": count, "DEAD_STOCK": count }
    admin_alerts = {}

    for batch in batches:
        # Load admin_id from the batch's product
        admin_id = batch.product.admin_id
        
        # Resolve config
        config = await get_effective_aging_config(db, admin_id, batch.product_id)
        
        # Evaluate new stage
        new_stage, discount = evaluate_batch_aging_stage(config, batch.purchase_date, now)
        
        if batch.aging_stage != new_stage:
            old_stage = batch.aging_stage
            batch.aging_stage = new_stage
            batch.aging_discount_percent = discount
            batch.aging_stage_changed_at = now
            
            stage_changes += 1
            
            if new_stage == AgingStage.DEAD_STOCK:
                batch.is_active = False
                new_dead_stock += 1
            
            # Record change for notifications
            if admin_id not in admin_alerts:
                admin_alerts[admin_id] = {
                    AgingStage.STAGE_1: 0,
                    AgingStage.STAGE_2: 0,
                    AgingStage.STAGE_3: 0,
                    AgingStage.DEAD_STOCK: 0,
                }
            if new_stage in admin_alerts[admin_id]:
                admin_alerts[admin_id][new_stage] += 1
                
            db.add(batch)

    # Commit the batch changes
    if stage_changes > 0:
        await db.commit()

    # Create notifications for admins
    for admin_id, counts in admin_alerts.items():
        messages = []
        if counts[AgingStage.STAGE_1] > 0:
            messages.append(f"{counts[AgingStage.STAGE_1]} product batch(es) entered Stage 1 aging (10% discount applied)")
        if counts[AgingStage.STAGE_2] > 0:
            messages.append(f"{counts[AgingStage.STAGE_2]} product batch(es) moved to Stage 2 aging (20% discount)")
        if counts[AgingStage.STAGE_3] > 0:
            messages.append(f"{counts[AgingStage.STAGE_3]} product batch(es) moved to Stage 3 aging (50% discount)")
        if counts[AgingStage.DEAD_STOCK] > 0:
            messages.append(f"{counts[AgingStage.DEAD_STOCK]} product batch(es) marked as Dead Stock and deactivated")
            
        if messages:
            title = "Stock Aging Status Update"
            message_body = "Stock aging evaluation completed:\n- " + "\n- ".join(messages)
            
            # Create a notification record
            notif = Notification(
                recipient_user_id=admin_id,
                recipient_store_id=None,
                type=NotificationType.STOCK_AGING_ALERT,
                title=title,
                message=message_body,
            )
            db.add(notif)
            notifications_sent += 1
            
    if notifications_sent > 0:
        await db.commit()

    return {
        "evaluated": evaluated,
        "stage_changes": stage_changes,
        "new_dead_stock": new_dead_stock,
        "notifications_sent": notifications_sent,
    }


async def get_inventory_config(db: AsyncSession, admin_id: int) -> InventoryConfig:
    """Retrieve the inventory config for an admin, creating defaults if not found."""
    config = await db.scalar(
        select(InventoryConfig).where(InventoryConfig.admin_id == admin_id)
    )
    if not config:
        config = InventoryConfig(admin_id=admin_id)
        db.add(config)
        await db.commit()
        await db.refresh(config)
    return config


async def update_inventory_config(db: AsyncSession, admin_id: int, payload: InventoryConfigUpdate) -> InventoryConfig:
    """Update inventory configuration for an admin."""
    config = await get_inventory_config(db, admin_id)
    
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)
        
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config


async def get_product_aging_override(db: AsyncSession, product_id: int) -> ProductAgingOverride | None:
    """Get the aging override for a specific product."""
    return await db.scalar(
        select(ProductAgingOverride).where(ProductAgingOverride.product_id == product_id)
    )


async def upsert_product_aging_override(
    db: AsyncSession, product_id: int, admin_id: int, payload: ProductAgingOverrideUpsert
) -> ProductAgingOverride:
    """Create or update aging override for a product."""
    override = await get_product_aging_override(db, product_id)
    
    update_data = payload.model_dump(exclude_unset=True)
    if not override:
        override = ProductAgingOverride(
            product_id=product_id,
            admin_id=admin_id,
            **update_data
        )
    else:
        for field, value in update_data.items():
            setattr(override, field, value)
            
    db.add(override)
    await db.commit()
    await db.refresh(override)
    return override


async def delete_product_aging_override(db: AsyncSession, product_id: int) -> bool:
    """Reset product aging override to use admin defaults."""
    override = await get_product_aging_override(db, product_id)
    if override:
        await db.delete(override)
        await db.commit()
        return True
    return False


async def get_aging_summary(db: AsyncSession, admin_id: int) -> dict:
    """Count active batches per aging stage for the admin."""
    stmt = (
        select(Inventory.aging_stage, func.count(Inventory.id))
        .join(Product, Inventory.product_id == Product.id)
        .where(
            Product.admin_id == admin_id,
            Inventory.quantity > 0,
            Inventory.is_active.is_(True)
        )
        .group_by(Inventory.aging_stage)
    )
    
    res = await db.execute(stmt)
    rows = res.all()
    
    summary = {
        "NORMAL": 0,
        "STAGE_1": 0,
        "STAGE_2": 0,
        "STAGE_3": 0,
        "DEAD_STOCK": 0,
    }
    for row in rows:
        stage, count = row
        if stage in summary:
            summary[stage] = count
            
    return summary
