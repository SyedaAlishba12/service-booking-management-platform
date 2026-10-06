"""HTTP-level tests: routes + controllers + services, using the standard response envelope."""
import uuid

import pytest

from models.provider import ProviderStatus
from services import provider_service as ps
from tests.conftest import auth

PROVIDER_BODY = {
    "business_name": "Glow Salon",
    "location": "Clifton, Karachi",
    "city": "Karachi",
    "timezone": "Asia/Karachi",
}


def service_body(session, **kw):
    body = {
        "category_id": str(session.category_ids[0]),
        "name": "Haircut",
        "price": "1500.00",
        "duration_minutes": 45,
        "service_type": "AT_PROVIDER",
    }
    body.update(kw)
    return body


async def make_provider(client, session, idx=0):
    r = await client.post("/api/providers", json=PROVIDER_BODY, headers=auth(session.user_ids[idx]))
    assert r.status_code == 201, r.text
    return r.json()["data"]


async def approve(session, provider_id):
    await ps.set_provider_status(session, provider_id, ProviderStatus.APPROVED)


@pytest.mark.asyncio
async def test_auth_and_role_checks(client, session):
    r = await client.post("/api/providers", json=PROVIDER_BODY)
    assert r.status_code == 401
    assert r.json() == {"success": False, "message": "Authentication required", "data": None}

    r = await client.post(
        "/api/providers", json=PROVIDER_BODY, headers=auth(session.user_ids[0], "CUSTOMER")
    )
    assert r.status_code == 403
    assert r.json()["success"] is False


@pytest.mark.asyncio
async def test_provider_profile_flow(client, session):
    created = await make_provider(client, session)
    assert created["status"] == "PENDING" and created["slot_interval_minutes"] == 30

    dup = await client.post("/api/providers", json=PROVIDER_BODY, headers=auth(session.user_ids[0]))
    assert dup.status_code == 409 and dup.json()["success"] is False

    h = auth(session.user_ids[0])
    me = await client.get("/api/providers/me", headers=h)
    assert me.json()["data"]["id"] == created["id"]

    upd = await client.put("/api/providers/me", json={"business_name": "Glow Studio"}, headers=h)
    assert upd.json()["data"]["business_name"] == "Glow Studio"

    # not approved yet: hidden from the public
    assert (await client.get(f"/api/providers/{created['id']}")).status_code == 404
    listing = (await client.get("/api/providers")).json()["data"]
    assert listing["items"] == [] and listing["meta"]["total"] == 0

    await approve(session, uuid.UUID(created["id"]))
    public = (await client.get(f"/api/providers/{created['id']}")).json()["data"]
    assert public["business_name"] == "Glow Studio"
    assert "status" not in public and "user_id" not in public  # public shape only
    listing = (await client.get("/api/providers?city=karachi")).json()["data"]
    assert listing["meta"] == {"page": 1, "page_size": 12, "total": 1, "total_pages": 1}


@pytest.mark.asyncio
async def test_validation_errors_use_envelope(client, session):
    bad = dict(PROVIDER_BODY, timezone="Mars/Phobos")
    r = await client.post("/api/providers", json=bad, headers=auth(session.user_ids[0]))
    assert r.status_code == 422
    body = r.json()
    assert body["success"] is False and "timezone" in body["message"] and body["data"]["errors"]


@pytest.mark.asyncio
async def test_static_paths_of_other_modules_are_not_swallowed(client):
    # /api/providers/featured belongs to another module; it must not be parsed as an id.
    r = await client.get("/api/providers/featured")
    assert r.status_code == 404 and r.json()["success"] is False


@pytest.mark.asyncio
async def test_service_flow(client, session):
    prov = await make_provider(client, session)
    h = auth(session.user_ids[0])
    r = await client.post("/api/services", json=service_body(session), headers=h)
    assert r.status_code == 201
    svc = r.json()["data"]

    mine = (await client.get("/api/services/me", headers=h)).json()["data"]
    assert [s["id"] for s in mine] == [svc["id"]]

    upd = await client.put(f"/api/services/{svc['id']}", json={"price": "1800.00"}, headers=h)
    assert upd.json()["data"]["price"] == "1800.00"

    # another provider cannot touch it
    await make_provider(client, session, idx=1)
    other = await client.put(
        f"/api/services/{svc['id']}", json={"name": "Hacked"}, headers=auth(session.user_ids[1])
    )
    assert other.status_code == 404

    # hidden publicly until the provider is approved
    assert (await client.get(f"/api/services/{svc['id']}")).status_code == 404
    await approve(session, uuid.UUID(prov["id"]))
    pub = (await client.get(f"/api/services/{svc['id']}")).json()["data"]
    assert pub["provider"]["business_name"] == "Glow Salon"
    search = (await client.get("/api/services?q=hair&min_price=1000&max_price=2000")).json()["data"]
    assert search["meta"]["total"] == 1
    assert (await client.get(f"/api/providers/{prov['id']}/services")).json()["data"][0]["id"] == svc["id"]

    # DELETE = soft delete; service stays in the provider's own list
    d = await client.delete(f"/api/services/{svc['id']}", headers=h)
    assert d.status_code == 200 and d.json()["data"]["is_active"] is False
    assert (await client.get("/api/services")).json()["data"]["meta"]["total"] == 0
    back = await client.put(f"/api/services/{svc['id']}/status", json={"is_active": True}, headers=h)
    assert back.json()["data"]["is_active"] is True

    bad = await client.get("/api/services?min_price=500&max_price=100")
    assert bad.status_code == 422 and "min_price" in bad.json()["message"]


@pytest.mark.asyncio
async def test_availability_flow(client, session):

    prov = await make_provider(client, session)
    h = auth(session.user_ids[0])
    work = (
        await client.post(
            "/api/providers/me/availability",
            json={"day_of_week": 0, "start_time": "09:00:00", "end_time": "17:00:00"},
            headers=h,
        )
    ).json()["data"]
    brk = await client.post(
        "/api/providers/me/availability",
        json={"day_of_week": 0, "start_time": "13:00:00", "end_time": "14:00:00", "is_break": True},
        headers=h,
    )
    assert brk.status_code == 201
    overlap = await client.post(
        "/api/providers/me/availability",
        json={"day_of_week": 0, "start_time": "16:00:00", "end_time": "18:00:00"},
        headers=h,
    )
    assert overlap.status_code == 409

    off = await client.post(
        "/api/providers/me/availability-exceptions",
        json={"exception_date": "2026-12-25", "is_day_off": True, "reason": "Holiday"},
        headers=h,
    )
    assert off.status_code == 201

    mine = (await client.get("/api/providers/me/availability", headers=h)).json()["data"]
    assert mine["timezone"] == "Asia/Karachi" and len(mine["weekly"]) == 2 and len(mine["exceptions"]) == 1

    # public read only after approval
    assert (await client.get(f"/api/providers/{prov['id']}/availability")).status_code == 404
    await approve(session, uuid.UUID(prov["id"]))
    pub = await client.get(
        f"/api/providers/{prov['id']}/availability?from_date=2026-12-01&to_date=2026-12-31"
    )
    assert pub.status_code == 200 and len(pub.json()["data"]["exceptions"]) == 1

    upd = await client.put(
        f"/api/providers/me/availability/{work['id']}", json={"end_time": "18:00:00"}, headers=h
    )
    assert upd.json()["data"]["end_time"] == "18:00:00"
    gone = await client.delete(f"/api/providers/me/availability/{work['id']}", headers=h)
    assert gone.status_code == 200 and gone.json() == {
        "success": True, "message": "Availability deleted successfully", "data": None,
    }
