import { useQuery } from "@tanstack/react-query";
import { reviewApi } from "@/api/review_api";

export const PROVIDER_RATING_KEY = (providerId: string) => ["provider", providerId, "rating"] as const;

export function useProviderRating(providerId: string) {
  return useQuery({
    queryKey: PROVIDER_RATING_KEY(providerId),
    queryFn: () => reviewApi.getProviderRating(providerId),
    enabled: !!providerId,
  });
}
