"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";

interface SidebarItem {
  label: string;
  href: string;
  icon?: ReactNode;
}

interface DashboardLayoutProps {
  children: ReactNode;
  sidebarItems: SidebarItem[];
  activeHref: string;
  title?: string;
  description?: string;
  breadcrumb?: string[];
  userName?: string;
  userEmail?: string;
  notificationCount?: number;
  actions?: ReactNode;
}

export default function DashboardLayout({
  children,
  sidebarItems,
  activeHref,
  title,
  description,
  breadcrumb,
  userName,
  userEmail,
  notificationCount = 0,
  actions,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        items={sidebarItems}
        activeHref={activeHref}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="min-h-screen lg:pl-[264px]">
        <DashboardHeader
          title={title}
          description={description}
          breadcrumb={breadcrumb}
          userName={userName}
          userEmail={userEmail}
          notificationCount={notificationCount}
          actions={actions}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="px-4 pb-10 pt-3 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1380px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}