import { useQuery } from "@tanstack/react-query";
import { providerDashboardApi } from "@/api/provider_dashboard_api";

export function useDashboardExtras() {
  return useQuery({
    queryKey: ["provider", "dashboard-extras"],
    queryFn: providerDashboardApi.getExtras,
  });
}

export function useMyReviews() {
  return useQuery({
    queryKey: ["provider", "reviews"],
    queryFn: providerDashboardApi.getReviews,
  });
}
