# Alembic env.py — reads DB URL from .env via core.config
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── Load DB URL from .env (not hardcoded in alembic.ini) ──────
from core.config import get_settings

settings = get_settings()

# Alembic uses synchronous connections, so convert asyncpg → psycopg2
sync_url = settings.DATABASE_URL.replace("+asyncpg", "")
config.set_main_option("sqlalchemy.url", sync_url)

# ── Import all models so Alembic sees them for autogenerate ───
from db.session import Base
from models.admin import Admin
from models.store import Store
from models.worker import Worker
from models.optician import Optician
from models.manager import Manager
from models.refresh_token import RefreshToken
from models.brand import Brand
from models.category import Category
from models.subcategory import Subcategory
from models.product import Product
from models.frame_product import FrameProduct
from models.lens_product import LensProduct
from models.accessory_product import AccessoryProduct
from models.inventory import Inventory
from models.inventory_transaction import InventoryTransaction

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
