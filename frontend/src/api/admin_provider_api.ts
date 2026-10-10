import { apiClient } from "@/utils/api_client";
import type { PaginatedData } from "@/types/api";
import type { Provider, ProviderStatus } from "@/types/provider";

export interface ProviderListParams {
  page?: number;
  page_size?: number;
  status?: ProviderStatus;
  is_active?: boolean;
  q?: string;
}

export const adminProviderApi = {
  listProviders(params: ProviderListParams): Promise<PaginatedData<Provider>> {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.append("page", params.page.toString());
    if (params.page_size !== undefined) query.append("page_size", params.page_size.toString());
    if (params.status !== undefined) query.append("status", params.status);
    if (params.is_active !== undefined) query.append("is_active", params.is_active.toString());
    if (params.q !== undefined && params.q !== "") query.append("q", params.q);

    return apiClient.get<PaginatedData<Provider>>(`/api/admin/providers?${query.toString()}`);
  },

  updateProviderStatus(id: string, payload: { status?: ProviderStatus; is_active?: boolean }): Promise<Provider> {
    return apiClient.put<Provider>(`/api/admin/providers/${id}/status`, payload);
  },
};
