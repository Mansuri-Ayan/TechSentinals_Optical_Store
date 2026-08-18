"""
Shared pytest fixtures for the backend test suite.

Runs against a dedicated `optical_db_test` database (same Postgres instance,
same credentials as dev) — never against the real dev/demo data in
`optical_db`. Tables are created fresh once per test session. Both fixtures
and test functions are pinned to the SAME session-scoped event loop (see
pytest.ini's asyncio_default_fixture_loop_scope + pytestmark below) so a
single shared engine/connection never crosses event-loop boundaries, which
is what asyncpg requires.
"""
import os
import re
import pytest
import pytest_asyncio

from dotenv import dotenv_values

_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_env = dotenv_values(os.path.join(_backend_dir, ".env"))
_dev_db_url = _env.get("DATABASE_URL", "")
TEST_DB_URL = re.sub(r"/[^/]+$", "/optical_db_test", _dev_db_url)
os.environ["DATABASE_URL"] = TEST_DB_URL
os.environ["JWT_SECRET_KEY"] = _env.get("JWT_SECRET_KEY", "test-secret-key-not-for-production")

import sys
sys.path.insert(0, _backend_dir)

from db.session import Base  # noqa: E402
from main import app  # noqa: E402
from db.session import get_db  # noqa: E402

# All tests in this suite run on one shared, session-scoped event loop.
pytestmark = pytest.mark.asyncio(loop_scope="session")

# NOTE (Windows-only, cosmetic): closing a NullPool asyncpg connection after
# a test completes can raise `AttributeError: 'NoneType' object has no
# attribute 'send'` from asyncio's ProactorEventLoop during teardown. This
# happens after the test's own assertions have already passed — it's a
# known Windows ProactorEventLoop + asyncpg teardown-ordering quirk, not a
# real test failure, and does not reproduce on Linux (CI) event loops.


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy.pool import NullPool
    from sqlalchemy import text

    # NullPool: every checkout is a brand-new physical connection, never
    # reused across different sessions/fixtures. Without this, a connection
    # handed to one session (e.g. seeded_admin's short-lived setup session)
    # can be returned to the pool and reused by a later session in a way
    # that trips asyncpg's per-task connection affinity, surfacing as a
    # misleading "attached to a different loop" RuntimeError.
    eng = create_async_engine(TEST_DB_URL, poolclass=NullPool)
    async with eng.begin() as conn:
        await conn.execute(text("DROP SCHEMA public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine):
    # NOTE: app code (services/*.py) commits internally, so this is not a
    # fully transactional/rolled-back-per-test session — committed rows do
    # persist for the rest of the test session. Tests use unique identifiers
    # (phone/email/SKU) to avoid colliding with each other.
    from sqlalchemy.ext.asyncio import async_sessionmaker

    session_maker = async_sessionmaker(bind=test_engine, expire_on_commit=False)
    async with session_maker() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session):
    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    from httpx import AsyncClient, ASGITransport

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
    app.dependency_overrides.clear()


async def _create_admin_and_store(test_engine):
    """One admin + one store, with a known password, for auth-dependent tests.

    Uses its own short-lived session (opened, used, closed here) rather than
    the shared `db_session` fixture — keeping setup writes fully isolated
    from whatever session the test's `client` fixture uses avoids a
    reproducible asyncpg "attached to a different loop" error seen when a
    session already used for direct ORM writes is then reused concurrently
    by the ASGI app's own request handling in the same test.
    """
    import uuid
    from sqlalchemy.ext.asyncio import async_sessionmaker
    from core.security import hash_password
    from models.admin import Admin
    from models.store import Store
    from models.role import Role
    from models.loyalty_config import LoyaltyConfig
    from sqlalchemy import select

    unique = uuid.uuid4().hex[:8]
    session_maker = async_sessionmaker(bind=test_engine, expire_on_commit=False)

    async with session_maker() as session:
        role_stmt = select(Role).where(Role.role == "admin")
        role = (await session.execute(role_stmt)).scalar_one_or_none()
        if role is None:
            role = Role(role="admin")
            session.add(role)
            await session.flush()

        admin = Admin(
            business_name=f"Test Optics Co {unique}",
            owner_first_name="Test",
            owner_last_name="Admin",
            email=f"test.admin.{unique}@example.test",
            phone=f"9{unique[:9]}"[:10],
            password_hash=hash_password("TestPass123!"),
            address="1 Test Street",
            city="Test City",
            state="Test State",
            pincode="123456",
            role_id=role.id,
        )
        session.add(admin)
        await session.flush()

        store = Store(
            admin_id=admin.id,
            store_name="Test Store",
            store_code=f"TST-{unique}",
            email=f"store.{unique}@example.test",
            phone=f"8{unique[:9]}"[:10],
            address="1 Test Street",
            city="Test City",
            state="Test State",
            pincode="123456",
        )
        session.add(store)
        await session.flush()

        # services.store_service.create_store() auto-provisions this for
        # every real store; replicate it here since this fixture inserts
        # directly via the ORM rather than going through that service.
        session.add(LoyaltyConfig(store_id=store.id))
        await session.commit()
        await session.refresh(admin)
        await session.refresh(store)
        admin_id, store_id, admin_email = admin.id, store.id, admin.email

    return {
        "admin_id": admin_id,
        "store_id": store_id,
        "admin_email": admin_email,
        "password": "TestPass123!",
    }


@pytest_asyncio.fixture
async def seeded_admin(test_engine):
    return await _create_admin_and_store(test_engine)


@pytest_asyncio.fixture
async def seeded_admin_2(test_engine):
    """A second, unrelated tenant — for cross-tenant isolation tests (H1)."""
    return await _create_admin_and_store(test_engine)


@pytest_asyncio.fixture
async def seeded_manager(test_engine, seeded_admin):
    """A Manager staff account under seeded_admin's store, with a known password."""
    import uuid
    from sqlalchemy.ext.asyncio import async_sessionmaker
    from core.security import hash_password
    from models.manager import Manager
    from models.role import Role
    from sqlalchemy import select

    unique = uuid.uuid4().hex[:8]
    session_maker = async_sessionmaker(bind=test_engine, expire_on_commit=False)

    async with session_maker() as session:
        role_stmt = select(Role).where(Role.role == "manager")
        role = (await session.execute(role_stmt)).scalar_one_or_none()
        if role is None:
            role = Role(role="manager")
            session.add(role)
            await session.flush()

        manager = Manager(
            store_id=seeded_admin["store_id"],
            role_id=role.id,
            first_name="Test",
            last_name="Manager",
            email=f"test.manager.{unique}@example.test",
            phone=f"7{unique[:9]}"[:10],
            password_hash=hash_password("TestPass123!"),
            employee_code=f"MGR-{unique}",
            joining_date="2026-01-01",
        )
        session.add(manager)
        await session.commit()
        await session.refresh(manager)
        manager_id, manager_email = manager.id, manager.email

    return {"manager_id": manager_id, "manager_email": manager_email, "password": "TestPass123!"}
