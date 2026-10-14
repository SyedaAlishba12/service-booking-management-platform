import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { complaintApi } from "@/api/complaint_api";

export const MY_COMPLAINTS_KEY = ["my", "complaints"] as const;

export function useMyComplaints(params: { page?: number; page_size?: number }, requestOptions?: RequestInit) {
  return useQuery({
    queryKey: [...MY_COMPLAINTS_KEY, params],
    queryFn: () => complaintApi.listMyComplaints(params, requestOptions),
    placeholderData: keepPreviousData,
  });
}
