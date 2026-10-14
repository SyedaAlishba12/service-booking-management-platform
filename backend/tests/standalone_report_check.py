import asyncio
import sys
import uuid
import os
from datetime import datetime, date, timedelta, timezone
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import func, select
from database.base import Base
from models.user import User, UserRole
from models.customer import Customer
from models.provider import Provider, ProviderStatus
from models.availability import Availability, AvailabilityException
from models.category import Category
from models.service import Service, ServiceType
from models.booking import Booking, BookingStatus, Payment, PaymentStatus
from models.review import Review
from models.complaint import Complaint, ComplaintType, ComplaintStatus

import services.report_service as svc

from sqlalchemy import event

ENGINE = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    connect_args={"check_same_thread": False},
    echo=False,
)

def _sqlite_timezone(tz_name, val):
    if val is None:
        return None
    if isinstance(val, str):
        try:
            clean = val.replace("Z", "+00:00")
            if "T" not in clean and " " in clean and "+" not in clean and "-" not in clean[10:]:
                dt = datetime.fromisoformat(clean).replace(tzinfo=timezone.utc)
            else:
                dt = datetime.fromisoformat(clean)
        except Exception:
            try:
                dt = datetime.strptime(val.split(".")[0], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
            except Exception:
                return str(val)
    elif isinstance(val, datetime):
        dt = val
    else:
        return str(val)

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%d %H:%M:%S")

@event.listens_for(ENGINE.sync_engine, "connect")
def on_sqlite_connect(dbapi_connection, connection_record):
    raw_conn = getattr(dbapi_connection, "_connection", dbapi_connection)
    underlying = getattr(raw_conn, "_conn", raw_conn)
    if hasattr(underlying, "create_function"):
        underlying.create_function("timezone", 2, _sqlite_timezone)
    elif hasattr(dbapi_connection, "create_function"):
        dbapi_connection.create_function("timezone", 2, _sqlite_timezone)

SessionFactory = async_sessionmaker(bind=ENGINE, class_=AsyncSession, expire_on_commit=False)

passed = 0
total = 0

def check(condition, message):
    global passed, total
    total += 1
    if not condition:
        print(f"  FAIL  {message}")
        sys.exit(1)
    else:
        print(f"  PASS  {message}")
        passed += 1

async def create_tables():
    async with ENGINE.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def main():
    await create_tables()
    async with SessionFactory() as db:
        # TEST EMPTY DB FIRST
        db_stats = await svc.get_dashboard_stats(db)
        check(db_stats["users"]["total"] == 0, "empty database returns zeros and empty lists")
        r_rev = await svc.revenue_report(db)
        check(
            r_rev["gross_captured"] == Decimal("0.00")
            and r_rev["refunds"] == Decimal("0.00")
            and r_rev["net_collected"] == Decimal("0.00"),
            "empty database returns zeros for revenue",
        )
        r_user = await svc.user_report(db)
        check(len(r_user["new_users_per_day"]) == 0, "empty database returns empty lists")
        
        # Insert fixtures
        now = datetime.now(timezone.utc)
        cat = Category(id=uuid.uuid4(), name="Test Cat", slug="test-cat", is_active=True, created_at=now, updated_at=now)
        db.add(cat)
        
        u_admin = User(id=uuid.uuid4(), full_name="A", email="a@a.com", password_hash="x", role=UserRole.ADMIN, created_at=now, updated_at=now)
        u_cust = User(id=uuid.uuid4(), full_name="C", email="c@c.com", password_hash="x", role=UserRole.CUSTOMER, created_at=now, updated_at=now)
        u_prov1 = User(id=uuid.uuid4(), full_name="P1", email="p1@p.com", password_hash="x", role=UserRole.PROVIDER, created_at=now, updated_at=now)
        u_prov2 = User(id=uuid.uuid4(), full_name="P2", email="p2@p.com", password_hash="x", role=UserRole.PROVIDER, is_active=False, created_at=now, updated_at=now)
        db.add_all([u_admin, u_cust, u_prov1, u_prov2])
        
        cust = Customer(id=uuid.uuid4(), user_id=u_cust.id, created_at=now, updated_at=now)
        prov1 = Provider(id=uuid.uuid4(), user_id=u_prov1.id, business_name="P1", location="L", timezone="UTC", slot_interval_minutes=30, status=ProviderStatus.APPROVED, created_at=now, updated_at=now)
        prov2 = Provider(id=uuid.uuid4(), user_id=u_prov2.id, business_name="P2", location="L", timezone="UTC", slot_interval_minutes=30, status=ProviderStatus.PENDING, created_at=now, updated_at=now)
        db.add_all([cust, prov1, prov2])
        
        srv1 = Service(id=uuid.uuid4(), provider_id=prov1.id, category_id=cat.id, name="S1", price=Decimal("10.00"), duration_minutes=30, service_type=ServiceType.ONLINE, created_at=now, updated_at=now)
        srv2 = Service(id=uuid.uuid4(), provider_id=prov2.id, category_id=cat.id, name="S2", price=Decimal("20.00"), duration_minutes=30, service_type=ServiceType.ONLINE, is_active=False, created_at=now, updated_at=now)
        db.add_all([srv1, srv2])
        
        # Bookings & Payments
        # Booking 1: COMPLETED, PAID
        b1 = Booking(id=uuid.uuid4(), customer_id=cust.id, provider_id=prov1.id, service_id=srv1.id, start_at=now, end_at=now+timedelta(minutes=30), status=BookingStatus.COMPLETED, price=Decimal("10.00"), created_at=now, updated_at=now)
        p1 = Payment(id=uuid.uuid4(), booking_id=b1.id, amount=Decimal("10.00"), status=PaymentStatus.PAID, paid_at=now, created_at=now, updated_at=now)
        
        # Booking 2: CANCELLED, REFUNDED
        b2 = Booking(id=uuid.uuid4(), customer_id=cust.id, provider_id=prov2.id, service_id=srv2.id, start_at=now-timedelta(days=2), end_at=now-timedelta(days=2)+timedelta(minutes=30), status=BookingStatus.CANCELLED, price=Decimal("20.00"), created_at=now-timedelta(days=2), updated_at=now)
        p2 = Payment(id=uuid.uuid4(), booking_id=b2.id, amount=Decimal("20.00"), refund_amount=Decimal("10.00"), status=PaymentStatus.REFUNDED, paid_at=now-timedelta(days=2), refunded_at=now-timedelta(days=1), created_at=now-timedelta(days=2), updated_at=now)
        
        db.add_all([b1, b2, p1, p2])
        
        # Reviews
        rev1 = Review(id=uuid.uuid4(), booking_id=b1.id, user_id=u_cust.id, provider_id=prov1.id, service_id=srv1.id, rating=4, is_visible=True, created_at=now, updated_at=now)
        rev2 = Review(id=uuid.uuid4(), booking_id=b2.id, user_id=u_cust.id, provider_id=prov2.id, service_id=srv2.id, rating=4, is_visible=False, created_at=now, updated_at=now)
        db.add_all([rev1, rev2])
        
        # Complaints
        comp1 = Complaint(id=uuid.uuid4(), user_id=u_cust.id, complaint_type=ComplaintType.PLATFORM, subject="H", description="H", status=ComplaintStatus.OPEN, created_at=now, updated_at=now)
        db.add(comp1)

        d_today = now.date()
        b_end_today = datetime(d_today.year, d_today.month, d_today.day, 23, 59, 59, tzinfo=timezone.utc)
        d_tomorrow = d_today + timedelta(days=1)
        b_start_tomorrow = datetime(d_tomorrow.year, d_tomorrow.month, d_tomorrow.day, 0, 0, 0, tzinfo=timezone.utc)
        
        b_boundary_1 = Booking(id=uuid.uuid4(), customer_id=cust.id, provider_id=prov1.id, service_id=srv1.id, start_at=b_end_today, end_at=b_end_today+timedelta(minutes=30), status=BookingStatus.COMPLETED, price=Decimal("1.00"), created_at=now, updated_at=now)
        b_boundary_2 = Booking(id=uuid.uuid4(), customer_id=cust.id, provider_id=prov1.id, service_id=srv1.id, start_at=b_start_tomorrow, end_at=b_start_tomorrow+timedelta(minutes=30), status=BookingStatus.COMPLETED, price=Decimal("1.00"), created_at=now, updated_at=now)
        db.add_all([b_boundary_1, b_boundary_2])
        
        p_boundary_1 = Payment(id=uuid.uuid4(), booking_id=b_boundary_1.id, amount=Decimal("1.00"), status=PaymentStatus.PAID, paid_at=b_end_today, created_at=now, updated_at=now)
        p_boundary_2 = Payment(id=uuid.uuid4(), booking_id=b_boundary_2.id, amount=Decimal("1.00"), status=PaymentStatus.PAID, paid_at=b_start_tomorrow, created_at=now, updated_at=now)
        db.add_all([p_boundary_1, p_boundary_2])

        r_boundary_1 = Review(id=uuid.uuid4(), booking_id=b_boundary_1.id, user_id=u_cust.id, provider_id=prov1.id, service_id=srv1.id, rating=4, is_visible=True, created_at=b_end_today, updated_at=now)
        r_boundary_2 = Review(id=uuid.uuid4(), booking_id=b_boundary_2.id, user_id=u_cust.id, provider_id=prov1.id, service_id=srv1.id, rating=5, is_visible=True, created_at=b_start_tomorrow, updated_at=now)
        db.add_all([r_boundary_1, r_boundary_2])

        await db.commit()

        # Gather row counts before
        async def row_counts(sess):
            counts = {}
            for table in Base.metadata.sorted_tables:
                res = await sess.execute(select(func.count()).select_from(table))
                counts[table.name] = res.scalar()
            return counts

        rc1 = await row_counts(db)

        # ASSERTS
        s = await svc.get_dashboard_stats(db)
        
        check(s["reviews"]["hidden"] == 1, "a hidden review is excluded from the average but counted as hidden")
        check(s["reviews"]["average_rating"] == 4.33, "ratings 5, 4, 4 give 4.33")
        
        check(
            s["payments"]["gross_captured"] == Decimal("32.00")
            and s["payments"]["refunds"] == Decimal("10.00")
            and s["payments"]["net_collected"] == Decimal("22.00"),
            "dashboard stats gross_captured, refunds, net_collected",
        )
        
        pr = await svc.provider_report(db)
        check(pr["top_by_bookings"][0]["provider_id"] == str(prov1.id), "top providers ordering")
        
        # Boundary checks
        bk_report = await svc.booking_report(db, date_from=d_today, date_to=d_today)
        # Includes b1, b_boundary_1. Excludes b_boundary_2. Excludes b2 (cancelled, 2 days ago)
        check(bk_report["by_status"].get(BookingStatus.COMPLETED.value) == 2, "date boundary checks for booking start_at")
        
        rev_report = await svc.revenue_report(db, date_from=d_today, date_to=d_today)
        check(
            rev_report["gross_captured"] == Decimal("11.00")
            and rev_report["refunds"] == Decimal("0.00")
            and rev_report["net_collected"] == Decimal("11.00"),
            "date boundary checks for payment paid_at",
        )
        
        review_r = await svc.review_report(db, date_from=d_today, date_to=d_today)
        check(review_r["count"] == 3, "date boundary checks for review created_at")

        # validation errors
        try:
            await svc.revenue_report(db, date_from=d_today, date_to=d_today - timedelta(days=1))
            check(False, "date_from after date_to raises ReportValidationError")
        except svc.ReportValidationError:
            check(True, "date_from after date_to raises ReportValidationError")

        try:
            await svc.revenue_report(db, date_from=d_today - timedelta(days=400), date_to=d_today)
            check(False, "a range over 366 days raises it")
        except svc.ReportValidationError:
            check(True, "a range over 366 days raises it")

        # check row counts untouched
        # we also need to call ALL report functions to prove it's read-only
        await svc.user_report(db)
        await svc.provider_report(db)
        await svc.service_report(db)
        await svc.complaint_report(db)

        rc2 = await row_counts(db)
        check(rc1 == rc2, "row counts of ALL tables are unchanged after calling every report function (read-only proof)")

    # Extended Revenue Test Cases (a through f)
    await run_extended_cases()

    print("=" * 50)
    print(f"Results: {passed}/{total} passed (all OK)")

async def make_test_db():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        echo=False,
    )
    @event.listens_for(engine.sync_engine, "connect")
    def on_conn(dbapi_connection, record):
        raw_conn = getattr(dbapi_connection, "_connection", dbapi_connection)
        underlying = getattr(raw_conn, "_conn", raw_conn)
        if hasattr(underlying, "create_function"):
            underlying.create_function("timezone", 2, _sqlite_timezone)
        elif hasattr(dbapi_connection, "create_function"):
            dbapi_connection.create_function("timezone", 2, _sqlite_timezone)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    return engine, session_factory

