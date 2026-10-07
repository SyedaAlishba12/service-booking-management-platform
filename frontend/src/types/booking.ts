export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

export interface Booking {
  id: string;
  customer_id: string;
  provider_id: string;
  service_id: string;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  price: string | number;
  notes?: string | null;
  hold_expires_at?: string | null;
  service_name?: string | null;
  provider_name?: string | null;
  customer_name?: string | null;
}

export interface ProviderCustomer {
  customer_id: string;
  customer_name: string;
  booking_count: number;
  last_booking_at: string | null;
}

export interface Slot {
  start_at: string;
  end_at: string;
  provider_timezone: string;
}

export interface Page<T> {
  items: T[];
  meta: { page: number; page_size: number; total: number; total_pages: number };
}

export interface Payment {
  id: string;
  booking_id: string;
  amount: string | number;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
}
