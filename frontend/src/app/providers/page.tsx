
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import FeaturedProviders from "@/components/landing/FeaturedProviders";
import DashboardLayout from "@/components/layout/DashboardLayout";

const CUSTOMER_NAV_ITEMS = [
  { label: "Dashboard", href: "/customer/dashboard" },
  { label: "Book a Service", href: "/booking" },
  { label: "My Bookings", href: "/bookings" },
  { label: "Services", href: "/services?view=dashboard" },
  { label: "Providers", href: "/providers?view=dashboard" },
  { label: "Notifications", href: "/notifications" },
  { label: "Settings", href: "/customer/profile" },
];

function ProvidersPageContent() {
  const searchParams = useSearchParams();
  const isDashboardView = searchParams.get("view") === "dashboard";

  // Public mode: display providers without the customer sidebar.
  if (!isDashboardView) {
    return (
      <main className="min-h-screen">
        <FeaturedProviders fullPage />
      </main>
    );
  }

  // Dashboard mode: display providers inside the customer dashboard.
  return (
    <DashboardLayout
      sidebarItems={CUSTOMER_NAV_ITEMS}
      activeHref="/providers?view=dashboard"
      title="Providers"
      description="Explore professionals, compare their services, and find the right provider for you."
    >
      <FeaturedProviders fullPage dashboardView />
    </DashboardLayout>
  );
}

export default function ProvidersPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen">
          <div className="container py-10">
            <p className="text-sm text-muted">Loading providers...</p>
          </div>
        </main>
      }
    >
      <ProvidersPageContent />
    </Suspense>
  );
}
