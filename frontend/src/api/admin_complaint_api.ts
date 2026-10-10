import { apiClient } from "@/utils/api_client";
import type { PaginatedData } from "@/types/api";
import type { AdminComplaint, ComplaintListParams, ComplaintUpdatePayload } from "@/types/complaint";

export const adminComplaintApi = {
  listComplaints(params: ComplaintListParams): Promise<PaginatedData<AdminComplaint>> {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.append("page", params.page.toString());
    if (params.page_size !== undefined) query.append("page_size", params.page_size.toString());
    if (params.status) query.append("status", params.status);
    if (params.complaint_type) query.append("complaint_type", params.complaint_type);

    return apiClient.get<PaginatedData<AdminComplaint>>(`/api/admin/complaints?${query.toString()}`);
  },

  updateComplaint(id: string, payload: ComplaintUpdatePayload): Promise<AdminComplaint> {
    return apiClient.put<AdminComplaint>(`/api/admin/complaints/${id}`, payload);
  }
};
