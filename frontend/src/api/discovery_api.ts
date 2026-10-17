
import { apiClient } from "@/utils/api_client";
import type { PaginatedData } from "@/types/api";
import type { Category } from "@/types/category";

export type DiscoveryServiceType =
  | "ON_SITE"
  | "AT_PROVIDER"
  | "ONLINE";

export interface DiscoveryService {
  id: string;
  provider_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: string;
  duration_minutes: number;
  service_type: DiscoveryServiceType;
  location: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  provider?: {
    id: string;
    business_name: string;
    city: string | null;
    location: string | null;
    profile_image_url: string | null;
  } | null;
}

export interface AvailableSlot {
  start_at: string;
  end_at: string;
  provider_timezone: string;
}

export interface DiscoveryServiceFilters {
  q?: string;
  category_id?: string;
  location?: string;
  min_price?: string | number;
  max_price?: string | number;
  service_type?: DiscoveryServiceType;
  page?: number;
  page_size?: number;
}

export const discoveryApi = {
  listServices(
    filters: DiscoveryServiceFilters = {},
  ): Promise<PaginatedData<DiscoveryService>> {
    const params = new URLSearchParams();

    if (filters.q) params.set("q", filters.q);
    if (filters.category_id) {
      params.set("category_id", filters.category_id);
    }
    if (filters.location) params.set("location", filters.location);

    if (
      filters.min_price !== undefined &&
      filters.min_price !== ""
    ) {
      params.set("min_price", String(filters.min_price));
    }

    if (
      filters.max_price !== undefined &&
      filters.max_price !== ""
    ) {
      params.set("max_price", String(filters.max_price));
    }

    if (filters.service_type) {
      params.set("service_type", filters.service_type);
    }

    params.set("page", String(filters.page ?? 1));
    params.set("page_size", String(filters.page_size ?? 12));

    return apiClient.get<PaginatedData<DiscoveryService>>(
      `/api/services?${params.toString()}`,
    );
  },

  listCategories(): Promise<Category[]> {
    return apiClient.get<Category[]>("/api/categories");
  },

  getAvailableSlots(
    providerId: string,
    serviceId: string,
    date: string,
  ): Promise<AvailableSlot[]> {
    const params = new URLSearchParams({
      provider_id: providerId,
      service_id: serviceId,
      from_date: date,
      to_date: date,
    });

    return apiClient.get<AvailableSlot[]>(
      `/api/bookings/available-slots?${params.toString()}`,
    );
  },
};
