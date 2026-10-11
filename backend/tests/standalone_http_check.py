import asyncio
import os
import sys
import uuid

# Stub env vars BEFORE importing main
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["SECRET_KEY"] = "stubbed-secret-key"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from sqlalchemy import Column, Table
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from main import app
from database.base import Base
from database.session import get_db
from middleware.auth_stub import get_current_user_id, require_admin

# Stub tables for missing modules
for _table_name in ("users", "bookings", "providers", "services"):
    if _table_name not in Base.metadata.tables:
        Table(_table_name, Base.metadata, Column("id", PG_UUID(as_uuid=True), primary_key=True))

ENGINE = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    echo=False,
    connect_args={"check_same_thread": False},
)
SessionFactory = async_sessionmaker(bind=ENGINE, class_=AsyncSession, expire_on_commit=False)

async def override_get_db():
    async with SessionFactory() as db:
        yield db

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user_id] = lambda: uuid.uuid4()
app.dependency_overrides[require_admin] = lambda: uuid.uuid4()

client = TestClient(app)

PASS = 0
FAIL = 0

def ok(label):
    global PASS
    PASS += 1
    print(f"  PASS  {label}")

def fail(label, reason):
    global FAIL
    FAIL += 1
    print(f"  FAIL  {label}: {reason}")

def run_sync_db(coro):
    # TestClient uses its own loop, so we should use asyncio.run for DB setup outside TestClient calls
    return asyncio.run(coro)

async def _setup_db():
    async with ENGINE.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
def test_error_envelope():
    label = "Error envelope format (422)"
    # Sending missing required fields to create a review
    resp = client.post("/api/reviews", json={})
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code}"
    body = resp.json()
    assert body.get("success") is False, "Expected success=False"
    assert "message" in body, "Expected message field"
    # For validation errors, data contains the details
    assert "data" in body
    ok(label)

def test_plain_list_categories():
    label = "Plain list response (Categories)"
    resp = client.get("/api/categories")
    assert resp.status_code == 200
    body = resp.json()
    assert body.get("success") is True
    # The 'data' field should be a plain list, no pagination envelope
    assert isinstance(body.get("data"), list)
    ok(label)

def test_pagination_schema_and_behavior():
    label = "Pagination schema & beyond last page"
    # Seed a few reviews via the API
    user_id = str(uuid.uuid4())
    provider_id = str(uuid.uuid4())
    
    # We need to bypass the eligibility check for this test or mock it.
    # Actually, the review controller relies on booking_eligibility which needs a stub.
    # Let's test pagination on GET /api/admin/reviews since it doesn't check eligibility.
    # Wait, we need to create them first. Creating through repo directly is easier.
    async def seed():
        from models.review import Review
        async with SessionFactory() as db:
            for i in range(15):
                db.add(Review(
                    user_id=uuid.UUID(user_id),
                    provider_id=uuid.UUID(provider_id),
                    booking_id=uuid.uuid4(),
                    service_id=uuid.uuid4(),
                    rating=5,
                    comment=f"Review {i}"
                ))
            await db.commit()
    run_sync_db(seed())
    
    # Test page=1, page_size=10
    resp = client.get(f"/api/admin/reviews?page=1&page_size=10")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["success"] is True
    
    data = body["data"]
    assert "items" in data
    assert "meta" in data
    
    items = data["items"]
    meta = data["meta"]
    
    assert len(items) == 10
    assert meta["page"] == 1
    assert meta["page_size"] == 10
    assert meta["total"] == 15
    assert meta["total_pages"] == 2
    
    # Test page 2 (next slice)
    resp2 = client.get(f"/api/admin/reviews?page=2&page_size=10")
    data2 = resp2.json()["data"]
    assert len(data2["items"]) == 5
    assert data2["meta"]["page"] == 2
    
    # Test page beyond last
    resp3 = client.get(f"/api/admin/reviews?page=3&page_size=10")
    data3 = resp3.json()["data"]
    assert len(data3["items"]) == 0
    assert data3["meta"]["total"] == 15
    assert data3["meta"]["page"] == 3
    ok(label)

def test_page_size_cap():
    label = "page_size cap enforced (le=100)"
    resp = client.get("/api/admin/reviews?page=1&page_size=150")
    assert resp.status_code == 422
    body = resp.json()
    assert body["success"] is False
    ok(label)

def main():
    run_sync_db(_setup_db())
    tests = [
        test_error_envelope,
        test_plain_list_categories,
        test_pagination_schema_and_behavior,
        test_page_size_cap,
    ]
    for t in tests:
        try:
            t()
        except AssertionError as e:
            fail(t.__name__, str(e))
        except Exception as e:
            import traceback
            fail(t.__name__, traceback.format_exc())
            
    print(f"\n==================================================")
    print(f"HTTP Checks: {PASS} passed, {FAIL} failed")
    if FAIL > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
