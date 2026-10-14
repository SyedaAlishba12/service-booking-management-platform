from datetime import date, datetime, time, timedelta, timezone
from uuid import UUID

from sqlalchemy import String, and_, cast, func, or_, select
from sqlalchemy.engine import RowMapping
from sqlalchemy.ext.asyncio import AsyncSession

from models.booking import Booking, BookingStatus, Payment
from models.customer import Customer
from models.provider import Provider
from models.service import Service
from models.user import User


class AdminBookingRepository:
    """Read-only joined query layer for admin booking views."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def _date_bounds(
        date_from: date | None, date_to: date | None
    ) -> tuple[datetime | None, datetime | None]:
        start = (
            datetime.combine(date_from, time.min, tzinfo=timezone.utc)
            if date_from is not None
            else None
        )
        end = (
            datetime.combine(
                date_to + timedelta(days=1), time.min, tzinfo=timezone.utc
            )
            if date_to is not None
            else None
        )
        return start, end

    @staticmethod
    def _escaped_search(value: str) -> str:
        return (
            value.strip()
            .replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
        )

    def _from_clause(self):
        return (
            select()
            .select_from(Booking)
            .join(Customer, Booking.customer_id == Customer.id)
            .join(User, Customer.user_id == User.id)
            .join(Provider, Booking.provider_id == Provider.id)
            .join(Service, Booking.service_id == Service.id)
            .outerjoin(Payment, Payment.booking_id == Booking.id)
        )

    def _projection(self):
        return (
            Booking.id.label("id"),
            Booking.status.label("status"),
            Booking.start_at.label("start_at"),
            Booking.end_at.label("end_at"),
            Booking.price.label("price"),
            Booking.customer_id.label("customer_id"),
            User.full_name.label("customer_name"),
            Booking.provider_id.label("provider_id"),
            Provider.business_name.label("provider_business_name"),
            Booking.service_id.label("service_id"),
            Service.name.label("service_name"),
            Payment.status.label("payment_status"),
            Payment.amount.label("payment_amount"),
            Booking.created_at.label("created_at"),
            Booking.updated_at.label("updated_at"),
            Booking.notes.label("notes"),
            Booking.cancellation_reason.label("cancellation_reason"),
            Booking.cancelled_at.label("cancelled_at"),
            Booking.confirmed_at.label("confirmed_at"),
            Booking.completed_at.label("completed_at"),
            Booking.no_show_at.label("no_show_at"),
            Booking.hold_expires_at.label("hold_expires_at"),
            User.email.label("customer_email"),
            Provider.timezone.label("provider_timezone"),
            Payment.id.label("payment_id"),
            Payment.payment_method.label("payment_method"),
            Payment.transaction_reference.label("transaction_reference"),
            Payment.paid_at.label("paid_at"),
            Payment.refunded_at.label("refunded_at"),
            Payment.refund_amount.label("refund_amount"),
            Payment.failure_reason.label("failure_reason"),
        )

    def _filters(
        self,
        status: BookingStatus | None,
        provider_id: UUID | None,
        customer_id: UUID | None,
        service_id: UUID | None,
        date_from: date | None,
        date_to: date | None,
        q: str | None,
    ):
        clauses = []
        if status is not None:
            clauses.append(Booking.status == status)
        if provider_id is not None:
            clauses.append(Booking.provider_id == provider_id)
        if customer_id is not None:
            clauses.append(Booking.customer_id == customer_id)
        if service_id is not None:
            clauses.append(Booking.service_id == service_id)

        start, end = self._date_bounds(date_from, date_to)
        if start is not None:
            clauses.append(Booking.start_at >= start)
        if end is not None:
            clauses.append(Booking.start_at < end)

        if q is not None and q.strip():
            pattern = f"%{self._escaped_search(q)}%"
            clauses.append(
                or_(
                    cast(Booking.id, String).ilike(pattern, escape="\\"),
                    User.full_name.ilike(pattern, escape="\\"),
                    User.email.ilike(pattern, escape="\\"),
                    Provider.business_name.ilike(pattern, escape="\\"),
                    Service.name.ilike(pattern, escape="\\"),
                )
            )
        return clauses

    def _joined_query(self, **filters):
        clauses = self._filters(**filters)
        return self._from_clause().where(and_(*clauses)) if clauses else self._from_clause()

    async def list_bookings(
        self,
        *,
        status: BookingStatus | None,
        provider_id: UUID | None,
        customer_id: UUID | None,
        service_id: UUID | None,
        date_from: date | None,
        date_to: date | None,
        q: str | None,
        page: int,
        page_size: int,
    ) -> tuple[list[RowMapping], int]:
        filters = {
            "status": status,
            "provider_id": provider_id,
            "customer_id": customer_id,
            "service_id": service_id,
            "date_from": date_from,
            "date_to": date_to,
            "q": q,
        }
        base_query = self._joined_query(**filters)
        count_query = base_query.with_only_columns(
            func.count(func.distinct(Booking.id))
        )
        total = await self.db.scalar(count_query) or 0
        query = (
            base_query.with_only_columns(*self._projection())
            .order_by(Booking.created_at.desc(), Booking.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.db.execute(query)
        return list(result.mappings().all()), int(total)

    async def get_booking(self, booking_id: UUID) -> RowMapping | None:
        query = (
            self._from_clause()
            .with_only_columns(*self._projection())
            .where(Booking.id == booking_id)
        )
        result = await self.db.execute(query)
        return result.mappings().one_or_none()