async def create_fixture_base(db):
    now = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    cat = Category(id=uuid.uuid4(), name="Cat", slug=f"cat-{uuid.uuid4().hex[:6]}", is_active=True, created_at=now, updated_at=now)
    db.add(cat)
    u_cust = User(id=uuid.uuid4(), full_name="Cust", email=f"c_{uuid.uuid4().hex[:6]}@c.com", password_hash="x", role=UserRole.CUSTOMER, created_at=now, updated_at=now)
    u_prov = User(id=uuid.uuid4(), full_name="Prov", email=f"p_{uuid.uuid4().hex[:6]}@p.com", password_hash="x", role=UserRole.PROVIDER, created_at=now, updated_at=now)
    db.add_all([u_cust, u_prov])
    cust = Customer(id=uuid.uuid4(), user_id=u_cust.id, created_at=now, updated_at=now)
    prov = Provider(id=uuid.uuid4(), user_id=u_prov.id, business_name="Prov", location="L", timezone="UTC", slot_interval_minutes=30, status=ProviderStatus.APPROVED, created_at=now, updated_at=now)
    db.add_all([cust, prov])
    srv = Service(id=uuid.uuid4(), provider_id=prov.id, category_id=cat.id, name="Srv", price=Decimal("100.00"), duration_minutes=30, service_type=ServiceType.ONLINE, created_at=now, updated_at=now)
    db.add(srv)
    await db.commit()
    return cust, prov, srv

