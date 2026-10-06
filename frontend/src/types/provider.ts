export type ServiceType = "ON_SITE" | "AT_PROVIDER" | "ONLINE";

export interface ProviderService {
  id: string;
  provider_id: string;
  category_id: string;
  name: string;
  description: string | null;
  /** The API sends price as a string, e.g. "1500.00". */
  price: string;
  duration_minutes: number;
  service_type: ServiceType;
  location: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServicePayload {
  category_id: string;
  name: string;
  description?: string | null;
  price: string;
  duration_minutes: number;
  service_type: ServiceType;
  location?: string | null;
}

export interface CategoryOption {
  id: string;
  name: string;
}

export type ProviderStatus = "PENDING" | "APPROVED" | "SUSPENDED";

export interface Provider {
  id: string;
  user_id: string;
  business_name: string;
  description: string | null;
  profile_image_url: string | null;
  location: string;
  city: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  timezone: string;
  slot_interval_minutes: number;
  buffer_minutes: number;
  status: ProviderStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderPayload {
  business_name: string;
  description: string | null;
  location: string;
  city: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  timezone: string;
  slot_interval_minutes: number;
  buffer_minutes: number;
}

/** day_of_week: 0 = Monday ... 6 = Sunday. Times are "HH:MM:SS" in the provider's timezone. */
export interface AvailabilityRow {
  id: string;
  provider_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_break: boolean;
}

export interface AvailabilityPayload {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_break: boolean;
}

export interface AvailabilityException {
  id: string;
  provider_id: string;
  exception_date: string; // YYYY-MM-DD
  is_day_off: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

export interface ExceptionPayload {
  exception_date: string;
  is_day_off: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

export interface ProviderAvailability {
  provider_id: string;
  timezone: string;
  slot_interval_minutes: number;
  buffer_minutes: number;
  weekly: AvailabilityRow[];
  exceptions: AvailabilityException[];
}
