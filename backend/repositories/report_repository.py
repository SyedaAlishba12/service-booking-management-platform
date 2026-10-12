import uuid
from datetime import date, datetime, time, timedelta, timezone
from typing import Any
from decimal import Decimal

from sqlalchemy import and_, func, select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User, UserRole
from models.customer import Customer
from models.provider import Provider, ProviderStatus
from models.service import Service
from models.booking import Booking, BookingStatus, Payment, PaymentStatus
from models.review import Review
from models.complaint import Complaint, ComplaintStatus

async def get_dashboard_stats(db: AsyncSession) -> dict[str, Any]:
    # Users
    users_total = await db.scalar(select(func.count(User.id))) or 0
    users_active = await db.scalar(select(func.count(User.id)).where(User.is_active.is_(True))) or 0
    users_customers = await db.scalar(select(func.count(User.id)).where(User.role == UserRole.CUSTOMER)) or 0
    users_providers = await db.scalar(select(func.count(User.id)).where(User.role == UserRole.PROVIDER)) or 0

    # Services
    services_total = await db.scalar(select(func.count(Service.id))) or 0
    services_active = await db.scalar(select(func.count(Service.id)).where(Service.is_active.is_(True))) or 0

    # Bookings
    bookings_total = await db.scalar(select(func.count(Booking.id))) or 0
    b_pending = await db.scalar(select(func.count(Booking.id)).where(Booking.status == BookingStatus.PENDING)) or 0
    b_confirmed = await db.scalar(select(func.count(Booking.id)).where(Booking.status == BookingStatus.CONFIRMED)) or 0
    b_completed = await db.scalar(select(func.count(Booking.id)).where(Booking.status == BookingStatus.COMPLETED)) or 0
    b_cancelled = await db.scalar(select(func.count(Booking.id)).where(Booking.status == BookingStatus.CANCELLED)) or 0
    b_no_show = await db.scalar(select(func.count(Booking.id)).where(Booking.status == BookingStatus.NO_SHOW)) or 0

    # Payments (all-time in UTC)
    p_gross_captured = (
        await db.scalar(
            select(func.coalesce(func.sum(Payment.amount), Decimal("0.00"))).where(
                Payment.paid_at.is_not(None)
            )
        )
        or Decimal("0.00")
    )
    p_refunds = (
        await db.scalar(
            select(func.coalesce(func.sum(Payment.refund_amount), Decimal("0.00"))).where(
                Payment.refunded_at.is_not(None)
            )
        )
        or Decimal("0.00")
    )
    p_net_collected = p_gross_captured - p_refunds
    p_pending = await db.scalar(select(func.count(Payment.id)).where(Payment.status == PaymentStatus.PENDING)) or 0
    p_failed = await db.scalar(select(func.count(Payment.id)).where(Payment.status == PaymentStatus.FAILED)) or 0

    # Reviews
    r_total = await db.scalar(select(func.count(Review.id))) or 0
    r_visible = await db.scalar(select(func.count(Review.id)).where(Review.is_visible.is_(True))) or 0
    r_hidden = await db.scalar(select(func.count(Review.id)).where(Review.is_visible.is_(False))) or 0
    r_avg = await db.scalar(select(func.avg(Review.rating)).where(Review.is_visible.is_(True))) or 0.0

    # Complaints
    c_open = await db.scalar(select(func.count(Complaint.id)).where(Complaint.status == ComplaintStatus.OPEN)) or 0
    c_in_review = await db.scalar(select(func.count(Complaint.id)).where(Complaint.status == ComplaintStatus.IN_REVIEW)) or 0
    c_resolved = await db.scalar(select(func.count(Complaint.id)).where(Complaint.status == ComplaintStatus.RESOLVED)) or 0
    c_rejected = await db.scalar(select(func.count(Complaint.id)).where(Complaint.status == ComplaintStatus.REJECTED)) or 0

    return {
        "users": {"total": users_total, "active": users_active, "customers": users_customers, "providers": users_providers},
        "services": {"total": services_total, "active": services_active},
        "bookings": {"total": bookings_total, "pending": b_pending, "confirmed": b_confirmed, "completed": b_completed, "cancelled": b_cancelled, "no_show": b_no_show},
        "payments": {
            "gross_captured": p_gross_captured,
            "refunds": p_refunds,
            "net_collected": p_net_collected,
            "pending_count": p_pending,
            "failed_count": p_failed,
        },
        "reviews": {"total": r_total, "visible": r_visible, "hidden": r_hidden, "average_rating": round(float(r_avg), 2)},
        "complaints": {"open": c_open, "in_review": c_in_review, "resolved": c_resolved, "rejected": c_rejected},
    }

