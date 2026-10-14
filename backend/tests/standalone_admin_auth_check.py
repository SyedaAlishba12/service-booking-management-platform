"""Standalone async test for real Admin and User authentication guard.

Tests real JWT access tokens generated via common.security against an in-memory
SQLite database across all admin routers, public routers, and user-level endpoints.

Test coverage:
  - Missing token -> 401
  - Garbage / invalid token -> 401
  - CUSTOMER role token -> 403 on every admin router
  - PROVIDER role token -> 403 on every admin router
  - ADMIN role token -> 200 on every admin router
  - Inactive ADMIN token -> 403 (rejected)
  - Public endpoints work without a token -> 200
  - User-level review/complaint endpoints derive user_id from the authenticated token
    and ignore any client-supplied spoofed headers (a user cannot act as another user).
"""

import asyncio
import json
import os
import sys
import uuid
import warnings
from datetime import datetime, timezone
from decimal import Decimal

warnings.filterwarnings("ignore")

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from common.security import create_access_token
from database.base import Base
from database.session import get_db
from main import app
from models.booking import Booking, BookingStatus
from models.category import Category
from models.complaint import Complaint, ComplaintStatus, ComplaintType
from models.customer import Customer
from models.platform_setting import PlatformSetting
from models.provider import Provider, ProviderStatus
from models.review import Review
from models.service import Service, ServiceType
from models.user import User, UserRole

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

passed = 0
total = 0


def check(condition: bool, message: str) -> None:
    global passed, total
    total += 1
    if not condition:
        print(f"  FAIL  {message}")
        sys.exit(1)
    else:
        print(f"  PASS  {message}")
        passed += 1


async def asgi_request(
    method: str,
    path: str,
    headers: dict[str, str] | None = None,
    body: dict | None = None,
) -> tuple[int, dict | list | str]:
    headers = headers or {}
    raw_headers = [
        (k.lower().encode("latin1"), v.encode("latin1")) for k, v in headers.items()
    ]
    body_bytes = json.dumps(body).encode("utf-8") if body is not None else b""
    if body_bytes and not any(k.lower() == "content-type" for k in headers):
        raw_headers.append((b"content-type", b"application/json"))
    raw_headers.append((b"content-length", str(len(body_bytes)).encode("latin1")))

    if "?" in path:
        path_part, query_string = path.split("?", 1)
    else:
        path_part, query_string = path, ""

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": method.upper(),
        "scheme": "http",
        "path": path_part,
        "raw_path": path_part.encode("ascii"),
        "query_string": query_string.encode("ascii"),
        "headers": raw_headers,
        "client": ("127.0.0.1", 12345),
        "server": ("testserver", 80),
    }

    sent = False

    async def receive():
        nonlocal sent
        if not sent:
            sent = True
            return {"type": "http.request", "body": body_bytes, "more_body": False}
        return {"type": "http.request", "body": b"", "more_body": False}

    resp_status = None
    resp_body = []

    async def send(msg):
        nonlocal resp_status, resp_body
        if msg["type"] == "http.response.start":
            resp_status = msg["status"]
        elif msg["type"] == "http.response.body":
            resp_body.append(msg.get("body", b""))

    await app(scope, receive, send)

    full_body = b"".join(resp_body).decode("utf-8", errors="replace")
    try:
        parsed = json.loads(full_body)
    except Exception:
        parsed = full_body

    return resp_status, parsed


