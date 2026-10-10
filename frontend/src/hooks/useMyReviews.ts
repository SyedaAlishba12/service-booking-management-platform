import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { reviewApi } from "@/api/review_api";

export const MY_REVIEWS_KEY = ["my", "reviews"] as const;

export function useMyReviews(params: { page?: number; page_size?: number }, requestOptions?: RequestInit) {
  return useQuery({
    queryKey: [...MY_REVIEWS_KEY, params],
    queryFn: () => reviewApi.listMyReviews(params, requestOptions),
    placeholderData: keepPreviousData,
  });
}
