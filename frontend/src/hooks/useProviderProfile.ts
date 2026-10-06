import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { providerProfileApi } from "@/api/provider_profile_api";
import type {
  AvailabilityPayload,
  ExceptionPayload,
  ProviderPayload,
} from "@/types/provider";
import { isApiError } from "@/utils/api_error_handler";

const PROVIDER_KEY = ["provider", "me"] as const;
const AVAILABILITY_KEY = ["provider", "availability"] as const;

export function useMyProvider() {
  return useQuery({
    queryKey: PROVIDER_KEY,
    queryFn: providerProfileApi.getMyProvider,
    // A 404 just means "no profile yet": do not retry it.
    retry: (count, error) => !(isApiError(error) && error.status === 404) && count < 1,
  });
}

export function useSaveProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, exists }: { payload: ProviderPayload; exists: boolean }) =>
      providerProfileApi.saveProvider(payload, exists),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROVIDER_KEY });
      queryClient.invalidateQueries({ queryKey: AVAILABILITY_KEY });
    },
  });
}

export function useMyAvailability(enabled: boolean) {
  return useQuery({
    queryKey: AVAILABILITY_KEY,
    queryFn: providerProfileApi.getMyAvailability,
    enabled,
  });
}

function useAvailabilityMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AVAILABILITY_KEY }),
  });
}

export const useAddAvailability = () =>
  useAvailabilityMutation((p: AvailabilityPayload) => providerProfileApi.addAvailability(p));
export const useDeleteAvailability = () =>
  useAvailabilityMutation((id: string) => providerProfileApi.deleteAvailability(id));
export const useAddException = () =>
  useAvailabilityMutation((p: ExceptionPayload) => providerProfileApi.addException(p));
export const useDeleteException = () =>
  useAvailabilityMutation((id: string) => providerProfileApi.deleteException(id));
