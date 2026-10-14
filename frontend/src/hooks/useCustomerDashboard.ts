import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/utils/api_client";

export function useCustomerProfile() {
  return useQuery({
    queryKey: ["customer", "me"],
    queryFn: async () => {
      const response: any = await apiClient.get("/api/customers/me");
      return response.data?.data || response.data;
    },
  });
}

export function useCustomerDashboardExtras() {
  return useQuery({
    queryKey: ["customer", "dashboard-extras"],
    queryFn: async () => {
      try {
        const response: any = await apiClient.get("/api/bookings");
        const bookingsData = response.data?.data || response.data || [];
        
        const upcoming = Array.isArray(bookingsData) 
          ? bookingsData.filter((b: any) => b.status === "CONFIRMED" || b.status === "PENDING")
          : [];
        const pending = Array.isArray(bookingsData)
          ? bookingsData.filter((b: any) => b.status === "PENDING")
          : [];
        const completed = Array.isArray(bookingsData)
          ? bookingsData.filter((b: any) => b.status === "COMPLETED")
          : [];

        return {
          is_sample: false,
          bookings: {
            upcoming_count: upcoming.length,
            pending_count: pending.length,
            completed_count: completed.length,
            upcoming: upcoming.slice(0, 5),
          },
          reviews: { total_submitted: 0 },
          notifications: { unread_count: 0 },
          activity: [],
        };
      } catch (err) {
        return {
          is_sample: true,
          bookings: { upcoming_count: 0, pending_count: 0, completed_count: 0, upcoming: [] },
          reviews: { total_submitted: 0 },
          notifications: { unread_count: 0 },
          activity: [],
        };
      }
    },
  });
}