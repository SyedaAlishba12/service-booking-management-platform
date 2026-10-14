import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { adminBookingApi } from "@/api/admin_booking_api";
import type { AdminBookingListParams } from "@/types/admin_booking";

export const ADMIN_BOOKINGS_KEY = ["admin", "bookings"] as const;

export function useAdminBookings(params: AdminBookingListParams) {
  return useQuery({
    queryKey: [...ADMIN_BOOKINGS_KEY, params],
    queryFn: () => adminBookingApi.listBookings(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdminBooking(id: string | null | undefined) {
  return useQuery({
    queryKey: [...ADMIN_BOOKINGS_KEY, "detail", id],
    queryFn: () => {
      if (!id) throw new Error("Booking ID is required");
      return adminBookingApi.getBooking(id);
    },
    enabled: Boolean(id),
  });
}

export const useAdminBookingDetail = useAdminBooking;
