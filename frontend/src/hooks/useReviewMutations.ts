import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reviewApi } from "@/api/review_api";
import type { ReviewCreatePayload, ReviewUpdatePayload } from "@/types/review";
import { MY_REVIEWS_KEY } from "./useMyReviews";

export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, requestOptions }: { payload: ReviewCreatePayload; requestOptions?: RequestInit }) =>
      reviewApi.createReview(payload, requestOptions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_REVIEWS_KEY });
      queryClient.invalidateQueries({ queryKey: ["provider"] }); // invalidates both reviews and ratings
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload, requestOptions }: { id: string; payload: ReviewUpdatePayload; requestOptions?: RequestInit }) =>
      reviewApi.updateReview(id, payload, requestOptions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_REVIEWS_KEY });
      queryClient.invalidateQueries({ queryKey: ["provider"] });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, requestOptions }: { id: string; requestOptions?: RequestInit }) =>
      reviewApi.deleteReview(id, requestOptions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_REVIEWS_KEY });
      queryClient.invalidateQueries({ queryKey: ["provider"] });
    },
  });
}
