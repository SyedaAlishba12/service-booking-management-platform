import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { reviewApi } from "@/api/review_api";

export const PROVIDER_REVIEWS_KEY = (providerId: string) => ["provider", providerId, "reviews"] as const;

export function useProviderReviews(providerId: string, params: { page?: number; page_size?: number }) {
  return useQuery({
    queryKey: [...PROVIDER_REVIEWS_KEY(providerId), params],
    queryFn: () => reviewApi.listProviderReviews(providerId, params),
    enabled: !!providerId,
    placeholderData: keepPreviousData,
  });
}
