import { apiClient } from "@/utils/api_client";
import type { PlatformSetting, SettingUpdatePayload } from "@/types/platform_setting";

export const platformSettingApi = {
  listSettings(): Promise<PlatformSetting[]> {
    return apiClient.get<PlatformSetting[]>("/api/admin/settings");
  },

  updateSetting(key: string, payload: SettingUpdatePayload): Promise<PlatformSetting> {
    return apiClient.put<PlatformSetting>(`/api/admin/settings/${key}`, payload);
  },
};
