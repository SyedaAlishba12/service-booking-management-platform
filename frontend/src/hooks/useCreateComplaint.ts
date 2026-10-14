import { useMutation, useQueryClient } from "@tanstack/react-query";
import { complaintApi } from "@/api/complaint_api";
import type { ComplaintCreatePayload } from "@/types/complaint";
import { MY_COMPLAINTS_KEY } from "./useMyComplaints";

export function useCreateComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, requestOptions }: { payload: ComplaintCreatePayload; requestOptions?: RequestInit }) =>
      complaintApi.createComplaint(payload, requestOptions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_COMPLAINTS_KEY });
    },
  });
}
