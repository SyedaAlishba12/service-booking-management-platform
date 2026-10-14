"""Standalone checks for the read-only admin booking endpoints."""

import asyncio
import json
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from common.security import create_access_token
from database.base import Base
from database.session import get_db
from main import app
from models.booking import Booking, BookingStatus, Payment, PaymentStatus
from models.category import Category
from models.customer import Customer
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


def check(condition: bool, message: str) -> None:
    global passed, total
    total += 1
    if not condition:
        print(f"  FAIL  {message}")
        raise AssertionError(message)
    print(f"  PASS  {message}")
    passed += 1


async def asgi_request(
    method: str, path: str, headers: dict[str, str] | None = None
) -> tuple[int, dict]:
    headers = headers or {}
    body: list[dict] = []
    status_code = 500
    response_headers: dict[str, str] = {}

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message):
        nonlocal status_code, response_headers
        if message["type"] == "http.response.start":
            status_code = message["status"]
            response_headers = {
                key.decode(): value.decode()
                for key, value in message["headers"]
            }
        elif message["type"] == "http.response.body":
            body.append(message.get("body", b""))

    scope = {
        "type": "http",
        "http_version": "1.1",
        "method": method,
        "path": path.split("?", 1)[0],
        "raw_path": path.encode(),
        "query_string": path.split("?", 1)[1].encode()
        if "?" in path
        else b"",
        "headers": [
            (key.lower().encode("latin1"), value.encode("latin1"))
            for key, value in headers.items()
        ],
        "scheme": "http",
        "server": ("testserver", 80),
        "client": ("testclient", 123),
        "root_path": "",
    }
    await app(scope, receive, send)
    raw = b"".join(body)
    return status_code, json.loads(raw) if raw else {}


