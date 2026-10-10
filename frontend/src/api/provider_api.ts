/**
 * Provider-side API calls. Uses the shared apiClient (no second client).
 *
 * Mock mode is ON unless NEXT_PUBLIC_USE_MOCK=false, so pages work before the database,
 * auth and categories API are ready. Set it to false in frontend/.env.local to use the backend.
 *
 * Until real auth exists, the backend stub needs two headers (development only):
 *   NEXT_PUBLIC_DEBUG_USER_ID, NEXT_PUBLIC_DEBUG_ROLE=PROVIDER
 */
import type {
  CategoryOption,
  ProviderService,
  ServicePayload,
} from "@/types/provider";
import { apiClient } from "@/utils/api_client";

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

export function debugHeaders(): HeadersInit {
  const id = process.env.NEXT_PUBLIC_DEBUG_USER_ID;
  const role = process.env.NEXT_PUBLIC_DEBUG_ROLE ?? "PROVIDER";
  return id ? { "X-Debug-User-Id": id, "X-Debug-Role": role } : {};
}

// ---------------- mock data (in memory, resets on refresh) ----------------
const MOCK_CATEGORIES: CategoryOption[] = [
  { id: "cat-hair", name: "Hair & Beauty" },
  { id: "cat-home", name: "Home Services" },
  { id: "cat-health", name: "Health & Wellness" },
];

let mockServices: ProviderService[] = [
  {
    id: "svc-1",
    provider_id: "prov-1",
    category_id: "cat-hair",
    name: "Haircut & Styling",
    description: "Wash, cut and blow-dry.",
    price: "1500.00",
    duration_minutes: 45,
    service_type: "AT_PROVIDER",
    location: "Clifton, Karachi",
    is_active: true,
    created_at: "2026-10-01T09:00:00Z",
    updated_at: "2026-10-01T09:00:00Z",
  },
  {
    id: "svc-2",
    provider_id: "prov-1",
    category_id: "cat-health",
    name: "Online Consultation",
    description: null,
    price: "2500.00",
    duration_minutes: 30,
    service_type: "ONLINE",
    location: null,
    is_active: false,
    created_at: "2026-10-02T09:00:00Z",
    updated_at: "2026-10-02T09:00:00Z",
  },
];

export function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), 250));
}

function toService(payload: ServicePayload, id: string): ProviderService {
  const now = new Date().toISOString();
  return {
    id,
    provider_id: "prov-1",
    description: null,
    location: null,
    is_active: true,
    created_at: now,
    updated_at: now,
    ...payload,
    price: Number(payload.price).toFixed(2),
  };
}

// ---------------- API ----------------
export const providerApi = {
  listCategories(): Promise<CategoryOption[]> {
    // Taha's GET /api/categories returns a plain array of active categories (id, name, slug, ...).
    if (USE_MOCK) return delay(MOCK_CATEGORIES);
    return apiClient.get<CategoryOption[]>("/api/categories", {
      headers: debugHeaders(),
    });
  },

  listMyServices(): Promise<ProviderService[]> {
    if (USE_MOCK) return delay([...mockServices]);
    return apiClient.get<ProviderService[]>("/api/services/me", {
      headers: debugHeaders(),
    });
  },

  createService(payload: ServicePayload): Promise<ProviderService> {
    if (USE_MOCK) {
      const created = toService(payload, `svc-${Date.now()}`);
      mockServices = [created, ...mockServices];
      return delay(created);
    }
    return apiClient.post<ProviderService>("/api/services", payload, {
      headers: debugHeaders(),
    });
  },

  updateService(id: string, payload: Partial<ServicePayload>): Promise<ProviderService> {
    if (USE_MOCK) {
      mockServices = mockServices.map((s) =>
        s.id === id
          ? {
              ...s,
              ...payload,
              price:
                payload.price !== undefined
                  ? Number(payload.price).toFixed(2)
                  : s.price,
            }
          : s,
      );
      return delay(mockServices.find((s) => s.id === id) as ProviderService);
    }
    return apiClient.put<ProviderService>(`/api/services/${id}`, payload, {
      headers: debugHeaders(),
    });
  },

  setServiceActive(id: string, is_active: boolean): Promise<ProviderService> {
    if (USE_MOCK) {
      mockServices = mockServices.map((s) =>
        s.id === id ? { ...s, is_active } : s,
      );
      return delay(mockServices.find((s) => s.id === id) as ProviderService);
    }
    return apiClient.put<ProviderService>(
      `/api/services/${id}/status`,
      { is_active },
      { headers: debugHeaders() },
    );
  },
};
