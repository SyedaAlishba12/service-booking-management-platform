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
import models.availability  # noqa: F401
import models.provider  # noqa: F401
import models.service  # noqa: F401

for _name in ("users", "categories"):
    if _name not in Base.metadata.tables:
        Table(_name, Base.metadata, Column("id", UUID(as_uuid=True), primary_key=True))


@pytest_asyncio.fixture
async def session():
    engine = create_async_engine("sqlite+aiosqlite://")

    @event.listens_for(engine.sync_engine, "connect")
    def _fk_on(dbapi_conn, _):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        # one user per role-ish need, and a category
        users = Base.metadata.tables["users"]
        cats = Base.metadata.tables["categories"]
        s.user_ids = [uuid.uuid4() for _ in range(3)]
        s.category_ids = [uuid.uuid4() for _ in range(2)]
        for uid in s.user_ids:
            await s.execute(users.insert().values(id=uid))
        for cid in s.category_ids:
            await s.execute(cats.insert().values(id=cid))
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
