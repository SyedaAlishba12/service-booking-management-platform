import { apiClient } from "@/utils/api_client";
import type { PaginatedData } from "@/types/api";
import type {
  AdminUser,
  AdminUserDetail,
  AdminUserListParams,
  UserStatusUpdatePayload,
} from "@/types/admin_user";

export const adminUserApi = {
  listUsers(params: AdminUserListParams): Promise<PaginatedData<AdminUser>> {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.append("page", params.page.toString());
    if (params.page_size !== undefined) query.append("page_size", params.page_size.toString());
    if (params.role !== undefined) query.append("role", params.role);
    if (params.is_active !== undefined) query.append("is_active", params.is_active.toString());
    if (params.q !== undefined && params.q.trim() !== "") query.append("q", params.q.trim());

    return apiClient.get<PaginatedData<AdminUser>>(`/api/admin/users?${query.toString()}`);
  },

  getUser(id: string): Promise<AdminUserDetail> {
    return apiClient.get<AdminUserDetail>(`/api/admin/users/${id}`);
  },

  updateUserStatus(id: string, payload: UserStatusUpdatePayload): Promise<AdminUser> {
    return apiClient.put<AdminUser>(`/api/admin/users/${id}/status`, payload);
  },
};
