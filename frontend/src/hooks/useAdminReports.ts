import { useQuery } from "@tanstack/react-query";
import { adminReportApi } from "@/api/admin_report_api";
import type { ReportQueryParams } from "@/types/admin_report";
import { validateRange } from "@/utils/admin_report_utils";

export const ADMIN_REPORTS_KEY = ["admin", "reports"] as const;

export function useAdminReport<T>(kind: string, params: ReportQueryParams) {
  const isValid = !params.date_from || !params.date_to || validateRange(params.date_from, params.date_to) === null;
  
  return useQuery({
    queryKey: [...ADMIN_REPORTS_KEY, kind, params],
    queryFn: () => adminReportApi.getReport<T>(kind, params),
    enabled: isValid,
  });
}
