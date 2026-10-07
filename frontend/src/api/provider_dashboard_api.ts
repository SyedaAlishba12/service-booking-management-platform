/**
 * Dashboard data that belongs to OTHER modules:
 *  - bookings, earnings, customers: Sayeel's booking/payment APIs
 *  - rating summary: Taha's review API (GET /api/providers/{id}/rating)
 * Those endpoints are not merged yet, so this returns sample data. The dashboard marks these
 * cards "Sample data". TODO: replace with apiClient calls once the endpoints are on develop.
 *
 * Services and availability summaries are NOT mocked here: they come from my own API hooks.
 */
import type { ProviderDashboardExtras, ProviderReview } from "@/types/provider_dashboard";
import { delay } from "./provider_api";

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
  rating: { average: 4.7, total: 36, breakdown: { "5": 26, "4": 7, "3": 2, "2": 1, "1": 0 } },
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
  // TODO: Taha's GET /api/providers/{provider_id}/reviews (paginated) once merged.
  getReviews(): Promise<ProviderReview[]> {
    return delay(SAMPLE_REVIEWS);
  },

  getExtras(): Promise<ProviderDashboardExtras> {
    return delay(SAMPLE);
  },
};
