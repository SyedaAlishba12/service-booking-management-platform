import { apiClient } from "@/utils/api_client";
import type { PaginatedData } from "@/types/api";
import type { ProviderService } from "@/types/provider";

export interface ServiceListParams {
  page?: number;
  page_size?: number;
  category_id?: string;
  provider_id?: string;
  is_active?: boolean;
  q?: string;
}

export const adminServiceApi = {
  listServices(params: ServiceListParams): Promise<PaginatedData<ProviderService>> {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.append("page", params.page.toString());
    if (params.page_size !== undefined) query.append("page_size", params.page_size.toString());
    if (params.category_id !== undefined && params.category_id !== "") query.append("category_id", params.category_id);
    if (params.provider_id !== undefined && params.provider_id !== "") query.append("provider_id", params.provider_id);
    if (params.is_active !== undefined) query.append("is_active", params.is_active.toString());
    if (params.q !== undefined && params.q !== "") query.append("q", params.q);

    return apiClient.get<PaginatedData<ProviderService>>(`/api/admin/services?${query.toString()}`);
  },

  setServiceActive(id: string, is_active: boolean): Promise<ProviderService> {
    return apiClient.put<ProviderService>(`/api/admin/services/${id}/active`, { is_active });
  }
};
