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
import { delay, USE_MOCK } from "./provider_api";
import { bookingApi } from "@/api/booking_api";
import { providerProfileApi } from "@/api/provider_profile_api";
import { ApiError, apiClient } from "@/utils/api_client";
import type { Booking } from "@/types/booking";
import type { Provider } from "@/types/provider";

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
  is_sample: true,
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

  async getExtras(): Promise<ProviderDashboardExtras> {
    if (USE_MOCK) return delay(SAMPLE);
    let provider: Provider;
    try { provider = await providerProfileApi.getMyProvider(); }
    catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) throw error;
      return { bookings: { today_count: 0, today_remaining: 0, upcoming_count: 0, pending_count: 0, upcoming: [] }, earnings: { this_month: 0, last_month: 0 }, customers: { total: 0, returning: 0 }, rating: { average: 0, total: 0, breakdown: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } }, activity: [], is_sample: false };
    }
    const now = new Date();
    const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const upcomingEnd = new Date(now);
    upcomingEnd.setDate(upcomingEnd.getDate() + 30);
    const [bookingPage, currentEarnings, lastEarnings, customers, rating] = await Promise.all([
      bookingApi.providerBookings(now.toISOString(), upcomingEnd.toISOString()),
      bookingApi.earnings(startThisMonth.toISOString(), startNextMonth.toISOString()),
      bookingApi.earnings(startLastMonth.toISOString(), startThisMonth.toISOString()),
      bookingApi.customers(),
      apiClient.get<{ average_rating: number; total_reviews: number; breakdown: Record<string, number> }>(`/api/providers/${provider.id}/rating`),
    ]);
    const active = bookingPage.items.filter(item => item.status === "PENDING" || item.status === "CONFIRMED");
    const timezone = provider.timezone || "UTC";
    const dayKey = (value: string | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
    const today = dayKey(now);
    const todayBookings = active.filter(item => dayKey(item.start_at) === today);
    const upcoming = active.slice(0, 3).map(item => {
      const starts = new Date(item.start_at);
      const parts = new Intl.DateTimeFormat("en", { timeZone: timezone, day: "2-digit", month: "short" }).formatToParts(starts);
      const part = (type: string) => parts.find(value => value.type === type)?.value ?? "";
      return {
        day: part("day"), month: part("month"), dateLabel: dayKey(item.start_at),
        time: starts.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: timezone }),
        service: item.service_name ?? "Service appointment",
        provider: item.customer_name ?? "Customer",
        status: item.status.toLowerCase() as ProviderDashboardExtras["bookings"]["upcoming"][number]["status"],
        price: `PKR ${Number(item.price).toLocaleString()}`,
        paymentStatus: item.payment_status?.toLowerCase() ?? "unknown",
      };
    });
    const latest = [...bookingPage.items].sort((a: Booking, b: Booking) => b.created_at.localeCompare(a.created_at)).slice(0, 3);
    return {
      bookings: {
        today_count: todayBookings.length,
        today_remaining: todayBookings.filter(item => new Date(item.start_at) > now).length,
        upcoming_count: active.length,
        pending_count: active.filter(item => item.status === "PENDING").length,
        upcoming,
      },
      earnings: { this_month: Number(currentEarnings.net_earnings ?? 0), last_month: Number(lastEarnings.net_earnings ?? 0) },
      customers: { total: customers.length, returning: customers.filter(item => item.booking_count > 1).length },
      rating: { average: rating.average_rating, total: rating.total_reviews, breakdown: rating.breakdown },
      activity: latest.map(item => ({
        title: "Booking update",
        description: `${item.customer_name ?? "A customer"} booked ${item.service_name ?? "a service"} (${item.status.toLowerCase().replace("_", " ")}).`,
        time: new Date(item.created_at).toLocaleString([], { timeZone: timezone }),
        type: "booking",
      })),
      is_sample: false,
    };
  },
};
