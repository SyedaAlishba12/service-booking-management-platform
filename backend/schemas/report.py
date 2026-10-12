from decimal import Decimal
from pydantic import BaseModel, Field, field_serializer

class UsersStats(BaseModel):
    total: int
    active: int
    customers: int
    providers: int

class ServicesStats(BaseModel):
    total: int
    active: int

class BookingsStats(BaseModel):
    total: int
    pending: int
    confirmed: int
    completed: int
    cancelled: int
    no_show: int

class PaymentsStats(BaseModel):
    """
    gross_captured sums amount where paid_at IS NOT NULL.
    refunds sums refund_amount where refunded_at IS NOT NULL.
    net_collected is gross_captured - refunds.
    """
    gross_captured: Decimal
    refunds: Decimal
    net_collected: Decimal
    pending_count: int
    failed_count: int

    @field_serializer("gross_captured", "refunds", "net_collected")
    def serialize_decimal(self, v: Decimal) -> str:
        return str(v)

class ReviewsStats(BaseModel):
    total: int
    visible: int
    hidden: int
    average_rating: float

class ComplaintsStats(BaseModel):
    open: int
    in_review: int
    resolved: int
    rejected: int

class DashboardStatsResponse(BaseModel):
    users: UsersStats
    services: ServicesStats
    bookings: BookingsStats
    payments: PaymentsStats
    reviews: ReviewsStats
    complaints: ComplaintsStats

class DailyUserCount(BaseModel):
    date: str
    count: int

class UserReportResponse(BaseModel):
    new_users_per_day: list[DailyUserCount]
    by_role: dict[str, int]

class ProviderStatusCount(BaseModel):
    status: str
    count: int

class TopProviderBookings(BaseModel):
    provider_id: str
    completed_bookings: int

class TopProviderRevenue(BaseModel):
    """
    net_collected ranks providers by gross_captured minus refunds within the range.
    """
    provider_id: str
    net_collected: Decimal
    gross_captured: Decimal = Decimal("0.00")
    refunds: Decimal = Decimal("0.00")
    paid_revenue: Decimal | None = None

    @field_serializer("net_collected", "gross_captured", "refunds", "paid_revenue", when_used="always")
    def serialize_decimal(self, v: Decimal | None) -> str | None:
        return str(v) if v is not None else None

class ProviderReportResponse(BaseModel):
    by_status: list[ProviderStatusCount]
    top_by_bookings: list[TopProviderBookings]
    top_by_revenue: list[TopProviderRevenue]

class ServiceCategoryCount(BaseModel):
    category_id: str
    count: int

class ServiceActiveCount(BaseModel):
    is_active: bool
    count: int

class MostBookedService(BaseModel):
    service_id: str
    count: int

class ServiceReportResponse(BaseModel):
    by_category: list[ServiceCategoryCount]
    active_inactive: list[ServiceActiveCount]
    most_booked: list[MostBookedService]

class DailyBookingCount(BaseModel):
    date: str
    count: int

class BookingReportResponse(BaseModel):
    by_status: dict[str, int]
    per_day: list[DailyBookingCount]
    cancellation_count: int

class DailyRevenue(BaseModel):
    """
    Daily breakdown covering the union of days with either activity (missing side = 0).
    """
    date: str
    gross_captured: Decimal
    refunds: Decimal
    net_collected: Decimal

    @field_serializer("gross_captured", "refunds", "net_collected")
    def serialize_decimal(self, v: Decimal) -> str:
        return str(v)

class RevenueReportResponse(BaseModel):
    """
    gross_captured sums amount where paid_at IS NOT NULL in range.
    refunds sums refund_amount where refunded_at IS NOT NULL in range.
    net_collected is gross_captured - refunds.
    """
    gross_captured: Decimal
    refunds: Decimal
    net_collected: Decimal
    count_by_status: dict[str, int]
    per_day: list[DailyRevenue]

    @field_serializer("gross_captured", "refunds", "net_collected")
    def serialize_decimal(self, v: Decimal) -> str:
        return str(v)

class DailyReviewCount(BaseModel):
    date: str
    count: int

class ReviewReportResponse(BaseModel):
    count: int
    average: float
    breakdown: dict[str, int]
    hidden_count: int
    per_day: list[DailyReviewCount]

class DailyComplaintCount(BaseModel):
    date: str
    count: int

class ComplaintReportResponse(BaseModel):
    by_status: dict[str, int]
    by_type: dict[str, int]
    per_day: list[DailyComplaintCount]