def _utc_range(date_from: date | None, date_to: date | None) -> tuple[datetime | None, datetime | None]:
    start_dt = datetime.combine(date_from, time.min).replace(tzinfo=timezone.utc) if date_from else None
    end_dt = datetime.combine(date_to + timedelta(days=1), time.min).replace(tzinfo=timezone.utc) if date_to else None
    return start_dt, end_dt

def _apply_dates(stmt, col, date_from: date | None, date_to: date | None):
    start_dt, end_dt = _utc_range(date_from, date_to)
    if start_dt is not None:
        stmt = stmt.where(col >= start_dt)
    if end_dt is not None:
        stmt = stmt.where(col < end_dt)
    return stmt

async def get_user_report(db: AsyncSession, date_from: date | None = None, date_to: date | None = None) -> dict[str, Any]:
    stmt = select(func.date(User.created_at).label("d"), func.count(User.id))
    stmt = _apply_dates(stmt, User.created_at, date_from, date_to)
    stmt = stmt.group_by("d").order_by("d")
    daily_res = await db.execute(stmt)
    new_users_per_day = [{"date": str(d), "count": c} for d, c in daily_res.all() if d]

    stmt_role = select(User.role, func.count(User.id))
    stmt_role = _apply_dates(stmt_role, User.created_at, date_from, date_to)
    stmt_role = stmt_role.group_by(User.role)
    role_res = await db.execute(stmt_role)
    by_role = {str(r.value if hasattr(r, 'value') else r): c for r, c in role_res.all()}

    return {"new_users_per_day": new_users_per_day, "by_role": by_role}

async def get_provider_report(db: AsyncSession, date_from: date | None = None, date_to: date | None = None) -> dict[str, Any]:
    stmt_status = select(Provider.status, func.count(Provider.id))
    stmt_status = _apply_dates(stmt_status, Provider.created_at, date_from, date_to)
    stmt_status = stmt_status.group_by(Provider.status)
    status_res = await db.execute(stmt_status)
    by_status = [{"status": str(s.value if hasattr(s, 'value') else s), "count": c} for s, c in status_res.all()]

    stmt_top_b = select(Booking.provider_id, func.count(Booking.id).label("cnt"))
    stmt_top_b = stmt_top_b.where(Booking.status == BookingStatus.COMPLETED)
    stmt_top_b = _apply_dates(stmt_top_b, Booking.start_at, date_from, date_to)
    stmt_top_b = stmt_top_b.group_by(Booking.provider_id).order_by(desc("cnt")).limit(10)
    top_b_res = await db.execute(stmt_top_b)
    top_by_bookings = [{"provider_id": str(p), "completed_bookings": c} for p, c in top_b_res.all()]

    # Top providers by revenue: rank by net_collected within the range (gross by paid_at minus refunds by refunded_at), joined via bookings.provider_id
    stmt_prov_gross = (
        select(Booking.provider_id, func.sum(Payment.amount).label("gross"))
        .join(Payment, Payment.booking_id == Booking.id)
        .where(Payment.paid_at.is_not(None))
    )
    stmt_prov_gross = _apply_dates(stmt_prov_gross, Payment.paid_at, date_from, date_to)
    stmt_prov_gross = stmt_prov_gross.group_by(Booking.provider_id)
    gross_rows = (await db.execute(stmt_prov_gross)).all()
    prov_gross = {p: g or Decimal("0.00") for p, g in gross_rows}

    stmt_prov_ref = (
        select(Booking.provider_id, func.sum(Payment.refund_amount).label("refunds"))
        .join(Payment, Payment.booking_id == Booking.id)
        .where(Payment.refunded_at.is_not(None))
    )
    stmt_prov_ref = _apply_dates(stmt_prov_ref, Payment.refunded_at, date_from, date_to)
    stmt_prov_ref = stmt_prov_ref.group_by(Booking.provider_id)
    ref_rows = (await db.execute(stmt_prov_ref)).all()
    prov_ref = {p: r or Decimal("0.00") for p, r in ref_rows}

    all_provs = set(prov_gross.keys()) | set(prov_ref.keys())
    zero = Decimal("0.00")
    ranked = []
    for p in all_provs:
        g = prov_gross.get(p, zero)
        r = prov_ref.get(p, zero)
        ranked.append((p, g - r, g, r))
    ranked.sort(key=lambda x: x[1], reverse=True)
    top_by_revenue = [
        {
            "provider_id": str(p),
            "net_collected": net,
            "gross_captured": g,
            "refunds": r,
            "paid_revenue": net,
        }
        for p, net, g, r in ranked[:10]
    ]

    return {"by_status": by_status, "top_by_bookings": top_by_bookings, "top_by_revenue": top_by_revenue}

