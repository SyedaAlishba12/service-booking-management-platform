import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { adminProviderApi } from "@/api/admin_provider_api";
import type { ProviderListParams } from "@/api/admin_provider_api";
import type { ProviderStatus } from "@/types/provider";

export const ADMIN_PROVIDERS_KEY = ["admin", "providers"] as const;

export function useAdminProviders(params: ProviderListParams) {
  return useQuery({
    queryKey: [...ADMIN_PROVIDERS_KEY, params],
    queryFn: () => adminProviderApi.listProviders(params),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateProviderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { status?: ProviderStatus; is_active?: boolean } }) =>
      adminProviderApi.updateProviderStatus(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_PROVIDERS_KEY }),
  });
}
