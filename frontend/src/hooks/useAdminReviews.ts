import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { adminReviewApi } from "@/api/admin_review_api";
import type { ReviewListParams } from "@/types/review";

export const ADMIN_REVIEWS_KEY = ["admin", "reviews"] as const;

export function useAdminReviews(params: ReviewListParams) {
  return useQuery({
    queryKey: [...ADMIN_REVIEWS_KEY, params],
    queryFn: () => adminReviewApi.listReviews(params),
    placeholderData: keepPreviousData,
  });
}

export function useSetReviewVisibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_visible }: { id: string; is_visible: boolean }) =>
      adminReviewApi.setReviewVisibility(id, is_visible),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_REVIEWS_KEY }),
  });
}
