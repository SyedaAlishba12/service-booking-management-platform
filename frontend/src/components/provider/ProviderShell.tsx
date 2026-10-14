"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { PROVIDER_SIDEBAR_ITEMS } from "@/constants/provider";

interface ProviderShellProps {
  activeHref: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Shared frame for every provider page: Syeda's DashboardLayout + provider sidebar.
 * DashboardLayout already requires a logged-in user and shows the user's name and role.
 * This adds the role guard: only PROVIDER accounts see these pages (the backend enforces it too).
 */
export default function ProviderShell({
  activeHref,
  title,
  description,
  actions,
  children,
}: ProviderShellProps) {
  const { user } = useAuth();
  const isProvider = user?.role === "PROVIDER";

  return (
    <DashboardLayout
      sidebarItems={PROVIDER_SIDEBAR_ITEMS}
      activeHref={activeHref}
      title={title}
      description={description}
      breadcrumb={["Dashboard", title]}
      actions={isProvider ? actions : undefined}
    >
      {isProvider ? (
        children
      ) : (
        <EmptyState
          title="This area is for service providers"
          description="Sign up or log in with a provider account to manage services, availability and your profile."
          action={
            <Link href="/dashboard">
              <Button>Go to my dashboard</Button>
            </Link>
          }
        />
      )}
    </DashboardLayout>
  );
}
