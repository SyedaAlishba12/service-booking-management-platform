"""HTTP-level standalone checks for the admin provider status endpoint."""

import asyncio
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from common.security import create_access_token
from database.base import Base
from database.session import get_db
from main import app
from models.category import Category
from models.provider import Provider, ProviderStatus
from models.service import Service, ServiceType
from models.user import User, UserRole


ENGINE = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    echo=False,
    connect_args={"check_same_thread": False},
)
SessionFactory = async_sessionmaker(
    bind=ENGINE, class_=AsyncSession, expire_on_commit=False
)


async def override_get_db():
    async with SessionFactory() as db:
        yield db


app.dependency_overrides[get_db] = override_get_db

passed = 0
total = 0
failed = 0


def check(condition: bool, message: str) -> None:
    global failed, passed, total
    total += 1
    if not condition:
        print(f"  FAIL  {message}")
        failed += 1
        return
    print(f"  PASS  {message}")
    passed += 1


async def asgi_request(
    method: str,
    path: str,
    headers: dict[str, str] | None = None,
    body: dict | None = None,
) -> tuple[int, dict]:
    headers = headers or {}
    body_bytes = json.dumps(body).encode("utf-8") if body is not None else b""
    request_sent = False
    response_body: list[bytes] = []
    status_code = 500

    async def receive():
        nonlocal request_sent
        if request_sent:
            return {"type": "http.disconnect"}
        request_sent = True
        return {
            "type": "http.request",
            "body": body_bytes,
            "more_body": False,
        }

    async def send(message):
        nonlocal status_code
        if message["type"] == "http.response.start":
            status_code = message["status"]
        elif message["type"] == "http.response.body":
            response_body.append(message.get("body", b""))

    raw_headers = [
        (key.lower().encode("latin1"), value.encode("latin1"))
        for key, value in headers.items()
    ]
    if body is not None:
        raw_headers.append((b"content-type", b"application/json"))

    scope = {
        "type": "http",
        "http_version": "1.1",
        "method": method,
        "path": path.split("?", 1)[0],
        "raw_path": path.encode(),
        "query_string": (
            path.split("?", 1)[1].encode() if "?" in path else b""
        ),
        "headers": raw_headers,
        "scheme": "http",
        "server": ("testserver", 80),
        "client": ("testclient", 123),
        "root_path": "",
    }
    await app(scope, receive, send)
    raw = b"".join(response_body)
    return status_code, json.loads(raw) if raw else {}


async def main() -> None:
    async with ENGINE.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    now = datetime.now(timezone.utc).replace(microsecond=0)
    admin = User(
        id=uuid.uuid4(),
        full_name="Admin",
        email="admin@example.com",
        password_hash="x",
        role=UserRole.ADMIN,
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    customer = User(
        id=uuid.uuid4(),
        full_name="Customer",
        email="customer@example.com",
        password_hash="x",
        role=UserRole.CUSTOMER,
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    provider_user = User(
        id=uuid.uuid4(),
        full_name="Provider",
        email="provider@example.com",
        password_hash="x",
        role=UserRole.PROVIDER,
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    provider = Provider(
        id=uuid.uuid4(),
        user_id=provider_user.id,
        business_name="Pending Provider",
        location="Remote",
        timezone="UTC",
        slot_interval_minutes=30,
        status=ProviderStatus.PENDING,
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    category = Category(
        id=uuid.uuid4(),
        name="Test Category",
        slug="test-category",
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    service = Service(
        id=uuid.uuid4(),
        provider_id=provider.id,
        category_id=category.id,
        name="Test Service",
        price=Decimal("25.00"),
        duration_minutes=60,
        service_type=ServiceType.ONLINE,
        is_active=True,
        created_at=now,
        updated_at=now,
    )

    async with SessionFactory() as db:
        db.add_all([admin, customer, provider_user, provider, category, service])
        await db.commit()

    admin_headers = {
        "Authorization": f"Bearer {create_access_token(str(admin.id), role=UserRole.ADMIN.value)}"
    }
    customer_headers = {
        "Authorization": f"Bearer {create_access_token(str(customer.id), role=UserRole.CUSTOMER.value)}"
    }
    provider_headers = {
        "Authorization": f"Bearer {create_access_token(str(provider_user.id), role=UserRole.PROVIDER.value)}"
    }
    path = f"/api/admin/providers/{provider.id}/status"

    status_code, body = await asgi_request(
        "PUT",
        path,
        admin_headers,
        {"status": "APPROVED", "is_active": True},
    )
    check(status_code == 200, "ADMIN approval returns 200")
    check(body.get("success") is True, "ADMIN approval response has success=true")
    check(
        body.get("data", {}).get("status") == "APPROVED"
        and body.get("data", {}).get("is_active") is True,
        "ADMIN approval response has approved status and active provider",
    )

    status_code, body = await asgi_request(
        "GET", "/api/admin/providers?status=APPROVED", admin_headers
    )
    items = (body.get("data") or {}).get("items", [])
    check(status_code == 200, "admin provider list returns 200")
    check(
        any(item["id"] == str(provider.id) and item["status"] == "APPROVED" for item in items),
        "approved provider is visible in admin provider list",
    )

    status_code, body = await asgi_request(
        "GET", "/api/admin/services", admin_headers
    )
    services_data = body.get("data")
    check(
        status_code == 200
        and services_data is not None
        and "items" in services_data
        and "meta" in services_data,
        "admin services list has non-null data with items and meta",
    )

    status_code, _ = await asgi_request("PUT", path, body={"status": "SUSPENDED"})
    check(status_code == 401, "no token on status update returns 401")

    status_code, _ = await asgi_request(
        "PUT", path, customer_headers, {"status": "SUSPENDED"}
    )
    check(status_code == 403, "customer token on status update returns 403")

    status_code, _ = await asgi_request(
        "PUT", path, provider_headers, {"status": "SUSPENDED"}
    )
    check(status_code == 403, "provider token on status update returns 403")

    status_code, body = await asgi_request(
        "PUT", path, admin_headers, {"status": "INVALID"}
    )
    check(status_code == 422, "invalid provider status returns 422")
    check(body.get("success") is False, "invalid provider status has success=false")

    status_code, body = await asgi_request(
        "PUT",
        f"/api/admin/providers/{uuid.uuid4()}/status",
        admin_headers,
        {"status": "APPROVED"},
    )
    check(status_code == 404, "unknown provider id returns 404")
    check(body.get("success") is False, "unknown provider has success=false")

    print(f"\nAdmin provider status checks: {passed}/{total} passed, {failed} failed")


if __name__ == "__main__":
    asyncio.run(main())
    if failed:
        raise SystemExit(1)
