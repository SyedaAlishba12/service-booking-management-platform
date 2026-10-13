"""Admin provider approval routes."""
import uuid

import httpx
import pytest
import pytest_asyncio
from fastapi import FastAPI

from database.base import Base
from tests.conftest import auth, fake_row

PROVIDER_BODY = {
    "business_name": "Glow Salon",
    "location": "Clifton, Karachi",
    "city": "Karachi",
    "timezone": "Asia/Karachi",
}


@pytest_asyncio.fixture
async def admin_client(session):
    from common.error_handlers import register_error_handlers
    from database.session import get_db
    from routes import admin_provider_routes, provider_routes

    users = Base.metadata.tables["users"]
    session.admin_id = uuid.uuid4()
    await session.execute(
        users.insert().values(**fake_row(users, id=session.admin_id, role="ADMIN"))
    )
    await session.commit()

    app = FastAPI()
    register_error_handlers(app)
    app.include_router(provider_routes.router)
    app.include_router(admin_provider_routes.router)

    async def _db():
        yield session

    app.dependency_overrides[get_db] = _db
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_admin_can_approve_and_provider_becomes_public(admin_client, session):
    created = (
        await admin_client.post(
            "/api/providers", json=PROVIDER_BODY, headers=auth(session.user_ids[0])
        )
    ).json()["data"]
    pid = created["id"]
    assert created["status"] == "PENDING"
    assert (await admin_client.get(f"/api/providers/{pid}")).status_code == 404

    admin = auth(session.admin_id)
    listing = await admin_client.get("/api/admin/providers?status=PENDING", headers=admin)
    assert listing.status_code == 200
    assert listing.json()["data"]["meta"]["total"] == 1

    r = await admin_client.put(
        f"/api/admin/providers/{pid}/status", json={"status": "APPROVED"}, headers=admin
    )
    assert r.status_code == 200 and r.json()["data"]["status"] == "APPROVED"
    assert (await admin_client.get(f"/api/providers/{pid}")).status_code == 200

    r = await admin_client.put(
        f"/api/admin/providers/{pid}/status", json={"is_active": False}, headers=admin
    )
    assert r.json()["data"]["is_active"] is False
    assert (await admin_client.get(f"/api/providers/{pid}")).status_code == 404

    one = await admin_client.get(f"/api/admin/providers/{pid}", headers=admin)
    assert one.json()["data"]["id"] == pid


@pytest.mark.asyncio
async def test_admin_routes_are_admin_only_and_validated(admin_client, session):
    pid = str(uuid.uuid4())
    body = {"status": "APPROVED"}
    # no token
    r = await admin_client.put(f"/api/admin/providers/{pid}/status", json=body)
    assert r.status_code in (401, 403)
    # provider and customer are not admins
    for idx in (0, 2):
        r = await admin_client.put(
            f"/api/admin/providers/{pid}/status", json=body, headers=auth(session.user_ids[idx])
        )
        assert r.status_code == 403
    assert (await admin_client.get("/api/admin/providers", headers=auth(session.user_ids[0]))).status_code == 403

    admin = auth(session.admin_id)
    # empty body and unknown provider
    r = await admin_client.put(f"/api/admin/providers/{pid}/status", json={}, headers=admin)
    assert r.status_code == 422
    r = await admin_client.put(f"/api/admin/providers/{pid}/status", json=body, headers=admin)
    assert r.status_code == 404
    r = await admin_client.put(
        f"/api/admin/providers/{pid}/status", json={"status": "NOPE"}, headers=admin
    )
    assert r.status_code == 422
