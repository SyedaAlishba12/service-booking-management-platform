"use client";

import { useEffect } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import LoadingState from "@/components/ui/LoadingState";
import { useAuth } from "@/app/providers/AuthProvider";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, isAuthenticated } = useAuth();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryString = searchParams.toString();

  const currentPath = queryString
    ? `${pathname}?${queryString}`
    : pathname;

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace(
        `/login?next=${encodeURIComponent(currentPath)}`
      );
    }
  }, [
    loading,
    isAuthenticated,
    currentPath,
    router,
  ]);

  if (loading) {
    return (
      <LoadingState
        message="Checking your session..."
        minHeight="lg"
      />
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
