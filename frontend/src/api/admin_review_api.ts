import { apiClient } from "@/utils/api_client";
import type { PaginatedData } from "@/types/api";
import type { AdminReview, ReviewListParams } from "@/types/review";

export const adminReviewApi = {
  listReviews(params: ReviewListParams): Promise<PaginatedData<AdminReview>> {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.append("page", params.page.toString());
    if (params.page_size !== undefined) query.append("page_size", params.page_size.toString());
    if (params.rating !== undefined) query.append("rating", params.rating.toString());
    if (params.is_visible !== undefined) query.append("is_visible", params.is_visible.toString());

    return apiClient.get<PaginatedData<AdminReview>>(`/api/admin/reviews?${query.toString()}`);
  },
  
  setReviewVisibility(id: string, is_visible: boolean): Promise<AdminReview> {
    return apiClient.put<AdminReview>(`/api/admin/reviews/${id}/visibility`, { is_visible });
  }
};