async def get_service_report(db: AsyncSession, date_from: date | None = None, date_to: date | None = None) -> dict[str, Any]:
    stmt_cat = select(Service.category_id, func.count(Service.id))
    stmt_cat = _apply_dates(stmt_cat, Service.created_at, date_from, date_to)
    stmt_cat = stmt_cat.group_by(Service.category_id)
    cat_res = await db.execute(stmt_cat)
    by_category = [{"category_id": str(c), "count": cnt} for c, cnt in cat_res.all()]

    stmt_act = select(Service.is_active, func.count(Service.id))
    stmt_act = _apply_dates(stmt_act, Service.created_at, date_from, date_to)
    stmt_act = stmt_act.group_by(Service.is_active)
    act_res = await db.execute(stmt_act)
    active_inactive = [{"is_active": a, "count": c} for a, c in act_res.all()]

    stmt_most = select(Booking.service_id, func.count(Booking.id).label("cnt"))
    stmt_most = _apply_dates(stmt_most, Booking.start_at, date_from, date_to)
    stmt_most = stmt_most.group_by(Booking.service_id).order_by(desc("cnt")).limit(10)
    most_res = await db.execute(stmt_most)
    most_booked = [{"service_id": str(s), "count": c} for s, c in most_res.all()]

    return {"by_category": by_category, "active_inactive": active_inactive, "most_booked": most_booked}

async def get_booking_report(db: AsyncSession, date_from: date | None = None, date_to: date | None = None) -> dict[str, Any]:
    stmt_stat = select(Booking.status, func.count(Booking.id))
    stmt_stat = _apply_dates(stmt_stat, Booking.start_at, date_from, date_to)
    stmt_stat = stmt_stat.group_by(Booking.status)
    stat_res = await db.execute(stmt_stat)
    by_status = {str(s.value if hasattr(s, 'value') else s): c for s, c in stat_res.all()}

    stmt_day = select(func.date(Booking.start_at).label("d"), func.count(Booking.id))
    stmt_day = _apply_dates(stmt_day, Booking.start_at, date_from, date_to)
    stmt_day = stmt_day.group_by("d").order_by("d")
    day_res = await db.execute(stmt_day)
    per_day = [{"date": str(d), "count": c} for d, c in day_res.all() if d]

    stmt_cancel = select(func.count(Booking.id))
    stmt_cancel = stmt_cancel.where(Booking.status == BookingStatus.CANCELLED)
    stmt_cancel = _apply_dates(stmt_cancel, Booking.start_at, date_from, date_to)
    cancellation_count = await db.scalar(stmt_cancel) or 0

    return {"by_status": by_status, "per_day": per_day, "cancellation_count": cancellation_count}