async def run_extended_cases():
    # Case a: 100 paid Jan 28, fully refunded Feb 3: January gross 100 / refunds 0 / net 100; February gross 0 / refunds 100 / net -100; Jan-Feb range net 0.
    engine_a, Session_a = await make_test_db()
    async with Session_a() as db:
        cust, prov, srv = await create_fixture_base(db)
        t_jan28 = datetime(2026, 1, 28, 14, 30, 0, tzinfo=timezone.utc)
        t_feb3 = datetime(2026, 2, 3, 10, 15, 0, tzinfo=timezone.utc)
        b = Booking(id=uuid.uuid4(), customer_id=cust.id, provider_id=prov.id, service_id=srv.id, start_at=t_jan28, end_at=t_jan28+timedelta(minutes=30), status=BookingStatus.CANCELLED, price=Decimal("100.00"), created_at=t_jan28, updated_at=t_feb3)
        p = Payment(id=uuid.uuid4(), booking_id=b.id, amount=Decimal("100.00"), refund_amount=Decimal("100.00"), status=PaymentStatus.REFUNDED, paid_at=t_jan28, refunded_at=t_feb3, created_at=t_jan28, updated_at=t_feb3)
        db.add_all([b, p])
        await db.commit()

        r_jan = await svc.revenue_report(db, date_from=date(2026, 1, 1), date_to=date(2026, 1, 31))
        check(r_jan["gross_captured"] == Decimal("100.00") and r_jan["refunds"] == Decimal("0.00") and r_jan["net_collected"] == Decimal("100.00"), "case a: January gross 100 / refunds 0 / net 100")

        r_feb = await svc.revenue_report(db, date_from=date(2026, 2, 1), date_to=date(2026, 2, 28))
        check(r_feb["gross_captured"] == Decimal("0.00") and r_feb["refunds"] == Decimal("100.00") and r_feb["net_collected"] == Decimal("-100.00"), "case a: February gross 0 / refunds 100 / net -100")

        r_both = await svc.revenue_report(db, date_from=date(2026, 1, 1), date_to=date(2026, 2, 28))
        check(r_both["gross_captured"] == Decimal("100.00") and r_both["refunds"] == Decimal("100.00") and r_both["net_collected"] == Decimal("0.00"), "case a: Jan-Feb range net 0")
    await engine_a.dispose()

    # Case b: 100 paid, 20 partial refund: gross 100, refunds 20, net 80 (payment must NOT disappear from gross).
    engine_b, Session_b = await make_test_db()
    async with Session_b() as db:
        cust, prov, srv = await create_fixture_base(db)
        t_paid = datetime(2026, 3, 10, 12, 0, 0, tzinfo=timezone.utc)
        t_refund = datetime(2026, 3, 12, 12, 0, 0, tzinfo=timezone.utc)
        b = Booking(id=uuid.uuid4(), customer_id=cust.id, provider_id=prov.id, service_id=srv.id, start_at=t_paid, end_at=t_paid+timedelta(minutes=30), status=BookingStatus.REFUNDED if hasattr(BookingStatus, 'REFUNDED') else BookingStatus.COMPLETED, price=Decimal("100.00"), created_at=t_paid, updated_at=t_refund)
        p = Payment(id=uuid.uuid4(), booking_id=b.id, amount=Decimal("100.00"), refund_amount=Decimal("20.00"), status=PaymentStatus.REFUNDED, paid_at=t_paid, refunded_at=t_refund, created_at=t_paid, updated_at=t_refund)
        db.add_all([b, p])
        await db.commit()

        r = await svc.revenue_report(db, date_from=date(2026, 3, 1), date_to=date(2026, 3, 31))
        check(r["gross_captured"] == Decimal("100.00") and r["refunds"] == Decimal("20.00") and r["net_collected"] == Decimal("80.00"), "case b: 100 paid, 20 partial refund -> gross 100, refunds 20, net 80 (not disappeared from gross)")
    await engine_b.dispose()

    # Case c: Pending and failed payments (paid_at NULL) are excluded everywhere.
    engine_c, Session_c = await make_test_db()
    async with Session_c() as db:
        cust, prov, srv = await create_fixture_base(db)
        t1 = datetime(2026, 3, 5, 12, 0, 0, tzinfo=timezone.utc)
        b1 = Booking(id=uuid.uuid4(), customer_id=cust.id, provider_id=prov.id, service_id=srv.id, start_at=t1, end_at=t1+timedelta(minutes=30), status=BookingStatus.PENDING, price=Decimal("50.00"), created_at=t1, updated_at=t1)
        p_pending = Payment(id=uuid.uuid4(), booking_id=b1.id, amount=Decimal("50.00"), status=PaymentStatus.PENDING, paid_at=None, created_at=t1, updated_at=t1)

        b2 = Booking(id=uuid.uuid4(), customer_id=cust.id, provider_id=prov.id, service_id=srv.id, start_at=t1, end_at=t1+timedelta(minutes=30), status=BookingStatus.CANCELLED, price=Decimal("75.00"), created_at=t1, updated_at=t1)
        p_failed = Payment(id=uuid.uuid4(), booking_id=b2.id, amount=Decimal("75.00"), status=PaymentStatus.FAILED, paid_at=None, created_at=t1, updated_at=t1)

        db.add_all([b1, p_pending, b2, p_failed])
        await db.commit()

        r = await svc.revenue_report(db, date_from=date(2026, 3, 1), date_to=date(2026, 3, 31))
        check(r["gross_captured"] == Decimal("0.00") and r["refunds"] == Decimal("0.00") and r["net_collected"] == Decimal("0.00") and len(r["per_day"]) == 0, "case c: pending and failed excluded from revenue report and per_day")

        stats = await svc.get_dashboard_stats(db)
        p_stat = stats["payments"]
        check(p_stat["gross_captured"] == Decimal("0.00") and p_stat["refunds"] == Decimal("0.00") and p_stat["net_collected"] == Decimal("0.00") and p_stat["pending_count"] == 1 and p_stat["failed_count"] == 1, "case c: pending and failed excluded from dashboard stats revenue totals")

        pr = await svc.provider_report(db, date_from=date(2026, 3, 1), date_to=date(2026, 3, 31))
        check(len(pr["top_by_revenue"]) == 0, "case c: pending and failed excluded from top providers by revenue")
    await engine_c.dispose()

    # Case d: Paid, never refunded: counted in gross only.
    engine_d, Session_d = await make_test_db()
    async with Session_d() as db:
        cust, prov, srv = await create_fixture_base(db)
        t_paid = datetime(2026, 4, 15, 10, 0, 0, tzinfo=timezone.utc)
        b = Booking(id=uuid.uuid4(), customer_id=cust.id, provider_id=prov.id, service_id=srv.id, start_at=t_paid, end_at=t_paid+timedelta(minutes=30), status=BookingStatus.COMPLETED, price=Decimal("150.00"), created_at=t_paid, updated_at=t_paid)
        p = Payment(id=uuid.uuid4(), booking_id=b.id, amount=Decimal("150.00"), refund_amount=None, status=PaymentStatus.PAID, paid_at=t_paid, refunded_at=None, created_at=t_paid, updated_at=t_paid)
        db.add_all([b, p])
        await db.commit()

        r = await svc.revenue_report(db, date_from=date(2026, 4, 1), date_to=date(2026, 4, 30))
        check(r["gross_captured"] == Decimal("150.00") and r["refunds"] == Decimal("0.00") and r["net_collected"] == Decimal("150.00"), "case d: paid never refunded counted in gross only (refunds 0, net = gross)")
        check(len(r["per_day"]) == 1 and r["per_day"][0]["date"] == "2026-04-15" and r["per_day"][0]["gross_captured"] == Decimal("150.00") and r["per_day"][0]["refunds"] == Decimal("0.00"), "case d: daily bucket gross only")
    await engine_d.dispose()

    # Case e: UTC boundary: paid_at 2026-01-31 23:30 UTC lands on Jan 31, not Feb 1, independent of DB session timezone.
    engine_e, Session_e = await make_test_db()
    async with Session_e() as db:
        cust, prov, srv = await create_fixture_base(db)
        t_boundary = datetime(2026, 1, 31, 23, 30, 0, tzinfo=timezone.utc)
        b = Booking(id=uuid.uuid4(), customer_id=cust.id, provider_id=prov.id, service_id=srv.id, start_at=t_boundary, end_at=t_boundary+timedelta(minutes=30), status=BookingStatus.COMPLETED, price=Decimal("200.00"), created_at=t_boundary, updated_at=t_boundary)
        p = Payment(id=uuid.uuid4(), booking_id=b.id, amount=Decimal("200.00"), status=PaymentStatus.PAID, paid_at=t_boundary, created_at=t_boundary, updated_at=t_boundary)
        db.add_all([b, p])
        await db.commit()

        r_jan31 = await svc.revenue_report(db, date_from=date(2026, 1, 31), date_to=date(2026, 1, 31))
        check(r_jan31["gross_captured"] == Decimal("200.00") and len(r_jan31["per_day"]) == 1 and r_jan31["per_day"][0]["date"] == "2026-01-31", "case e: paid_at 2026-01-31 23:30 UTC lands on Jan 31 in date query and per_day")

        r_feb1 = await svc.revenue_report(db, date_from=date(2026, 2, 1), date_to=date(2026, 2, 1))
        check(r_feb1["gross_captured"] == Decimal("0.00") and len(r_feb1["per_day"]) == 0, "case e: paid_at 2026-01-31 23:30 UTC does not land on Feb 1")
    await engine_e.dispose()

    # Case f: Top providers ranking uses net (a provider with a fully refunded payment ranks below one with a smaller unrefunded payment).
    engine_f, Session_f = await make_test_db()
    async with Session_f() as db:
        now = datetime(2026, 5, 1, 0, 0, 0, tzinfo=timezone.utc)
        cat = Category(id=uuid.uuid4(), name="Cat", slug=f"cat-{uuid.uuid4().hex[:6]}", is_active=True, created_at=now, updated_at=now)
        db.add(cat)
        u_cust = User(id=uuid.uuid4(), full_name="Cust", email=f"c_{uuid.uuid4().hex[:6]}@c.com", password_hash="x", role=UserRole.CUSTOMER, created_at=now, updated_at=now)
        u_p1 = User(id=uuid.uuid4(), full_name="Refunded Prov", email=f"p_ref_{uuid.uuid4().hex[:6]}@p.com", password_hash="x", role=UserRole.PROVIDER, created_at=now, updated_at=now)
        u_p2 = User(id=uuid.uuid4(), full_name="Small Net Prov", email=f"p_small_{uuid.uuid4().hex[:6]}@p.com", password_hash="x", role=UserRole.PROVIDER, created_at=now, updated_at=now)
        db.add_all([u_cust, u_p1, u_p2])

        cust = Customer(id=uuid.uuid4(), user_id=u_cust.id, created_at=now, updated_at=now)
        prov_refunded = Provider(id=uuid.uuid4(), user_id=u_p1.id, business_name="Refunded Prov", location="L", timezone="UTC", slot_interval_minutes=30, status=ProviderStatus.APPROVED, created_at=now, updated_at=now)
        prov_small = Provider(id=uuid.uuid4(), user_id=u_p2.id, business_name="Small Net Prov", location="L", timezone="UTC", slot_interval_minutes=30, status=ProviderStatus.APPROVED, created_at=now, updated_at=now)
        db.add_all([cust, prov_refunded, prov_small])

        srv1 = Service(id=uuid.uuid4(), provider_id=prov_refunded.id, category_id=cat.id, name="S1", price=Decimal("500.00"), duration_minutes=30, service_type=ServiceType.ONLINE, created_at=now, updated_at=now)
        srv2 = Service(id=uuid.uuid4(), provider_id=prov_small.id, category_id=cat.id, name="S2", price=Decimal("100.00"), duration_minutes=30, service_type=ServiceType.ONLINE, created_at=now, updated_at=now)
        db.add_all([srv1, srv2])

        # prov_refunded: 500 paid, 500 refunded -> net 0
        t1 = datetime(2026, 5, 5, 10, 0, 0, tzinfo=timezone.utc)
        t1_ref = datetime(2026, 5, 6, 10, 0, 0, tzinfo=timezone.utc)
        b1 = Booking(id=uuid.uuid4(), customer_id=cust.id, provider_id=prov_refunded.id, service_id=srv1.id, start_at=t1, end_at=t1+timedelta(minutes=30), status=BookingStatus.CANCELLED, price=Decimal("500.00"), created_at=t1, updated_at=t1_ref)
        p1 = Payment(id=uuid.uuid4(), booking_id=b1.id, amount=Decimal("500.00"), refund_amount=Decimal("500.00"), status=PaymentStatus.REFUNDED, paid_at=t1, refunded_at=t1_ref, created_at=t1, updated_at=t1_ref)

        # prov_small: 100 paid, 0 refunded -> net 100
        t2 = datetime(2026, 5, 5, 11, 0, 0, tzinfo=timezone.utc)
        b2 = Booking(id=uuid.uuid4(), customer_id=cust.id, provider_id=prov_small.id, service_id=srv2.id, start_at=t2, end_at=t2+timedelta(minutes=30), status=BookingStatus.COMPLETED, price=Decimal("100.00"), created_at=t2, updated_at=t2)
        p2 = Payment(id=uuid.uuid4(), booking_id=b2.id, amount=Decimal("100.00"), status=PaymentStatus.PAID, paid_at=t2, created_at=t2, updated_at=t2)

        db.add_all([b1, p1, b2, p2])
        await db.commit()

        pr = await svc.provider_report(db, date_from=date(2026, 5, 1), date_to=date(2026, 5, 31))
        top_rev = pr["top_by_revenue"]
        check(len(top_rev) >= 2, "case f: top_by_revenue returns both providers")
        check(top_rev[0]["provider_id"] == str(prov_small.id) and top_rev[0]["net_collected"] == Decimal("100.00"), "case f: rank #1 is prov_small with net 100")
        check(top_rev[1]["provider_id"] == str(prov_refunded.id) and top_rev[1]["net_collected"] == Decimal("0.00"), "case f: rank #2 is prov_refunded with net 0 (ranked below smaller unrefunded)")
    await engine_f.dispose()

if __name__ == "__main__":
    asyncio.run(main())
