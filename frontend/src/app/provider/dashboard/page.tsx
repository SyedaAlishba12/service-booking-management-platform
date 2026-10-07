"use client";

import Link from "next/link";
import DashboardStats from "@/components/dashboard/DashboardStats";
import DashboardWelcome from "@/components/dashboard/DashboardWelcome";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentActivity from "@/components/dashboard/RecentActivity";
import UpcomingSchedule from "@/components/dashboard/UpcomingSchedule";
import ProviderShell from "@/components/provider/ProviderShell";
import {
  AvailabilitySummaryCard,
  CustomersSummaryCard,
  EarningsSummaryCard,
  RatingSummaryCard,
  ServicesSummaryCard,
} from "@/components/provider-dashboard/SummaryCards";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import { useDashboardExtras } from "@/hooks/useProviderDashboard";
import { useMyAvailability, useMyProvider } from "@/hooks/useProviderProfile";
import { useMyServices } from "@/hooks/useProviderServices";
import type { DashboardStat, QuickAction } from "@/types/dashboard";
import { getApiErrorMessage, isApiError } from "@/utils/api_error_handler";
import { formatMoney } from "@/utils/format_utils";

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Add service", description: "Create a new service with price and duration.", href: "/dashboard/services", primary: true },
  { label: "Manage availability", description: "Set working hours, breaks and days off.", href: "/dashboard/providers" },
  { label: "View bookings", description: "See and manage your appointments.", href: "/dashboard/bookings" },
  { label: "Edit profile", description: "Update business details and contact info.", href: "/dashboard/providers" },
];

export default function ProviderDashboardPage() {
  const provider = useMyProvider();
  const services = useMyServices();
  const noProfile = provider.isError && isApiError(provider.error) && provider.error.status === 404;
  const availability = useMyAvailability(!noProfile && !!provider.data);
  const extras = useDashboardExtras();

  const dateLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  let body;
  if (provider.isLoading || extras.isLoading || services.isLoading) {
    body = <LoadingState message="Loading your dashboard..." />;
  } else if (provider.isError && !noProfile) {
    body = (
      <ErrorState
        message={getApiErrorMessage(provider.error)}
        action={<Button onClick={() => provider.refetch()}>Try again</Button>}
      />
    );
  } else if (extras.isError || !extras.data) {
    body = (
      <ErrorState
        message={getApiErrorMessage(extras.error)}
        action={<Button onClick={() => extras.refetch()}>Try again</Button>}
      />
    );
  } else {
    const { bookings, earnings, customers, rating, activity } = extras.data;
    const stats: DashboardStat[] = [
      { label: "Today's appointments", value: String(bookings.today_count), detail: `${bookings.today_remaining} still to come` },
      { label: "Upcoming bookings", value: String(bookings.upcoming_count), detail: `${bookings.pending_count} waiting for confirmation` },
      { label: "Earnings this month", value: formatMoney(earnings.this_month), detail: "Sample data", trend: earnings.this_month >= earnings.last_month ? "up" : "down" },
      { label: "Average rating", value: rating.average.toFixed(1), detail: `${rating.total} reviews` },
    ];

    body = (
      <div className="space-y-6">
        {noProfile && (
          <Alert variant="warning">
            You have not created your provider profile yet.{" "}
            <Link href="/dashboard/providers" className="font-semibold underline">
              Create it now
            </Link>{" "}
            so customers can find you.
          </Alert>
        )}
        {provider.data?.status === "PENDING" && (
          <Alert variant="warning">Your profile is waiting for admin approval. Customers cannot see it yet.</Alert>
        )}
        {provider.data?.status === "SUSPENDED" && (
          <Alert variant="error">Your profile is suspended. You will not receive new bookings.</Alert>
        )}

        <DashboardStats stats={stats} />

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <UpcomingSchedule bookings={bookings.upcoming} viewAllHref="/dashboard/bookings" />
          </div>
          <RecentActivity activity={activity} />
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <ServicesSummaryCard services={services.data ?? []} />
          {availability.data ? (
            <AvailabilitySummaryCard availability={availability.data} />
          ) : (
            <div className="rounded-card border border-line bg-surface p-6 text-sm text-muted">
              {noProfile ? "Create your profile to set availability." : "Loading availability..."}
            </div>
          )}
          <EarningsSummaryCard earnings={earnings} />
          <CustomersSummaryCard customers={customers} />
          <RatingSummaryCard rating={rating} />
        </div>

        <QuickActions actions={QUICK_ACTIONS} />
      </div>
    );
  }

  return (
    <ProviderShell activeHref="/provider/dashboard" title="Dashboard">
      <DashboardWelcome
        name={provider.data?.business_name ?? "there"}
        dateLabel={dateLabel}
        description="Here is how your business is doing today."
      />
      {body}
    </ProviderShell>
  );
}
