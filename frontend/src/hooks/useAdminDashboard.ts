import { useQuery } from "@tanstack/react-query";
import { adminReportApi } from "@/api/admin_report_api";

export const ADMIN_DASHBOARD_STATS_KEY = ["admin", "dashboard", "stats"] as const;

export function useAdminDashboardStats() {
  return useQuery({
    queryKey: ADMIN_DASHBOARD_STATS_KEY,
    queryFn: () => adminReportApi.getDashboardStats(),
  });
}
