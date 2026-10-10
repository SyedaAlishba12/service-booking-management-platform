"use client";

// TODO: admin routes are unauthenticated until Zainab's auth is merged; api_client must then send the auth header.

import DashboardLayout from "@/components/layout/DashboardLayout";
import DashboardStats from "@/components/dashboard/DashboardStats";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import Button from "@/components/ui/Button";
import { getApiErrorMessage } from "@/utils/api_error_handler";
import { adminSidebarItems } from "@/constants/admin_sidebar";
import { useAdminDashboardStats } from "@/hooks/useAdminDashboard";
import { formatMoney, formatNumber } from "@/utils/admin_report_utils";
import type { DashboardStat } from "@/types/dashboard";

export default function AdminOverviewPage() {
  const { data, isLoading, error: queryError, refetch } = useAdminDashboardStats();

  const error = queryError ? getApiErrorMessage(queryError, "Failed to load dashboard stats") : null;

  const getStats = (): DashboardStat[] => {
    if (!data?.data) return [];
    const stats = data.data;

    return [
      {
        label: "Total Users",
        value: formatNumber(stats.users?.total),
        detail: "Registered platform users",
      },
      {
        label: "Total Bookings",
        value: formatNumber(stats.bookings?.total),
        detail: "All time bookings",
      },
      {
        label: "Paid Revenue",
        value: `$${formatMoney(stats.payments?.paid_total)}`,
        detail: "Total confirmed payments",
      },
      {
        label: "Open Complaints",
        value: formatNumber(stats.complaints?.open),
        detail: "Needs attention",
        trend: stats.complaints?.open > 0 ? "down" : "neutral",
      },
      {
        label: "Average Rating",
        value: formatMoney(stats.reviews?.average_rating),
        detail: "Out of 5 stars",
        trend: stats.reviews?.average_rating >= 4.0 ? "up" : "neutral",
      },
      {
        label: "Active Services",
        value: formatNumber(stats.services?.active),
        detail: "Currently bookable",
      },
    ];
  };

  const dashboardStats = getStats();

  return (
    <DashboardLayout
      sidebarItems={adminSidebarItems}
      activeHref="/dashboard/admin"
      title="Admin Overview"
      description="System performance and statistics"
      userName="Admin"
    >
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">Overview</h1>
        </div>

        {isLoading ? (
          <LoadingState message="Loading dashboard statistics..." />
        ) : error ? (
          <ErrorState message={error} action={<Button onClick={() => refetch()}>Retry</Button>} />
        ) : data?.data ? (
          <div className="space-y-8">
            <DashboardStats stats={dashboardStats} />
            
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <Card>
                <CardHeader>
                  <h3 className="font-semibold">Users Breakdown</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-muted">Total</span>
                    <span className="font-medium">{formatNumber(data.data.users?.total)}</span>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-muted">Active</span>
                    <span className="font-medium">{formatNumber(data.data.users?.active)}</span>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-muted">Customers</span>
                    <span className="font-medium">{formatNumber(data.data.users?.customers)}</span>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-muted">Providers</span>
                    <span className="font-medium">{formatNumber(data.data.users?.providers)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="font-semibold">Bookings (Status)</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-muted">Pending</span>
                    <span className="font-medium">{formatNumber(data.data.bookings?.pending)}</span>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-muted">Confirmed</span>
                    <span className="font-medium">{formatNumber(data.data.bookings?.confirmed)}</span>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-muted">Completed</span>
                    <span className="font-medium">{formatNumber(data.data.bookings?.completed)}</span>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-muted">Cancelled</span>
                    <span className="font-medium">{formatNumber(data.data.bookings?.cancelled)}</span>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-muted">No Show</span>
                    <span className="font-medium">{formatNumber(data.data.bookings?.no_show)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="font-semibold">Payments</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-muted">Paid Total</span>
                    <span className="font-medium text-success">${formatMoney(data.data.payments?.paid_total)}</span>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-muted">Refunded Total</span>
                    <span className="font-medium text-danger">${formatMoney(data.data.payments?.refunded_total)}</span>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-muted">Pending Count</span>
                    <span className="font-medium">{formatNumber(data.data.payments?.pending_count)}</span>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-muted">Failed Count</span>
                    <span className="font-medium">{formatNumber(data.data.payments?.failed_count)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="font-semibold">Reviews & Feedback</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-muted">Total Reviews</span>
                    <span className="font-medium">{formatNumber(data.data.reviews?.total)}</span>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-muted">Visible</span>
                    <span className="font-medium">{formatNumber(data.data.reviews?.visible)}</span>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-muted">Hidden</span>
                    <span className="font-medium">{formatNumber(data.data.reviews?.hidden)}</span>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-muted">Avg Rating</span>
                    <span className="font-medium">{formatMoney(data.data.reviews?.average_rating)} / 5</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="font-semibold">Complaints</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-muted">Open</span>
                    <span className="font-medium text-danger">{formatNumber(data.data.complaints?.open)}</span>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-muted">In Review</span>
                    <span className="font-medium text-warning">{formatNumber(data.data.complaints?.in_review)}</span>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-muted">Resolved</span>
                    <span className="font-medium text-success">{formatNumber(data.data.complaints?.resolved)}</span>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-muted">Rejected</span>
                    <span className="font-medium">{formatNumber(data.data.complaints?.rejected)}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <h3 className="font-semibold">Services</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-muted">Total Services</span>
                    <span className="font-medium">{formatNumber(data.data.services?.total)}</span>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-muted">Active</span>
                    <span className="font-medium">{formatNumber(data.data.services?.active)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <section aria-labelledby="quick-links-heading" className="mt-8">
              <h2 id="quick-links-heading" className="text-lg font-bold text-foreground mb-4">Quick Links</h2>
              <div className="flex flex-wrap gap-4">
                {adminSidebarItems.filter(item => item.href.startsWith('/dashboard/admin') || item.href === '/dashboard/categories' || item.href === '/dashboard/settings').map(item => (
                   <a 
                    key={item.href} 
                    href={item.href}
                    className="inline-flex items-center justify-center rounded-xl bg-brand-soft px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft/80"
                   >
                     {item.label}
                   </a>
                ))}
              </div>
            </section>

          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
