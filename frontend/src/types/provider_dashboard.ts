import type { DashboardActivity, DashboardAppointment } from "@/types/dashboard";

/** Booking, earnings, customer and rating data. Owned by Sayeel (bookings/payments) and Taha (reviews). */
export interface BookingSummary {
  today_count: number;
  today_remaining: number;
  upcoming_count: number;
  pending_count: number;
  upcoming: DashboardAppointment[];
}

export interface EarningsSummary {
  this_month: number;
  last_month: number;
}

export interface CustomerSummary {
  total: number;
  returning: number;
}

export interface RatingSummary {
  average: number;
  total: number;
  /** Review count per star: keys "1" to "5". */
  breakdown: Record<string, number>;
}

export interface ProviderDashboardExtras {
  bookings: BookingSummary;
  earnings: EarningsSummary;
  customers: CustomerSummary;
  rating: RatingSummary;
  activity: DashboardActivity[];
  is_sample?: boolean;
}

/** One customer review shown to the provider (Taha's review API). */
export interface ProviderReview {
  id: string;
  customer_name: string;
  service_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}
