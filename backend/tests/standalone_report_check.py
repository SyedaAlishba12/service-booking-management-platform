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

ENGINE = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
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
        check(r_rev["paid_total"] == Decimal("0.00"), "empty database returns zeros for revenue")
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
        
        check(s["payments"]["paid_total"] == Decimal("12.00") and s["payments"]["refunded_total"] == Decimal("10.00"), "a REFUNDED payment is excluded from paid_total and its refund_amount is in refunded_total")
        
        pr = await svc.provider_report(db)
        check(pr["top_by_bookings"][0]["provider_id"] == str(prov1.id), "top providers ordering")
        
        # Boundary checks
        bk_report = await svc.booking_report(db, date_from=d_today, date_to=d_today)
        # Includes b1, b_boundary_1. Excludes b_boundary_2. Excludes b2 (cancelled, 2 days ago)
        check(bk_report["by_status"].get(BookingStatus.COMPLETED.value) == 2, "date boundary checks for booking start_at")
        
        rev_report = await svc.revenue_report(db, date_from=d_today, date_to=d_today)
        check(rev_report["paid_total"] == Decimal("11.00"), "date boundary checks for payment paid_at")
        
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

        print("=" * 50)
        print(f"Results: {passed}/{total} passed (all OK)")

if __name__ == "__main__":
    asyncio.run(main())
