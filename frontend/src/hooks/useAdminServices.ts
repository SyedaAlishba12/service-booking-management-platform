import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { adminServiceApi } from "@/api/admin_service_api";
import type { ServiceListParams } from "@/api/admin_service_api";

export const ADMIN_SERVICES_KEY = ["admin", "services"] as const;

export function useAdminServices(params: ServiceListParams) {
  return useQuery({
    queryKey: [...ADMIN_SERVICES_KEY, params],
    queryFn: () => adminServiceApi.listServices(params),
    placeholderData: keepPreviousData,
  });
}

export function useSetServiceActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      adminServiceApi.setServiceActive(id, is_active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_SERVICES_KEY }),
  });
}
