import { apiClient } from "@/utils/api_client";
import type { PaginatedData } from "@/types/api";
import type { AdminComplaint, ComplaintCreatePayload } from "@/types/complaint";

// TODO: once the real auth lands, api_client should attach the token and these options will no longer be needed.

export const complaintApi = {
  createComplaint(payload: ComplaintCreatePayload, options?: RequestInit): Promise<AdminComplaint> {
    return apiClient.post<AdminComplaint>(`/api/complaints`, payload, options);
  },

  listMyComplaints(params: { page?: number; page_size?: number }, options?: RequestInit): Promise<PaginatedData<AdminComplaint>> {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.append("page", params.page.toString());
    if (params.page_size !== undefined) query.append("page_size", params.page_size.toString());
    return apiClient.get<PaginatedData<AdminComplaint>>(`/api/complaints/me?${query.toString()}`, options);
  },

  getMyComplaint(id: string, options?: RequestInit): Promise<AdminComplaint> {
    return apiClient.get<AdminComplaint>(`/api/complaints/${id}`, options);
  }
};
