import type { BookingStatus } from "./booking";

export type { BookingStatus };
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export interface AdminBookingListItem {
  id: string;
  status: BookingStatus;
  start_at: string;
  end_at: string;
  price: string | number;
  customer_id: string;
  customer_name: string | null;
  provider_id: string;
  provider_business_name: string | null;
  service_id: string;
  service_name: string | null;
  payment_status: PaymentStatus | null;
  payment_amount: string | number | null;
  created_at: string;
  updated_at: string;
}

export interface AdminBookingDetail extends AdminBookingListItem {
  notes?: string | null;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  confirmed_at?: string | null;
  completed_at?: string | null;
  no_show_at?: string | null;
  hold_expires_at?: string | null;
  customer_email?: string | null;
  provider_timezone?: string | null;
  payment_id?: string | null;
  payment_method?: string | null;
  transaction_reference?: string | null;
  paid_at?: string | null;
  refunded_at?: string | null;
  refund_amount?: string | number | null;
  failure_reason?: string | null;
}

export interface AdminBookingListParams {
  page?: number;
  page_size?: number;
  status?: BookingStatus;
  provider_id?: string;
  customer_id?: string;
  service_id?: string;
  date_from?: string;
  date_to?: string;
  q?: string;
}
