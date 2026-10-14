import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { platformSettingApi } from "@/api/platform_setting_api";
import type { SettingUpdatePayload } from "@/types/platform_setting";

const ADMIN_SETTINGS_KEY = ["admin", "settings"] as const;

export function useAdminSettings() {
  return useQuery({
    queryKey: ADMIN_SETTINGS_KEY,
    queryFn: platformSettingApi.listSettings,
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, payload }: { key: string; payload: SettingUpdatePayload }) =>
      platformSettingApi.updateSetting(key, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_KEY }),
  });
}
