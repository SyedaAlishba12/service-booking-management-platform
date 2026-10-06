"use client";

import type { ReactNode } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PROVIDER_SIDEBAR_ITEMS } from "@/constants/provider";

interface ProviderShellProps {
  activeHref: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** Shared frame for every provider page: Syeda's DashboardLayout + provider sidebar. */
export default function ProviderShell({
  activeHref,
  title,
  description,
  actions,
  children,
}: ProviderShellProps) {
  return (
    <DashboardLayout
      sidebarItems={PROVIDER_SIDEBAR_ITEMS}
      activeHref={activeHref}
      title={title}
      description={description}
      breadcrumb={["Dashboard", title]}
      userName="Provider" // TODO: use the logged-in user once auth is ready
      actions={actions}
    >
      {children}
    </DashboardLayout>
  );
}
