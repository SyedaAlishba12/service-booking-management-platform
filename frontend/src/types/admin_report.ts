export interface DashboardUsersStats {
  total: number;
  active: number;
  customers: number;
  providers: number;
}

export interface DashboardServicesStats {
  total: number;
  active: number;
}

export interface DashboardBookingsStats {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  no_show: number;
}

export interface DashboardPaymentsStats {
  paid_total: string | number;
  refunded_total: string | number;
  pending_count: number;
  failed_count: number;
}

export interface DashboardReviewsStats {
  total: number;
  visible: number;
  hidden: number;
  average_rating: number;
}

export interface DashboardComplaintsStats {
  open: number;
  in_review: number;
  resolved: number;
  rejected: number;
}

export interface DashboardStatsData {
  users: DashboardUsersStats;
  services: DashboardServicesStats;
  bookings: DashboardBookingsStats;
  payments: DashboardPaymentsStats;
  reviews: DashboardReviewsStats;
  complaints: DashboardComplaintsStats;
}

// Users Report
export interface DailyUserCount {
  date: string;
  count: number;
}

export interface UserReportData {
  new_users_per_day: DailyUserCount[];
  by_role: Record<string, number>;
}

// Providers Report
export interface ProviderStatusCount {
  status: string;
  count: number;
}

export interface TopProviderBookings {
  provider_id: string;
  completed_bookings: number;
}

export interface TopProviderRevenue {
  provider_id: string;
  paid_revenue: string | number;
}

export interface ProviderReportData {
  by_status: ProviderStatusCount[];
  top_by_bookings: TopProviderBookings[];
  top_by_revenue: TopProviderRevenue[];
}

// Services Report
export interface ServiceCategoryCount {
  category_id: string;
  count: number;
}

export interface ServiceActiveCount {
  is_active: boolean;
  count: number;
}

export interface MostBookedService {
  service_id: string;
  count: number;
}

export interface ServiceReportData {
  by_category: ServiceCategoryCount[];
  active_inactive: ServiceActiveCount[];
  most_booked: MostBookedService[];
}

// Bookings Report
export interface DailyBookingCount {
  date: string;
  count: number;
}

export interface BookingReportData {
  by_status: Record<string, number>;
  per_day: DailyBookingCount[];
  cancellation_count: number;
}

// Revenue Report
export interface DailyRevenue {
  date: string;
  revenue: string | number;
}

export interface RevenueReportData {
  paid_total: string | number;
  refunded_total: string | number;
  count_by_status: Record<string, number>;
  per_day: DailyRevenue[];
}

// Reviews Report
export interface DailyReviewCount {
  date: string;
  count: number;
}

export interface ReviewReportData {
  count: number;
  average: number;
  breakdown: Record<string, number>;
  hidden_count: number;
  per_day: DailyReviewCount[];
}

// Complaints Report
export interface DailyComplaintCount {
  date: string;
  count: number;
}

export interface ComplaintReportData {
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  per_day: DailyComplaintCount[];
}

export interface ReportQueryParams {
  date_from?: string;
  date_to?: string;
}