async def get_revenue_report(db: AsyncSession, date_from: date | None = None, date_to: date | None = None) -> dict[str, Any]:
    stmt_gross = (
        select(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
        .where(Payment.paid_at.is_not(None))
    )
    stmt_gross = _apply_dates(stmt_gross, Payment.paid_at, date_from, date_to)
    gross_captured = await db.scalar(stmt_gross) or Decimal("0.00")

    stmt_ref = (
        select(func.coalesce(func.sum(Payment.refund_amount), Decimal("0.00")))
        .where(Payment.refunded_at.is_not(None))
    )
    stmt_ref = _apply_dates(stmt_ref, Payment.refunded_at, date_from, date_to)
    refunds = await db.scalar(stmt_ref) or Decimal("0.00")

    net_collected = gross_captured - refunds

    stmt_stat = select(Payment.status, func.count(Payment.id))
    stmt_stat = _apply_dates(stmt_stat, Payment.created_at, date_from, date_to)
    stmt_stat = stmt_stat.group_by(Payment.status)
    stat_res = await db.execute(stmt_stat)
    count_by_status = {str(s.value if hasattr(s, 'value') else s): c for s, c in stat_res.all()}

    stmt_day_gross = (
        select(func.date(func.timezone("UTC", Payment.paid_at)).label("d"), func.sum(Payment.amount))
        .where(Payment.paid_at.is_not(None))
    )
    stmt_day_gross = _apply_dates(stmt_day_gross, Payment.paid_at, date_from, date_to)
    stmt_day_gross = stmt_day_gross.group_by("d").order_by("d")
    day_gross_res = await db.execute(stmt_day_gross)
    daily_gross = {str(d): g or Decimal("0.00") for d, g in day_gross_res.all() if d}

    stmt_day_ref = (
        select(func.date(func.timezone("UTC", Payment.refunded_at)).label("d"), func.sum(Payment.refund_amount))
        .where(Payment.refunded_at.is_not(None))
    )
    stmt_day_ref = _apply_dates(stmt_day_ref, Payment.refunded_at, date_from, date_to)
    stmt_day_ref = stmt_day_ref.group_by("d").order_by("d")
    day_ref_res = await db.execute(stmt_day_ref)
    daily_ref = {str(d): r or Decimal("0.00") for d, r in day_ref_res.all() if d}

    all_days = sorted(set(daily_gross.keys()) | set(daily_ref.keys()))
    zero = Decimal("0.00")
    per_day = [
        {
            "date": str(d),
            "gross_captured": daily_gross.get(d, zero),
            "refunds": daily_ref.get(d, zero),
            "net_collected": daily_gross.get(d, zero) - daily_ref.get(d, zero),
        }
        for d in all_days
    ]

    return {
        "gross_captured": gross_captured,
        "refunds": refunds,
        "net_collected": net_collected,
        "count_by_status": count_by_status,
        "per_day": per_day,
    }

async def get_review_report(db: AsyncSession, date_from: date | None = None, date_to: date | None = None) -> dict[str, Any]:
    stmt_tot = select(func.count(Review.id))
    stmt_tot = _apply_dates(stmt_tot, Review.created_at, date_from, date_to)
    count = await db.scalar(stmt_tot) or 0

    stmt_avg = select(func.avg(Review.rating)).where(Review.is_visible.is_(True))
    stmt_avg = _apply_dates(stmt_avg, Review.created_at, date_from, date_to)
    average = await db.scalar(stmt_avg) or 0.0

    stmt_bd = select(Review.rating, func.count(Review.id)).where(Review.is_visible.is_(True))
    stmt_bd = _apply_dates(stmt_bd, Review.created_at, date_from, date_to)
    stmt_bd = stmt_bd.group_by(Review.rating)
    bd_res = await db.execute(stmt_bd)
    breakdown = {str(i): 0 for i in range(1, 6)}
    for r, c in bd_res.all():
        breakdown[str(r)] = c

    stmt_hid = select(func.count(Review.id)).where(Review.is_visible.is_(False))
    stmt_hid = _apply_dates(stmt_hid, Review.created_at, date_from, date_to)
    hidden_count = await db.scalar(stmt_hid) or 0

    stmt_day = select(func.date(Review.created_at).label("d"), func.count(Review.id))
    stmt_day = _apply_dates(stmt_day, Review.created_at, date_from, date_to)
    stmt_day = stmt_day.group_by("d").order_by("d")
    day_res = await db.execute(stmt_day)
    per_day = [{"date": str(d), "count": c} for d, c in day_res.all() if d]

    return {"count": count, "average": round(float(average), 2), "breakdown": breakdown, "hidden_count": hidden_count, "per_day": per_day}

async def get_complaint_report(db: AsyncSession, date_from: date | None = None, date_to: date | None = None) -> dict[str, Any]:
    stmt_stat = select(Complaint.status, func.count(Complaint.id))
    stmt_stat = _apply_dates(stmt_stat, Complaint.created_at, date_from, date_to)
    stmt_stat = stmt_stat.group_by(Complaint.status)
    stat_res = await db.execute(stmt_stat)
    by_status = {str(s.value if hasattr(s, 'value') else s): c for s, c in stat_res.all()}

    stmt_typ = select(Complaint.complaint_type, func.count(Complaint.id))
    stmt_typ = _apply_dates(stmt_typ, Complaint.created_at, date_from, date_to)
    stmt_typ = stmt_typ.group_by(Complaint.complaint_type)
    typ_res = await db.execute(stmt_typ)
    by_type = {str(t.value if hasattr(t, 'value') else t): c for t, c in typ_res.all()}

    stmt_day = select(func.date(Complaint.created_at).label("d"), func.count(Complaint.id))
    stmt_day = _apply_dates(stmt_day, Complaint.created_at, date_from, date_to)
    stmt_day = stmt_day.group_by("d").order_by("d")
    day_res = await db.execute(stmt_day)
    per_day = [{"date": str(d), "count": c} for d, c in day_res.all() if d]

    return {"by_status": by_status, "by_type": by_type, "per_day": per_day}
