"""Read-only admin repository for user management.

All queries here are SELECT-only.  No inserts, updates or commits happen here.
Status changes are delegated to UserService.update_account_status so that
business rules (self-deactivation guard, last-admin guard) are enforced once.
"""
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.booking import Booking
from models.complaint import Complaint
from models.customer import Customer
from models.review import Review
from models.user import User, UserRole


class AdminUserRepository:
    """Thin, read-only query layer for admin user management endpoints."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # List / search
    # ------------------------------------------------------------------

    async def list_users(
        self,
        page: int,
        page_size: int,
        q: str | None = None,
        role: UserRole | None = None,
        is_active: bool | None = None,
    ) -> tuple[list[User], int]:
        """Return a page of users and the total count.

        Filters:
        - *q*: case-insensitive LIKE match on ``full_name`` or ``email``.
          Wildcard characters ``%`` and ``_`` are escaped.
        - *role*: exact ``UserRole`` match.
        - *is_active*: boolean match.

        Ordering: newest first (``created_at DESC``).
        """
        where_clauses = []

        if q is not None and q.strip():
            # Escape SQL wildcard characters so users cannot inject patterns.
            safe = q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            pattern = f"%{safe}%"
            where_clauses.append(
                User.full_name.ilike(pattern) | User.email.ilike(pattern)
            )

        if role is not None:
            where_clauses.append(User.role == role)

        if is_active is not None:
            where_clauses.append(User.is_active.is_(is_active))

        base_stmt = select(User)
        if where_clauses:
            base_stmt = base_stmt.where(and_(*where_clauses))

        # Total count
        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total: int = (await self.db.scalar(count_stmt)) or 0

        # Paginated rows, newest first
        offset = (page - 1) * page_size
        rows_stmt = (
            base_stmt
            .order_by(User.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        result = await self.db.execute(rows_stmt)
        users = list(result.scalars().all())

        return users, total

    # ------------------------------------------------------------------
    # Single user
    # ------------------------------------------------------------------

    async def get_by_id(self, user_id: UUID) -> User | None:
        """Fetch a single user by primary key (read-only)."""
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    # ------------------------------------------------------------------
    # Per-user counts (for detail view)
    # ------------------------------------------------------------------

    async def count_bookings(self, user_id: UUID) -> int:
        """Count bookings where the user is the customer."""
        # Bookings belong to Customer records; join through customers.
        stmt = (
            select(func.count(Booking.id))
            .join(Customer, Booking.customer_id == Customer.id)
            .where(Customer.user_id == user_id)
        )
        return (await self.db.scalar(stmt)) or 0

    async def count_reviews(self, user_id: UUID) -> int:
        """Count reviews authored by the user."""
        stmt = select(func.count(Review.id)).where(
            Review.user_id == user_id
        )
        return (await self.db.scalar(stmt)) or 0

    async def count_complaints(self, user_id: UUID) -> int:
        """Count complaints filed by the user."""
        stmt = select(func.count(Complaint.id)).where(
            Complaint.user_id == user_id
        )
        return (await self.db.scalar(stmt)) or 0

    # ------------------------------------------------------------------
    # Helper: count active admins (for last-admin guard)
    # ------------------------------------------------------------------

    async def count_active_admins(self) -> int:
        """Return the number of currently active ADMIN accounts."""
        stmt = select(func.count(User.id)).where(
            User.role == UserRole.ADMIN,
            User.is_active.is_(True),
        )
        return (await self.db.scalar(stmt)) or 0
