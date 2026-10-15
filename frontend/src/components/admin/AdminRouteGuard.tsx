/**
 * Props: children is the Admin-owned page content to render. Non-admin users
 * are redirected to the dashboard appropriate for their role.
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingState from "@/components/ui/LoadingState";
import { useAuth } from "@/app/providers/AuthProvider";

function dashboardForRole(role: string | undefined) {
  return role === "PROVIDER" ? "/provider/dashboard" : "/dashboard";
}

export default function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role !== "ADMIN") {
      router.replace(dashboardForRole(user?.role));
    }
  }, [loading, router, user]);

  if (loading) return <LoadingState message="Checking admin access..." minHeight="lg" />;
  if (user?.role !== "ADMIN") return null;
  return <>{children}</>;
}
