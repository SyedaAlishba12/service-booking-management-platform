"""Test setup. Uses an in-memory SQLite database, so no PostgreSQL is needed.
Dev dependencies: pytest, pytest-asyncio, aiosqlite, httpx, tzdata.
Stand-in `users` / `categories` tables are created only if the real models are not loaded yet.
"""
import os
import uuid

# Route tests import database.session, which builds an engine from these settings.
# Dummy values: no real database is ever contacted.
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://user:pass@localhost/testdb")
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ["ENVIRONMENT"] = "development"

import pytest_asyncio
from sqlalchemy import Column, Table, event
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from database.base import Base
import importlib
import pkgutil

import models

# Import EVERY model module, so string relationships such as relationship("User") resolve,
# exactly as the real app / Alembic do.
for _mod in pkgutil.iter_modules(models.__path__):
    importlib.import_module(f"models.{_mod.name}")

# Only these tables are created in SQLite (other modules may use PostgreSQL-only features).
TABLES_UNDER_TEST = (
    "users",
    "categories",
    "providers",
    "services",
    "availability",
    "availability_exceptions",
)

for _name in ("users", "categories"):
    if _name not in Base.metadata.tables:
        Table(_name, Base.metadata, Column("id", UUID(as_uuid=True), primary_key=True))


def fake_row(table, **overrides) -> dict:
    """Values for every required column of `table`, so tests do not depend on the exact
    columns of the real users / categories models."""
    import datetime as dt
    import decimal

    import sqlalchemy as sa

    row = {}
    for col in table.columns:
        if col.name in overrides:
            row[col.name] = overrides[col.name]
            continue
        if col.nullable or col.default is not None or col.server_default is not None:
            if not col.primary_key:
                continue
        if isinstance(col.type, sa.Enum):
            row[col.name] = col.type.enums[0]
            continue
        try:
            py = col.type.python_type
        except NotImplementedError:
            py = str
        if py is uuid.UUID:
            row[col.name] = uuid.uuid4()
        elif py is bool:
            row[col.name] = True
        elif py is int:
            row[col.name] = 1
        elif py is decimal.Decimal:
            row[col.name] = decimal.Decimal("1.00")
        elif py is dt.datetime:
            row[col.name] = dt.datetime.now(dt.timezone.utc)
        elif py is dt.date:
            row[col.name] = dt.date.today()
        elif py is dt.time:
            row[col.name] = dt.time(9, 0)
        else:
            length = getattr(col.type, "length", None) or 40
            row[col.name] = f"{col.name[:12]}-{uuid.uuid4().hex[:12]}"[:length]
    return row


@pytest_asyncio.fixture
async def session():
    engine = create_async_engine("sqlite+aiosqlite://")

    @event.listens_for(engine.sync_engine, "connect")
    def _fk_on(dbapi_conn, _):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()

    tables = [Base.metadata.tables[name] for name in TABLES_UNDER_TEST]
    async with engine.begin() as conn:
        await conn.run_sync(lambda c: Base.metadata.create_all(c, tables=tables))
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        # one user per role-ish need, and a category
        users = Base.metadata.tables["users"]
        cats = Base.metadata.tables["categories"]
        s.user_ids = [uuid.uuid4() for _ in range(3)]
        s.category_ids = [uuid.uuid4() for _ in range(2)]
        for uid in s.user_ids:
            await s.execute(users.insert().values(**fake_row(users, id=uid)))
        for cid in s.category_ids:
            await s.execute(cats.insert().values(**fake_row(cats, id=cid)))
        await s.commit()
        yield s
    await engine.dispose()


@pytest_asyncio.fixture
async def client(session):
    """HTTP client for the real routers, wired to the SQLite test session."""
    import httpx
    from fastapi import FastAPI

    from common.error_handlers import register_error_handlers
    from database.session import get_db
    from routes import availability_routes, provider_routes, service_routes

    app = FastAPI()
    register_error_handlers(app)
    for module in (provider_routes, service_routes, availability_routes):
        app.include_router(module.router)

    async def _db():
        yield session

    app.dependency_overrides[get_db] = _db
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


def auth(user_id, role="PROVIDER"):
    return {"X-Debug-User-Id": str(user_id), "X-Debug-Role": role}
