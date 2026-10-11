import { useQuery } from "@tanstack/react-query";
import { providerDashboardApi } from "@/api/provider_dashboard_api";

export function useDashboardExtras() {
  return useQuery({
    queryKey: ["provider", "dashboard-extras"],
    queryFn: providerDashboardApi.getExtras,
  });
}

export function useMyReviews(providerId: string | undefined) {
  return useQuery({
    queryKey: ["provider", "reviews", providerId],
    queryFn: () => providerDashboardApi.getReviews(providerId as string),
    enabled: !!providerId,
  });
}
