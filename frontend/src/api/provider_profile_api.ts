/** Provider profile + availability API calls (shared apiClient, mock mode like provider_api). */
import type {
  AvailabilityException,
  AvailabilityPayload,
  AvailabilityRow,
  ExceptionPayload,
  Provider,
  ProviderAvailability,
  ProviderPayload,
} from "@/types/provider";
import { ApiError, apiClient } from "@/utils/api_client";
import { USE_MOCK, debugHeaders, delay } from "./provider_api";

// ---------------- mock data (in memory, resets on refresh) ----------------
let mockProvider: Provider = {
  id: "prov-1",
  user_id: "user-1",
  business_name: "Glow Salon",
  description: "Hair, skin and beauty services in the heart of Clifton.",
  profile_image_url: null,
  location: "Clifton, Karachi",
  city: "Karachi",
  contact_phone: "+92 300 1234567",
  contact_email: "hello@glowsalon.pk",
  timezone: "Asia/Karachi",
  slot_interval_minutes: 30,
  buffer_minutes: 10,
  status: "APPROVED",
  is_active: true,
  created_at: "2026-10-01T09:00:00Z",
  updated_at: "2026-10-01T09:00:00Z",
};

let mockWeekly: AvailabilityRow[] = [0, 1, 2, 3, 4].flatMap((day) => [
  { id: `w-${day}-a`, provider_id: "prov-1", day_of_week: day, start_time: "09:00:00", end_time: "17:00:00", is_break: false },
  { id: `w-${day}-b`, provider_id: "prov-1", day_of_week: day, start_time: "13:00:00", end_time: "14:00:00", is_break: true },
]);

let mockExceptions: AvailabilityException[] = [
  { id: "e-1", provider_id: "prov-1", exception_date: "2026-12-25", is_day_off: true, start_time: null, end_time: null, reason: "Holiday" },
];

function overlaps(a: { start_time: string; end_time: string }, b: { start_time: string; end_time: string }) {
  return a.start_time.slice(0, 5) < b.end_time.slice(0, 5) && a.end_time.slice(0, 5) > b.start_time.slice(0, 5);
}

// ---------------- API ----------------
export const providerProfileApi = {
  getMyProvider(): Promise<Provider> {
    if (USE_MOCK) return delay({ ...mockProvider });
    return apiClient.get<Provider>("/api/providers/me", { headers: debugHeaders() });
  },

  saveProvider(payload: ProviderPayload, exists: boolean): Promise<Provider> {
    if (USE_MOCK) {
      mockProvider = { ...mockProvider, ...payload };
      return delay({ ...mockProvider });
    }
    return exists
      ? apiClient.put<Provider>("/api/providers/me", payload, { headers: debugHeaders() })
      : apiClient.post<Provider>("/api/providers", payload, { headers: debugHeaders() });
  },

  getMyAvailability(): Promise<ProviderAvailability> {
    if (USE_MOCK) {
      return delay({
        provider_id: mockProvider.id,
        timezone: mockProvider.timezone,
        slot_interval_minutes: mockProvider.slot_interval_minutes,
        buffer_minutes: mockProvider.buffer_minutes,
        weekly: [...mockWeekly],
        exceptions: [...mockExceptions],
      });
    }
    return apiClient.get<ProviderAvailability>("/api/providers/me/availability", { headers: debugHeaders() });
  },

  async addAvailability(payload: AvailabilityPayload): Promise<AvailabilityRow> {
    if (USE_MOCK) {
      const clash = mockWeekly.some(
        (r) => r.day_of_week === payload.day_of_week && r.is_break === payload.is_break && overlaps(r, payload),
      );
      if (clash) throw new ApiError("This time overlaps an existing entry for that day", 409);
      const row: AvailabilityRow = { id: `w-${Date.now()}`, provider_id: mockProvider.id, ...payload };
      mockWeekly = [...mockWeekly, row];
      return delay(row);
    }
    return apiClient.post<AvailabilityRow>("/api/providers/me/availability", payload, { headers: debugHeaders() });
  },

  async deleteAvailability(id: string): Promise<null> {
    if (USE_MOCK) {
      mockWeekly = mockWeekly.filter((r) => r.id !== id);
      return delay(null);
    }
    return apiClient.delete<null>(`/api/providers/me/availability/${id}`, { headers: debugHeaders() });
  },

  async addException(payload: ExceptionPayload): Promise<AvailabilityException> {
    if (USE_MOCK) {
      if (mockExceptions.some((e) => e.exception_date === payload.exception_date)) {
        throw new ApiError("An exception already exists for this date", 409);
      }
      const row: AvailabilityException = { id: `e-${Date.now()}`, provider_id: mockProvider.id, ...payload };
      mockExceptions = [...mockExceptions, row].sort((a, b) => a.exception_date.localeCompare(b.exception_date));
      return delay(row);
    }
    return apiClient.post<AvailabilityException>("/api/providers/me/availability-exceptions", payload, {
      headers: debugHeaders(),
    });
  },

  async deleteException(id: string): Promise<null> {
    if (USE_MOCK) {
      mockExceptions = mockExceptions.filter((e) => e.id !== id);
      return delay(null);
    }
    return apiClient.delete<null>(`/api/providers/me/availability-exceptions/${id}`, { headers: debugHeaders() });
  },
};
