/**
 * Dashboard data that belongs to OTHER modules.
 *  - Rating and reviews: Taha's review API (real calls when mock mode is off).
 *  - Bookings, earnings, customers, activity: Sayeel's booking/payment APIs, not merged yet,
 *    so these stay sample data. TODO: replace getExtras with real calls.
 *
 * Services and availability summaries are NOT here: they come from my own API hooks.
 */
import type { PaginatedData } from "@/types/api";
import type {
  ProviderDashboardExtras,
  ProviderReview,
  RatingSummary,
} from "@/types/provider_dashboard";
import { apiClient } from "@/utils/api_client";
import { USE_MOCK, delay } from "./provider_api";

interface RawRating {
  provider_id: string;
  average_rating: number;
  total_reviews: number;
  breakdown: Record<string, number>;
}

interface RawReview {
  id: string;
  user_id: string;
  service_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

const SAMPLE_RATING: RatingSummary = {
  average: 4.7,
  total: 36,
  breakdown: { "5": 26, "4": 7, "3": 2, "2": 1, "1": 0 },
};

const SAMPLE: ProviderDashboardExtras = {
  bookings: {
    today_count: 4,
    today_remaining: 2,
    upcoming_count: 11,
    pending_count: 3,
    upcoming: [
      { day: "07", month: "Oct", time: "04:00 PM", service: "Haircut & Styling", provider: "Ali Raza", status: "confirmed", price: "PKR 1,500", paymentStatus: "Paid" },
      { day: "08", month: "Oct", time: "11:30 AM", service: "Online Consultation", provider: "Sara Khan", status: "pending", price: "PKR 2,500", paymentStatus: "Pending" },
      { day: "09", month: "Oct", time: "02:00 PM", service: "Haircut & Styling", provider: "Hira Malik", status: "confirmed", price: "PKR 1,500", paymentStatus: "Paid" },
    ],
  },
  earnings: { this_month: 84500, last_month: 71200 },
  customers: { total: 48, returning: 19 },
  activity: [
    { title: "New booking", description: "Sara Khan booked Online Consultation", time: "2 hours ago", type: "booking" },
    { title: "New review", description: "Ali Raza left a 5-star review", time: "Yesterday", type: "review" },
    { title: "Payment received", description: "PKR 1,500 for Haircut & Styling", time: "Yesterday", type: "payment" },
  ],
};

const SAMPLE_REVIEWS: ProviderReview[] = [
  { id: "r-1", customer_name: "Ali Raza", service_name: "Haircut & Styling", rating: 5, comment: "Great service, very professional and on time.", created_at: "2026-10-05T10:00:00Z" },
  { id: "r-2", customer_name: "Hira Malik", service_name: "Haircut & Styling", rating: 4, comment: "Nice result. The salon was a little busy.", created_at: "2026-10-02T15:30:00Z" },
  { id: "r-3", customer_name: "Sara Khan", service_name: "Online Consultation", rating: 5, comment: null, created_at: "2026-09-28T09:15:00Z" },
];

export const providerDashboardApi = {
  async getRating(providerId: string): Promise<RatingSummary> {
    if (USE_MOCK) return delay(SAMPLE_RATING);
    const raw = await apiClient.get<RawRating>(`/api/providers/${providerId}/rating`);
    return { average: raw.average_rating, total: raw.total_reviews, breakdown: raw.breakdown };
  },

  async getReviews(providerId: string): Promise<ProviderReview[]> {
    if (USE_MOCK) return delay(SAMPLE_REVIEWS);
    const page = await apiClient.get<PaginatedData<RawReview>>(
      `/api/providers/${providerId}/reviews?page=1&page_size=12`,
    );
    // Taha's items have user_id/service_id only (no names yet), so show placeholders.
    return page.items.map((r) => ({
      id: r.id,
      customer_name: "Customer",
      service_name: null,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
    }));
  },

  getExtras(): Promise<ProviderDashboardExtras> {
    return delay(SAMPLE);
  },
};
