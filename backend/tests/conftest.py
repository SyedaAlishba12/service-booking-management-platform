"""Test setup. Uses an in-memory SQLite database, so no PostgreSQL is needed.
Dev dependencies: pytest, pytest-asyncio, aiosqlite, tzdata.
Stand-in `users` / `categories` tables are created only if the real models are not loaded yet.
"""
import uuid

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
