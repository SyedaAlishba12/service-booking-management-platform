import { apiClient } from "@/utils/api_client";
import type { PaginatedData } from "@/types/api";
import type { Review, ProviderRatingSummary, ReviewCreatePayload, ReviewUpdatePayload } from "@/types/review";

// TODO: once the real auth lands, api_client should attach the token and these options will no longer be needed.

export const reviewApi = {
  getProviderRating(providerId: string): Promise<ProviderRatingSummary> {
    return apiClient.get<ProviderRatingSummary>(`/api/providers/${providerId}/rating`);
  },

  listProviderReviews(providerId: string, params: { page?: number; page_size?: number }): Promise<PaginatedData<Review>> {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.append("page", params.page.toString());
    if (params.page_size !== undefined) query.append("page_size", params.page_size.toString());
    return apiClient.get<PaginatedData<Review>>(`/api/providers/${providerId}/reviews?${query.toString()}`);
  },

  listMyReviews(params: { page?: number; page_size?: number }, options?: RequestInit): Promise<PaginatedData<Review>> {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.append("page", params.page.toString());
    if (params.page_size !== undefined) query.append("page_size", params.page_size.toString());
    return apiClient.get<PaginatedData<Review>>(`/api/reviews/me?${query.toString()}`, options);
  },

  createReview(payload: ReviewCreatePayload, options?: RequestInit): Promise<Review> {
    return apiClient.post<Review>(`/api/reviews`, payload, options);
  },

  updateReview(id: string, payload: ReviewUpdatePayload, options?: RequestInit): Promise<Review> {
    return apiClient.put<Review>(`/api/reviews/${id}`, payload, options);
  },

  deleteReview(id: string, options?: RequestInit): Promise<void> {
    return apiClient.delete<void>(`/api/reviews/${id}`, options);
  }
};
