import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/utils/api_client";
import type { Booking, Page } from "@/types/booking";
import type {
  DashboardActivity,
  DashboardAppointment,
} from "@/types/dashboard";
import type { Status } from "@/components/ui/StatusBadge";

interface CustomerProfile {
  id: string;
  user_id: string;
  preferences: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  user?: {
    full_name?: string;
  };
}

interface CustomerDashboardExtras {
  is_sample: boolean;
  bookings: {
    upcoming_count: number;
    pending_count: number;
    completed_count: number;
    upcoming: DashboardAppointment[];
  };
  reviews: {
    total_submitted: number;
  };
  notifications: {
    unread_count: number;
  };
  activity: DashboardActivity[];
}

function toAppointment(booking: Booking): DashboardAppointment {
  const start = new Date(booking.start_at);
  const timeZone = booking.provider_timezone || undefined;
  const dateParts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone,
  }).formatToParts(start);

  const day = dateParts.find((part) => part.type === "day")?.value ?? "";
  const month =
    dateParts.find((part) => part.type === "month")?.value.toUpperCase() ?? "";

  return {
    day,
    month,
    time: start.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      timeZone,
    }),
    service: booking.service_name ?? "Service",
    provider: booking.provider_name ?? "Provider",
    status: booking.status.toLowerCase() as Status,
    price: `PKR ${Number(booking.price).toLocaleString()}`,
    paymentStatus: booking.payment_status ?? undefined,
  };
}

function toActivity(booking: Booking): DashboardActivity {
  const statusLabel = booking.status.toLowerCase().replaceAll("_", " ");

  return {
    title: `Booking ${statusLabel}`,
    description: `${booking.service_name ?? "Service"} with ${
      booking.provider_name ?? "provider"
    }`,
    time: new Date(booking.created_at).toLocaleString(),
    type: statusLabel,
  };
}

function emptyDashboardExtras(isSample: boolean): CustomerDashboardExtras {
  return {
    is_sample: isSample,
    bookings: {
      upcoming_count: 0,
      pending_count: 0,
      completed_count: 0,
      upcoming: [],
    },
    reviews: { total_submitted: 0 },
    notifications: { unread_count: 0 },
    activity: [],
  };
}

export function useCustomerProfile() {
  return useQuery({
    queryKey: ["customer", "me"],
    queryFn: () => apiClient.get<CustomerProfile>("/api/customers/me"),
  });
}

export function useCustomerDashboardExtras() {
  return useQuery({
    queryKey: ["customer", "dashboard-extras"],
    queryFn: async (): Promise<CustomerDashboardExtras> => {
      try {
        const page = await apiClient.get<Page<Booking>>("/api/bookings");
        const bookings = Array.isArray(page.items) ? page.items : [];
        const activeStatuses = new Set(["CONFIRMED", "PENDING"]);
        const upcoming = bookings.filter(
          (booking) =>
            activeStatuses.has(booking.status) &&
            new Date(booking.start_at).getTime() >= Date.now()
        );
        const pending = bookings.filter(
          (booking) => booking.status === "PENDING"
        );
        const completed = bookings.filter(
          (booking) => booking.status === "COMPLETED"
        );

        return {
          is_sample: false,
          bookings: {
            upcoming_count: upcoming.length,
            pending_count: pending.length,
            completed_count: completed.length,
            upcoming: upcoming.slice(0, 5).map(toAppointment),
          },
          reviews: { total_submitted: 0 },
          notifications: { unread_count: 0 },
          activity: bookings.slice(0, 5).map(toActivity),
        };
      } catch {
        return emptyDashboardExtras(true);
      }
    },
  });
}