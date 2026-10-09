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
    paid_total sums the `amount` column for PAID payments.
    refunded_total sums the `refund_amount` column for REFUNDED payments.
    """
    paid_total: Decimal
    refunded_total: Decimal
    pending_count: int
    failed_count: int

    @field_serializer("paid_total", "refunded_total")
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
    paid_revenue sums the `amount` column for PAID payments for this provider.
    """
    provider_id: str
    paid_revenue: Decimal

    @field_serializer("paid_revenue")
    def serialize_decimal(self, v: Decimal) -> str:
        return str(v)

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
    revenue sums the `amount` column for PAID payments on this day.
    """
    date: str
    revenue: Decimal

    @field_serializer("revenue")
    def serialize_decimal(self, v: Decimal) -> str:
        return str(v)

class RevenueReportResponse(BaseModel):
    """
    paid_total sums the `amount` column for PAID payments.
    refunded_total sums the `refund_amount` column for REFUNDED payments.
    """
    paid_total: Decimal
    refunded_total: Decimal
    count_by_status: dict[str, int]
    per_day: list[DailyRevenue]

    @field_serializer("paid_total", "refunded_total")
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
