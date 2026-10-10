import { apiClient } from "@/utils/api_client";
import type { Category, CategoryCreatePayload, CategoryUpdatePayload } from "@/types/category";

export const categoryApi = {
  listCategories(): Promise<Category[]> {
    return apiClient.get<Category[]>("/api/admin/categories");
  },

  createCategory(payload: CategoryCreatePayload): Promise<Category> {
    return apiClient.post<Category>("/api/admin/categories", payload);
  },

  updateCategory(id: string, payload: CategoryUpdatePayload): Promise<Category> {
    return apiClient.put<Category>(`/api/admin/categories/${id}`, payload);
  },

  deactivateCategory(id: string): Promise<void> {
    return apiClient.delete<void>(`/api/admin/categories/${id}`);
  },
};
