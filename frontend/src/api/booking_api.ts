import { apiClient } from "@/utils/api_client";
import type { Booking, Page, Payment, ProviderCustomer, PublicProvider, PublicService, Slot } from "@/types/booking";

function authOptions(): RequestInit {
  const userId = process.env.NEXT_PUBLIC_DEBUG_USER_ID;
  const role = process.env.NEXT_PUBLIC_DEBUG_ROLE;
  return userId && role ? { headers: { "X-Debug-User-Id": userId, "X-Debug-Role": role } } : {};
}

export const bookingApi = {
  providers: (q = "") => apiClient.get<Page<PublicProvider>>(`/api/providers?page=1&page_size=100${q ? `&q=${encodeURIComponent(q)}` : ""}`),
  services: (providerId?: string, q = "") => apiClient.get<Page<PublicService>>(`/api/services?page=1&page_size=100${providerId ? `&provider_id=${providerId}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`),
  slots: (providerId: string, serviceId: string, fromDate: string, toDate: string) =>
    apiClient.get<Slot[]>(`/api/bookings/available-slots?provider_id=${providerId}&service_id=${serviceId}&from_date=${fromDate}&to_date=${toDate}`),
  create: (providerId: string, serviceId: string, startAt: string, notes?: string) =>
    apiClient.post<Booking>("/api/bookings", { provider_id: providerId, service_id: serviceId, start_at: startAt, notes }, authOptions()),
  mine: (page = 1, pageSize = 12) =>
    apiClient.get<Page<Booking>>(`/api/bookings?page=${page}&page_size=${pageSize}`, authOptions()),
  providerBookings: (fromAt: string, toAt: string) =>
    apiClient.get<Page<Booking>>(`/api/bookings/provider?from_at=${encodeURIComponent(fromAt)}&to_at=${encodeURIComponent(toAt)}&page_size=100`, authOptions()),
  calendar: (fromAt: string, toAt: string) =>
    apiClient.get<Booking[]>(`/api/bookings/calendar?from_at=${encodeURIComponent(fromAt)}&to_at=${encodeURIComponent(toAt)}`, authOptions()),
  cancel: (id: string, reason?: string) => apiClient.put<Booking>(`/api/bookings/${id}/cancel`, { reason }, authOptions()),
  reschedule: (id: string, startAt: string) => apiClient.put<Booking>(`/api/bookings/${id}/reschedule`, { start_at: startAt }, authOptions()),
  confirm: (id: string) => apiClient.put<Booking>(`/api/bookings/${id}/confirm`, undefined, authOptions()),
  complete: (id: string) => apiClient.put<Booking>(`/api/bookings/${id}/complete`, undefined, authOptions()),
  noShow: (id: string) => apiClient.put<Booking>(`/api/bookings/${id}/no-show`, undefined, authOptions()),
  payment: (bookingId: string) => apiClient.post<Payment>("/api/payments", { booking_id: bookingId, payment_method: "MOCK_CARD" }, authOptions()),
  mockPay: (paymentId: string) => apiClient.post<Payment>(`/api/payments/${paymentId}/mock-success`, undefined, authOptions()),
  retryPayment: (paymentId: string) => apiClient.post<Payment>(`/api/payments/${paymentId}/retry`, { payment_method: "MOCK_CARD" }, authOptions()),
  earnings: (fromAt?: string, toAt?: string) => apiClient.get<Record<string, string | number>>(`/api/providers/earnings${fromAt && toAt ? `?from_at=${encodeURIComponent(fromAt)}&to_at=${encodeURIComponent(toAt)}` : ""}`, authOptions()),
  customers: () => apiClient.get<ProviderCustomer[]>("/api/providers/customers", authOptions()),
};