async def main() -> None:
    async with ENGINE.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    now = datetime.now(timezone.utc).replace(microsecond=0)
    async with SessionFactory() as db:
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
        customer_user = User(
            id=uuid.uuid4(),
            full_name="Alice Customer",
            email="alice@example.com",
            password_hash="x",
            role=UserRole.CUSTOMER,
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        provider_user = User(
            id=uuid.uuid4(),
            full_name="Provider User",
            email="provider@example.com",
            password_hash="x",
            role=UserRole.PROVIDER,
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        customer = Customer(id=uuid.uuid4(), user_id=customer_user.id, created_at=now, updated_at=now)
        provider = Provider(
            id=uuid.uuid4(),
            user_id=provider_user.id,
            business_name="Alice Provider Studio",
            location="Remote",
            timezone="UTC",
            slot_interval_minutes=30,
            status=ProviderStatus.APPROVED,
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        category = Category(
            id=uuid.uuid4(),
            name="Category",
            slug="category",
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        service = Service(
            id=uuid.uuid4(),
            provider_id=provider.id,
            category_id=category.id,
            name="Alice Service",
            price=Decimal("25.00"),
            duration_minutes=60,
            service_type=ServiceType.ONLINE,
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        unpaid = Booking(
            id=uuid.uuid4(),
            customer_id=customer.id,
            provider_id=provider.id,
            service_id=service.id,
            start_at=now + timedelta(days=1),
            end_at=now + timedelta(days=1, hours=1),
            status=BookingStatus.PENDING,
            price=Decimal("25.00"),
            notes="Unpaid booking",
            created_at=now + timedelta(seconds=2),
            updated_at=now + timedelta(seconds=2),
        )
        paid = Booking(
            id=uuid.uuid4(),
            customer_id=customer.id,
            provider_id=provider.id,
            service_id=service.id,
            start_at=now + timedelta(days=2),
            end_at=now + timedelta(days=2, hours=1),
            status=BookingStatus.CONFIRMED,
            price=Decimal("30.00"),
            created_at=now + timedelta(seconds=1),
            updated_at=now + timedelta(seconds=1),
        )
        payment = Payment(
            id=uuid.uuid4(),
            booking_id=paid.id,
            amount=Decimal("30.00"),
            status=PaymentStatus.PAID,
            payment_method="CARD",
            transaction_reference="tx-1",
            paid_at=now,
            created_at=now,
            updated_at=now,
        )
        db.add_all([
            admin, customer_user, provider_user, customer, provider, category,
            service, unpaid, paid, payment,
        ])
        await db.commit()

    admin_token = create_access_token(str(admin.id), role=UserRole.ADMIN.value)
    customer_token = create_access_token(
        str(customer_user.id), role=UserRole.CUSTOMER.value
    )
    provider_token = create_access_token(
        str(provider_user.id), role=UserRole.PROVIDER.value
    )
    headers = {"Authorization": f"Bearer {admin_token}"}
    customer_headers = {"Authorization": f"Bearer {customer_token}"}
    provider_headers = {"Authorization": f"Bearer {provider_token}"}

    status_code, body = await asgi_request("GET", "/api/admin/bookings", headers)
    check(status_code == 200, "admin list returns 200")
    check(body["data"]["items"] and "items" in body["data"] and "meta" in body["data"], "empty/list shape uses items and meta")
    check(body["data"]["meta"]["total"] == 2, "list total is correct")

    status_code, empty_body = await asgi_request(
        "GET", "/api/admin/bookings?q=no-such-booking", headers
    )
    check(
        status_code == 200
        and empty_body["data"]["items"] == []
        and empty_body["data"]["meta"]["total"] == 0,
        "empty list preserves items and meta shape",
    )

    status_code, body = await asgi_request(
        "GET", "/api/admin/bookings?page=1&page_size=1", headers
    )
    check(status_code == 200 and len(body["data"]["items"]) == 1, "pagination returns one item")
    check(body["data"]["meta"]["total_pages"] == 2, "pagination total_pages is correct")

    expected_status_totals = {
        BookingStatus.PENDING: 1,
        BookingStatus.CONFIRMED: 1,
        BookingStatus.COMPLETED: 0,
        BookingStatus.CANCELLED: 0,
        BookingStatus.NO_SHOW: 0,
    }
    for booking_status in BookingStatus:
        status_code, body = await asgi_request(
            "GET", f"/api/admin/bookings?status={booking_status.value}", headers
        )
        check(
            status_code == 200
            and body["data"]["meta"]["total"] == expected_status_totals[booking_status]
            and (
                not body["data"]["items"]
                or body["data"]["items"][0]["status"] == booking_status.value
            ),
            f"status filter {booking_status.value}",
        )

    for name, query in (
        ("provider", f"provider_id={provider.id}"),
        ("customer", f"customer_id={customer.id}"),
        ("service", f"service_id={service.id}"),
    ):
        status_code, body = await asgi_request(
            "GET", f"/api/admin/bookings?{query}", headers
        )
        check(status_code == 200 and body["data"]["meta"]["total"] == 2, f"{name} filter")

    day = (now + timedelta(days=1)).date().isoformat()
    status_code, body = await asgi_request(
        "GET", f"/api/admin/bookings?date_from={day}&date_to={day}", headers
    )
    check(status_code == 200 and body["data"]["meta"]["total"] == 1, "inclusive date_from and date_to")

    status_code, body = await asgi_request(
        "GET", f"/api/admin/bookings?date_from=2030-01-02&date_to=2030-01-01",
        headers,
    )
    check(status_code == 422, "invalid date range returns 422")

    for term, label in (
        ("Alice Customer", "customer name"),
        ("alice@example.com", "customer email"),
        ("Alice Provider", "provider"),
        ("Alice Service", "service"),
        (unpaid.id.hex[:8], "booking ID prefix"),
    ):
        status_code, body = await asgi_request(
            "GET", f"/api/admin/bookings?q={term.replace(' ', '%20')}", headers
        )
        check(status_code == 200 and body["data"]["meta"]["total"] >= 1, f"search by {label}")

    status_code, unpaid_detail = await asgi_request(
        "GET", f"/api/admin/bookings/{unpaid.id}", headers
    )
    check(status_code == 200, "unpaid booking detail returns 200")
    detail = unpaid_detail["data"]
    check(
        detail["payment_status"] is None
        and detail["payment_amount"] is None
        and detail["payment_id"] is None
        and detail["payment_method"] is None
        and detail["transaction_reference"] is None
        and detail["paid_at"] is None
        and detail["refunded_at"] is None
        and detail["refund_amount"] is None
        and detail["failure_reason"] is None,
        "unpaid detail has all payment fields null",
    )
    unpaid_list = await asgi_request(
        "GET", f"/api/admin/bookings?q={unpaid.id.hex[:8]}", headers
    )
    check(unpaid_list[1]["data"]["items"][0]["payment_amount"] is None, "unpaid list payment_amount is JSON null")

    status_code, paid_detail = await asgi_request(
        "GET", f"/api/admin/bookings/{paid.id}", headers
    )
    check(status_code == 200 and paid_detail["data"]["payment_status"] == "PAID", "paid detail includes payment")

    before = await _booking_count()
    await asgi_request("GET", "/api/admin/bookings", headers)
    after = await _booking_count()
    check(before == after, "read endpoints do not mutate booking count")

    unknown = await asgi_request("GET", f"/api/admin/bookings/{uuid.uuid4()}", headers)
    check(unknown[0] == 404, "unknown booking returns 404")
    check((await asgi_request("GET", "/api/admin/bookings"))[0] == 401, "no token returns 401")
    check((await asgi_request("GET", "/api/admin/bookings", customer_headers))[0] == 403, "customer token returns 403")
    check((await asgi_request("GET", "/api/admin/bookings", provider_headers))[0] == 403, "provider token returns 403")

    print(f"\nAdmin booking standalone checks: {passed}/{total} passed, 0 failed")


async def _booking_count() -> int:
    async with SessionFactory() as db:
        return len((await db.scalars(select(Booking))).all())


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as exc:
        print(f"\nAdmin booking standalone checks: {passed}/{total} passed, 1 failed")
        print(f"  ERROR  {type(exc).__name__}: {exc}")
        raise
