import { apiClient } from "@/utils/api_client";
import type {
  Booking,
  Page,
  Payment,
  ProviderCustomer,
  PublicProvider,
  PublicService,
  Slot,
} from "@/types/booking";

export const bookingApi = {
  providers: (q = "") =>
    apiClient.get<Page<PublicProvider>>(
      `/api/providers?page=1&page_size=100${q ? `&q=${encodeURIComponent(q)}` : ""}`,
    ),
  services: (providerId?: string, q = "") =>
    apiClient.get<Page<PublicService>>(
      `/api/services?page=1&page_size=100${providerId ? `&provider_id=${encodeURIComponent(providerId)}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
    ),
  slots: (providerId: string, serviceId: string, fromDate: string, toDate: string) =>
    apiClient.get<Slot[]>(
      `/api/bookings/available-slots?provider_id=${encodeURIComponent(providerId)}&service_id=${encodeURIComponent(serviceId)}&from_date=${fromDate}&to_date=${toDate}`,
    ),
  create: (providerId: string, serviceId: string, startAt: string, notes?: string) =>
    apiClient.post<Booking>("/api/bookings", {
      provider_id: providerId,
      service_id: serviceId,
      start_at: startAt,
      notes,
    }),
  mine: (page = 1, pageSize = 12) =>
    apiClient.get<Page<Booking>>(`/api/bookings?page=${page}&page_size=${pageSize}`),
  providerBookings: (fromAt: string, toAt: string) =>
    apiClient.get<Page<Booking>>(
      `/api/bookings/provider?from_at=${encodeURIComponent(fromAt)}&to_at=${encodeURIComponent(toAt)}&page_size=100`,
    ),
  calendar: (fromAt: string, toAt: string) =>
    apiClient.get<Booking[]>(
      `/api/bookings/calendar?from_at=${encodeURIComponent(fromAt)}&to_at=${encodeURIComponent(toAt)}`,
    ),
  cancel: (id: string, reason?: string) =>
    apiClient.put<Booking>(`/api/bookings/${id}/cancel`, { reason }),
  reschedule: (id: string, startAt: string) =>
    apiClient.put<Booking>(`/api/bookings/${id}/reschedule`, { start_at: startAt }),
  confirm: (id: string) => apiClient.put<Booking>(`/api/bookings/${id}/confirm`),
  complete: (id: string) => apiClient.put<Booking>(`/api/bookings/${id}/complete`),
  noShow: (id: string) => apiClient.put<Booking>(`/api/bookings/${id}/no-show`),
  payment: (bookingId: string) =>
    apiClient.post<Payment>("/api/payments", {
      booking_id: bookingId,
      payment_method: "MOCK_CARD",
    }),
  mockPay: (paymentId: string) =>
    apiClient.post<Payment>(`/api/payments/${paymentId}/mock-success`),
  retryPayment: (paymentId: string) =>
    apiClient.post<Payment>(`/api/payments/${paymentId}/retry`, {
      payment_method: "MOCK_CARD",
    }),
  earnings: (fromAt?: string, toAt?: string) =>
    apiClient.get<Record<string, string | number>>(
      `/api/providers/earnings${fromAt && toAt ? `?from_at=${encodeURIComponent(fromAt)}&to_at=${encodeURIComponent(toAt)}` : ""}`,
    ),
  customers: () => apiClient.get<ProviderCustomer[]>("/api/providers/customers"),
};
