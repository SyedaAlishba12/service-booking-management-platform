import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { adminUserApi } from "@/api/admin_user_api";
import type { AdminUserListParams, UserStatusUpdatePayload } from "@/types/admin_user";

export const ADMIN_USERS_KEY = ["admin", "users"] as const;

export function useAdminUsers(params: AdminUserListParams) {
  return useQuery({
    queryKey: [...ADMIN_USERS_KEY, params],
    queryFn: () => adminUserApi.listUsers(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdminUserDetail(id: string | null) {
  return useQuery({
    queryKey: [...ADMIN_USERS_KEY, "detail", id],
    queryFn: () => (id ? adminUserApi.getUser(id) : null),
    enabled: !!id,
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UserStatusUpdatePayload }) =>
      adminUserApi.updateUserStatus(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY }),
  });
}
