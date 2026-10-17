"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import LoadingState from "@/components/ui/LoadingState";
import { useAuth } from "@/app/providers/AuthProvider";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    loading,
    isAuthenticated,
  } = useAuth();

  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading && !isAuthenticated) {
      router.replace(
        `/login?next=${encodeURIComponent(pathname)}`
      );
    }
  }, [
    mounted,
    loading,
    isAuthenticated,
    pathname,
    router,
  ]);

  if (!mounted || loading) {
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