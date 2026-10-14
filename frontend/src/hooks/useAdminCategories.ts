import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { categoryApi } from "@/api/category_api";
import type { CategoryCreatePayload, CategoryUpdatePayload } from "@/types/category";

const ADMIN_CATEGORIES_KEY = ["admin", "categories"] as const;

export function useAdminCategories() {
  return useQuery({
    queryKey: ADMIN_CATEGORIES_KEY,
    queryFn: categoryApi.listCategories,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CategoryCreatePayload) => categoryApi.createCategory(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_KEY }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CategoryUpdatePayload }) =>
      categoryApi.updateCategory(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_KEY }),
  });
}

export function useDeactivateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoryApi.deactivateCategory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_KEY }),
  });
}

export function useReactivateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoryApi.updateCategory(id, { is_active: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_KEY }),
  });
}
