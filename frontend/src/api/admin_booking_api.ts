import { apiClient } from "@/utils/api_client";
import type { PaginatedData } from "@/types/api";
import type {
  AdminBookingDetail,
  AdminBookingListItem,
  AdminBookingListParams,
} from "@/types/admin_booking";

export const adminBookingApi = {
  listBookings(params: AdminBookingListParams = {}): Promise<PaginatedData<AdminBookingListItem>> {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.append("page", params.page.toString());
    if (params.page_size !== undefined) query.append("page_size", params.page_size.toString());
    if (params.status !== undefined) query.append("status", params.status);
    if (params.provider_id !== undefined && params.provider_id !== "") query.append("provider_id", params.provider_id);
    if (params.customer_id !== undefined && params.customer_id !== "") query.append("customer_id", params.customer_id);
    if (params.service_id !== undefined && params.service_id !== "") query.append("service_id", params.service_id);
    if (params.date_from !== undefined && params.date_from !== "") query.append("date_from", params.date_from);
    if (params.date_to !== undefined && params.date_to !== "") query.append("date_to", params.date_to);
    if (params.q !== undefined && params.q !== "") query.append("q", params.q);

    const queryString = query.toString();
    return apiClient.get<PaginatedData<AdminBookingListItem>>(
      queryString ? `/api/admin/bookings?${queryString}` : "/api/admin/bookings"
    );
  },

  getBooking(id: string): Promise<AdminBookingDetail> {
    return apiClient.get<AdminBookingDetail>(`/api/admin/bookings/${id}`);
  },
};

export const listBookings = adminBookingApi.listBookings;
export const getBooking = adminBookingApi.getBooking;
