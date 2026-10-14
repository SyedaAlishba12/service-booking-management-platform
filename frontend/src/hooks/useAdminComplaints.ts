import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { adminComplaintApi } from "@/api/admin_complaint_api";
import type { ComplaintListParams, ComplaintUpdatePayload } from "@/types/complaint";

export const ADMIN_COMPLAINTS_KEY = ["admin", "complaints"] as const;

export function useAdminComplaints(params: ComplaintListParams) {
  return useQuery({
    queryKey: [...ADMIN_COMPLAINTS_KEY, params],
    queryFn: () => adminComplaintApi.listComplaints(params),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ComplaintUpdatePayload }) =>
      adminComplaintApi.updateComplaint(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_COMPLAINTS_KEY }),
  });
}