async def main():
    async with ENGINE.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    now = datetime.now(timezone.utc)

    # 1. Seed database with real users and test entities
    async with SessionFactory() as db:
        # Active Admin
        u_admin = User(
            id=uuid.uuid4(),
            full_name="Admin Officer",
            email="admin@platform.test",
            password_hash="mock_hash",
            role=UserRole.ADMIN,
            is_active=True,
            created_at=now,
            updated_at=now,
        )

        # Inactive Admin
        u_inactive_admin = User(
            id=uuid.uuid4(),
            full_name="Inactive Admin",
            email="inactive_admin@platform.test",
            password_hash="mock_hash",
            role=UserRole.ADMIN,
            is_active=False,
            created_at=now,
            updated_at=now,
        )

        # Active Customer 1
        u_cust1 = User(
            id=uuid.uuid4(),
            full_name="Alice Customer",
            email="alice@platform.test",
            password_hash="mock_hash",
            role=UserRole.CUSTOMER,
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        c_cust1 = Customer(
            id=uuid.uuid4(),
            user_id=u_cust1.id,
            created_at=now,
            updated_at=now,
        )

        # Active Customer 2
        u_cust2 = User(
            id=uuid.uuid4(),
            full_name="Bob Customer",
            email="bob@platform.test",
            password_hash="mock_hash",
            role=UserRole.CUSTOMER,
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        c_cust2 = Customer(
            id=uuid.uuid4(),
            user_id=u_cust2.id,
            created_at=now,
            updated_at=now,
        )

        # Active Provider
        u_prov = User(
            id=uuid.uuid4(),
            full_name="Sam Provider",
            email="sam@platform.test",
            password_hash="mock_hash",
            role=UserRole.PROVIDER,
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        p_prov = Provider(
            id=uuid.uuid4(),
            user_id=u_prov.id,
            business_name="Sam Electricals",
            location="Downtown",
            timezone="UTC",
            slot_interval_minutes=30,
            status=ProviderStatus.APPROVED,
            is_active=True,
            created_at=now,
            updated_at=now,
        )

        # Category
        cat = Category(
            id=uuid.uuid4(),
            name="Electrical",
            slug="electrical",
            is_active=True,
            created_at=now,
            updated_at=now,
        )

        # Service
        srv = Service(
            id=uuid.uuid4(),
            provider_id=p_prov.id,
            category_id=cat.id,
            name="Wiring Check",
            price=Decimal("120.00"),
            duration_minutes=60,
            service_type=ServiceType.ONLINE,
            is_active=True,
            created_at=now,
            updated_at=now,
        )

        from datetime import timedelta
        # Bookings
        b_cust1 = Booking(
            id=uuid.uuid4(),
            customer_id=c_cust1.id,
            provider_id=p_prov.id,
            service_id=srv.id,
            start_at=now,
            end_at=now + timedelta(minutes=60),
            status=BookingStatus.COMPLETED,
            price=Decimal("120.00"),
            created_at=now,
            updated_at=now,
        )
        b_cust2 = Booking(
            id=uuid.uuid4(),
            customer_id=c_cust2.id,
            provider_id=p_prov.id,
            service_id=srv.id,
            start_at=now,
            end_at=now + timedelta(minutes=60),
            status=BookingStatus.COMPLETED,
            price=Decimal("120.00"),
            created_at=now,
            updated_at=now,
        )

        # Reviews
        rev_cust1 = Review(
            id=uuid.uuid4(),
            booking_id=b_cust1.id,
            user_id=u_cust1.id,
            provider_id=p_prov.id,
            service_id=srv.id,
            rating=5,
            comment="Excellent work by Alice",
            is_visible=True,
            created_at=now,
            updated_at=now,
        )
        rev_cust2 = Review(
            id=uuid.uuid4(),
            booking_id=b_cust2.id,
            user_id=u_cust2.id,
            provider_id=p_prov.id,
            service_id=srv.id,
            rating=4,
            comment="Good job by Bob",
            is_visible=True,
            created_at=now,
            updated_at=now,
        )

        # Complaints
        comp_cust1 = Complaint(
            id=uuid.uuid4(),
            user_id=u_cust1.id,
            complaint_type=ComplaintType.PLATFORM,
            subject="Alice's Complaint",
            description="Alice platform issue",
            status=ComplaintStatus.OPEN,
            created_at=now,
            updated_at=now,
        )
        comp_cust2 = Complaint(
            id=uuid.uuid4(),
            user_id=u_cust2.id,
            complaint_type=ComplaintType.PLATFORM,
            subject="Bob's Complaint",
            description="Bob platform issue",
            status=ComplaintStatus.OPEN,
            created_at=now,
            updated_at=now,
        )

        from models.platform_setting import SettingValueType
        # Public Platform Setting
        setting = PlatformSetting(
            key="support_email",
            value="support@test.com",
            value_type=SettingValueType.STRING,
            setting_group="general",
            is_public=True,
            description="Support email address",
            created_at=now,
            updated_at=now,
        )

        db.add_all([
            u_admin,
            u_inactive_admin,
            u_cust1,
            c_cust1,
            u_cust2,
            c_cust2,
            u_prov,
            p_prov,
            cat,
            srv,
            b_cust1,
            b_cust2,
            rev_cust1,
            rev_cust2,
            comp_cust1,
            comp_cust2,
            setting,
        ])
        await db.commit()

    # 2. Real tokens generated with common.security
    token_admin = create_access_token(str(u_admin.id), role=UserRole.ADMIN.value)
    token_inactive_admin = create_access_token(str(u_inactive_admin.id), role=UserRole.ADMIN.value)
    token_cust1 = create_access_token(str(u_cust1.id), role=UserRole.CUSTOMER.value)
    token_cust2 = create_access_token(str(u_cust2.id), role=UserRole.CUSTOMER.value)
    token_prov = create_access_token(str(u_prov.id), role=UserRole.PROVIDER.value)
    token_garbage = "garbage.token.format"

    h_none = {}
    h_garb = {"Authorization": f"Bearer {token_garbage}"}
    h_cust1 = {"Authorization": f"Bearer {token_cust1}"}
    h_prov = {"Authorization": f"Bearer {token_prov}"}
    h_admin = {"Authorization": f"Bearer {token_admin}"}
    h_inactive = {"Authorization": f"Bearer {token_inactive_admin}"}

    # 3. Test EVERY Admin router across the application
    admin_endpoints = [
        ("GET", "/api/admin/providers", "admin_routes (providers)"),
        ("GET", "/api/admin/services", "admin_routes (services)"),
        ("GET", "/api/admin/dashboard/stats", "report_routes (dashboard/stats)"),
        ("GET", "/api/admin/reports/users", "report_routes (reports/users)"),
        ("GET", "/api/admin/categories", "category_routes (admin categories)"),
        ("GET", "/api/admin/settings", "platform_setting_routes (admin settings)"),
        ("GET", "/api/admin/reviews", "review_routes (admin reviews)"),
        ("GET", "/api/admin/complaints", "complaint_routes (admin complaints)"),
    ]

    for method, path, name in admin_endpoints:
        # No token -> 401
        status, _ = await asgi_request(method, path, h_none)
        check(status == 401, f"{name}: no token -> 401")

        # Garbage token -> 401
        status, _ = await asgi_request(method, path, h_garb)
        check(status == 401, f"{name}: garbage token -> 401")

        # CUSTOMER token -> 403
        status, _ = await asgi_request(method, path, h_cust1)
        check(status == 403, f"{name}: CUSTOMER token -> 403")

        # PROVIDER token -> 403
        status, _ = await asgi_request(method, path, h_prov)
        check(status == 403, f"{name}: PROVIDER token -> 403")

        # ADMIN token -> 200
        status, _ = await asgi_request(method, path, h_admin)
        check(status == 200, f"{name}: ADMIN token -> 200")

        # Inactive admin -> rejected (403)
        status, _ = await asgi_request(method, path, h_inactive)
        check(status == 403, f"{name}: inactive admin -> rejected (403)")

    # 4. Public routers test: must still work WITHOUT a token
    public_endpoints = [
        ("GET", "/api/categories", "public categories"),
        ("GET", "/api/settings/public", "public settings"),
        ("GET", f"/api/providers/{p_prov.id}/reviews", "public provider reviews"),
        ("GET", f"/api/providers/{p_prov.id}/rating", "public provider rating"),
    ]

    for method, path, name in public_endpoints:
        status, _ = await asgi_request(method, path, h_none)
        check(status == 200, f"{name}: works without a token -> 200")

    # 5. User-level review and complaint endpoints authentication checks
    # Missing token -> 401
    status, _ = await asgi_request("GET", "/api/reviews/me", h_none)
    check(status == 401, "reviews/me: no token -> 401")
    status, _ = await asgi_request("GET", "/api/complaints/me", h_none)
    check(status == 401, "complaints/me: no token -> 401")

    # Garbage token -> 401
    status, _ = await asgi_request("GET", "/api/reviews/me", h_garb)
    check(status == 401, "reviews/me: garbage token -> 401")
    status, _ = await asgi_request("GET", "/api/complaints/me", h_garb)
    check(status == 401, "complaints/me: garbage token -> 401")

    # Authenticated user ID is used: Alice gets only Alice's reviews
    status, body_alice_rev = await asgi_request("GET", "/api/reviews/me", h_cust1)
    check(status == 200, "reviews/me: Alice token -> 200")
    alice_items = body_alice_rev.get("data", {}).get("items", [])
    check(
        len(alice_items) == 1 and alice_items[0]["id"] == str(rev_cust1.id),
        "reviews/me: returns Alice's review only",
    )

    # Bob gets only Bob's reviews
    status, body_bob_rev = await asgi_request("GET", "/api/reviews/me", {"Authorization": f"Bearer {token_cust2}"})
    check(status == 200, "reviews/me: Bob token -> 200")
    bob_items = body_bob_rev.get("data", {}).get("items", [])
    check(
        len(bob_items) == 1 and bob_items[0]["id"] == str(rev_cust2.id),
        "reviews/me: returns Bob's review only",
    )

    # User cannot act as another user: Alice attempts to spoof X-User-Id header as Bob
    h_spoof_alice = {
        "Authorization": f"Bearer {token_cust1}",
        "X-User-Id": str(u_cust2.id),
    }
    status, body_spoofed = await asgi_request("GET", "/api/reviews/me", h_spoof_alice)
    check(status == 200, "reviews/me: request with spoofed X-User-Id accepted via token")
    spoofed_items = body_spoofed.get("data", {}).get("items", [])
    check(
        len(spoofed_items) == 1 and spoofed_items[0]["id"] == str(rev_cust1.id),
        "reviews/me: token identity takes precedence, spoofed X-User-Id is ignored (user cannot act as another user)",
    )

    # Complaints: Alice gets only Alice's complaints
    status, body_alice_comp = await asgi_request("GET", "/api/complaints/me", h_cust1)
    check(status == 200, "complaints/me: Alice token -> 200")
    alice_comp_items = body_alice_comp.get("data", {}).get("items", [])
    check(
        len(alice_comp_items) == 1 and alice_comp_items[0]["id"] == str(comp_cust1.id),
        "complaints/me: returns Alice's complaint only",
    )

    # Complaints: Bob gets only Bob's complaints
    status, body_bob_comp = await asgi_request("GET", "/api/complaints/me", {"Authorization": f"Bearer {token_cust2}"})
    check(status == 200, "complaints/me: Bob token -> 200")
    bob_comp_items = body_bob_comp.get("data", {}).get("items", [])
    check(
        len(bob_comp_items) == 1 and bob_comp_items[0]["id"] == str(comp_cust2.id),
        "complaints/me: returns Bob's complaint only",
    )

    # Complaints spoof attempt: Alice sends Bob's user ID in X-User-Id header
    status, body_spoofed_comp = await asgi_request("GET", "/api/complaints/me", h_spoof_alice)
    check(status == 200, "complaints/me: request with spoofed X-User-Id handled")
    spoofed_comp_items = body_spoofed_comp.get("data", {}).get("items", [])
    check(
        len(spoofed_comp_items) == 1 and spoofed_comp_items[0]["id"] == str(comp_cust1.id),
        "complaints/me: token identity takes precedence, spoofed X-User-Id ignored",
    )

    # Alice tries to view Bob's complaint -> Forbidden (403)
    status, _ = await asgi_request("GET", f"/api/complaints/{comp_cust2.id}", h_cust1)
    check(status == 403, "complaints/{id}: Alice viewing Bob's complaint -> 403 Forbidden")

    # Bob views Bob's complaint -> 200
    status, _ = await asgi_request("GET", f"/api/complaints/{comp_cust2.id}", {"Authorization": f"Bearer {token_cust2}"})
    check(status == 200, "complaints/{id}: Bob viewing Bob's complaint -> 200 OK")

    print("=" * 50)
    print(f"Results: {passed}/{total} passed (all OK)")


if __name__ == "__main__":
    asyncio.run(main())
