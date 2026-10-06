import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { providerApi } from "@/api/provider_api";
import type { ServicePayload } from "@/types/provider";

const SERVICES_KEY = ["provider", "services"] as const;
const CATEGORIES_KEY = ["categories"] as const;

export function useMyServices() {
  return useQuery({ queryKey: SERVICES_KEY, queryFn: providerApi.listMyServices });
}

export function useCategories() {
  return useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: providerApi.listCategories,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: ServicePayload }) =>
      id ? providerApi.updateService(id, payload) : providerApi.createService(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SERVICES_KEY }),
  });
}

export function useSetServiceActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      providerApi.setServiceActive(id, is_active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SERVICES_KEY }),
  });
}
