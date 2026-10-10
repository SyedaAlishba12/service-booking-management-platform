"use client";

// TODO: admin routes are unauthenticated until Zainab's auth is merged; api_client must then send the auth header.

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Table, { Column } from "@/components/ui/Table";
import Tabs, { TabItem } from "@/components/ui/Tabs";
import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import { Card, CardContent } from "@/components/ui/Card";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import { getApiErrorMessage } from "@/utils/api_error_handler";
import { adminSidebarItems } from "@/constants/admin_sidebar";
import { useAdminReport } from "@/hooks/useAdminReports";
import { formatMoney, formatNumber, defaultRange, validateRange } from "@/utils/admin_report_utils";
import type { 
  UserReportData, 
  ProviderReportData, 
  ServiceReportData, 
  BookingReportData, 
  RevenueReportData, 
  ReviewReportData, 
  ComplaintReportData 
} from "@/types/admin_report";

// Helper component to render a simple horizontal bar for charts
function ProgressBar({ value, max }: { value: number; max: number }) {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="w-full h-2 bg-line rounded-full overflow-hidden flex items-center">
      <div 
        className="h-full bg-brand transition-all duration-300" 
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

// Components for different report types
function UsersReport({ queryParams }: { queryParams: { date_from: string; date_to: string } }) {
  const { data, isLoading, error: queryError, refetch } = useAdminReport<UserReportData>("users", queryParams);
  const error = queryError ? getApiErrorMessage(queryError, "Failed to load users report") : null;

  if (isLoading) return <LoadingState message="Loading users report..." />;
  if (error) return <ErrorState message={error} action={<Button onClick={() => refetch()}>Retry</Button>} />;
  if (!data?.data) return <EmptyState title="No data available" />;

  const report = data.data;
  const maxPerDay = Math.max(0, ...report.new_users_per_day.map(d => d.count));

  const perDayColumns: Column<{date: string, count: number}>[] = [
    { key: "date", header: "Date" },
    { key: "count", header: "New Users", render: (r) => formatNumber(r.count) },
    { 
      key: "chart", 
      header: "Trend", 
      className: "w-1/2",
      render: (r) => <ProgressBar value={r.count} max={maxPerDay} /> 
    },
  ];

  const byRoleColumns: Column<{role: string, count: number}>[] = [
    { key: "role", header: "Role" },
    { key: "count", header: "Count", render: (r) => formatNumber(r.count) },
  ];

  const roleData = Object.entries(report.by_role || {}).map(([role, count]) => ({ role, count }));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">New Users Per Day</h2>
      <Table 
        columns={perDayColumns} 
        data={report.new_users_per_day} 
        rowKey={(r) => r.date}
        emptyState={<EmptyState title="No user data for this range" />}
      />

      <h2 className="text-xl font-bold mt-8">Users By Role</h2>
      <Table 
        columns={byRoleColumns} 
        data={roleData} 
        rowKey={(r) => r.role}
        emptyState={<EmptyState title="No role data available" />}
      />
    </div>
  );
}

function ProvidersReport({ queryParams }: { queryParams: { date_from: string; date_to: string } }) {
  const { data, isLoading, error: queryError, refetch } = useAdminReport<ProviderReportData>("providers", queryParams);
  const error = queryError ? getApiErrorMessage(queryError, "Failed to load providers report") : null;

  if (isLoading) return <LoadingState message="Loading providers report..." />;
  if (error) return <ErrorState message={error} action={<Button onClick={() => refetch()}>Retry</Button>} />;
  if (!data?.data) return <EmptyState title="No data available" />;

  const report = data.data;

  const statusColumns: Column<{status: string, count: number}>[] = [
    { key: "status", header: "Status" },
    { key: "count", header: "Count", render: (r) => formatNumber(r.count) },
  ];

  const bookingsColumns: Column<{provider_id: string, completed_bookings: number}>[] = [
    { 
      key: "provider_id", 
      header: "Provider ID",
      render: (r) => <span title={r.provider_id}>{r.provider_id.slice(0, 8)}...</span> 
    },
    { key: "completed_bookings", header: "Completed Bookings", render: (r) => formatNumber(r.completed_bookings) },
  ];

  const revenueColumns: Column<{provider_id: string, paid_revenue: string | number}>[] = [
    { 
      key: "provider_id", 
      header: "Provider ID",
      render: (r) => <span title={r.provider_id}>{r.provider_id.slice(0, 8)}...</span> 
    },
    { key: "paid_revenue", header: "Paid Revenue", render: (r) => `$${formatMoney(r.paid_revenue)}` },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Providers By Status</h2>
      <Table 
        columns={statusColumns} 
        data={report.by_status || []} 
        rowKey={(r) => r.status}
        emptyState={<EmptyState title="No provider status data" />}
      />

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <div>
          <h2 className="text-xl font-bold mb-4">Top by Bookings</h2>
          <Table 
            columns={bookingsColumns} 
            data={report.top_by_bookings || []} 
            rowKey={(r) => r.provider_id}
            emptyState={<EmptyState title="No bookings data" />}
          />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-4">Top by Revenue</h2>
          <Table 
            columns={revenueColumns} 
            data={report.top_by_revenue || []} 
            rowKey={(r) => r.provider_id}
            emptyState={<EmptyState title="No revenue data" />}
          />
        </div>
      </div>
    </div>
  );
}

function ServicesReport({ queryParams }: { queryParams: { date_from: string; date_to: string } }) {
  const { data, isLoading, error: queryError, refetch } = useAdminReport<ServiceReportData>("services", queryParams);
  const error = queryError ? getApiErrorMessage(queryError, "Failed to load services report") : null;

  if (isLoading) return <LoadingState message="Loading services report..." />;
  if (error) return <ErrorState message={error} action={<Button onClick={() => refetch()}>Retry</Button>} />;
  if (!data?.data) return <EmptyState title="No data available" />;

  const report = data.data;

  const categoryColumns: Column<{category_id: string, count: number}>[] = [
    { 
      key: "category_id", 
      header: "Category ID",
      render: (r) => <span title={r.category_id}>{r.category_id.slice(0, 8)}...</span>
    },
    { key: "count", header: "Count", render: (r) => formatNumber(r.count) },
  ];

  const activeColumns: Column<{is_active: boolean, count: number}>[] = [
    { key: "is_active", header: "Status", render: (r) => r.is_active ? "Active" : "Inactive" },
    { key: "count", header: "Count", render: (r) => formatNumber(r.count) },
  ];

  const mostBookedColumns: Column<{service_id: string, count: number}>[] = [
    { 
      key: "service_id", 
      header: "Service ID",
      render: (r) => <span title={r.service_id}>{r.service_id.slice(0, 8)}...</span>
    },
    { key: "count", header: "Bookings", render: (r) => formatNumber(r.count) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-bold mb-4">By Category</h2>
          <Table 
            columns={categoryColumns} 
            data={report.by_category || []} 
            rowKey={(r) => r.category_id}
            emptyState={<EmptyState title="No category data" />}
          />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-4">By Status</h2>
          <Table 
            columns={activeColumns} 
            data={report.active_inactive || []} 
            rowKey={(r) => (r.is_active ? "true" : "false")}
            emptyState={<EmptyState title="No status data" />}
          />
        </div>
      </div>

      <h2 className="text-xl font-bold mt-8">Most Booked Services</h2>
      <Table 
        columns={mostBookedColumns} 
        data={report.most_booked || []} 
        rowKey={(r) => r.service_id}
        emptyState={<EmptyState title="No most booked services data" />}
      />
    </div>
  );
}

function BookingsReport({ queryParams }: { queryParams: { date_from: string; date_to: string } }) {
  const { data, isLoading, error: queryError, refetch } = useAdminReport<BookingReportData>("bookings", queryParams);
  const error = queryError ? getApiErrorMessage(queryError, "Failed to load bookings report") : null;

  if (isLoading) return <LoadingState message="Loading bookings report..." />;
  if (error) return <ErrorState message={error} action={<Button onClick={() => refetch()}>Retry</Button>} />;
  if (!data?.data) return <EmptyState title="No data available" />;

  const report = data.data;
  const maxPerDay = Math.max(0, ...report.per_day.map(d => d.count));

  const statusColumns: Column<{status: string, count: number}>[] = [
    { key: "status", header: "Status" },
    { key: "count", header: "Count", render: (r) => formatNumber(r.count) },
  ];
  const statusData = Object.entries(report.by_status || {}).map(([status, count]) => ({ status, count }));

  const perDayColumns: Column<{date: string, count: number}>[] = [
    { key: "date", header: "Date" },
    { key: "count", header: "Bookings", render: (r) => formatNumber(r.count) },
    { 
      key: "chart", 
      header: "Trend", 
      className: "w-1/2",
      render: (r) => <ProgressBar value={r.count} max={maxPerDay} /> 
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="mb-6 inline-block w-auto min-w-[200px]">
        <CardContent>
          <div className="text-sm font-medium text-muted">Total Cancellations</div>
          <div className="mt-2 text-2xl font-bold">{formatNumber(report.cancellation_count)}</div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <h2 className="text-xl font-bold mb-4">By Status</h2>
          <Table 
            columns={statusColumns} 
            data={statusData} 
            rowKey={(r) => r.status}
            emptyState={<EmptyState title="No status data" />}
          />
        </div>
        <div className="md:col-span-2">
          <h2 className="text-xl font-bold mb-4">Bookings Per Day</h2>
          <Table 
            columns={perDayColumns} 
            data={report.per_day || []} 
            rowKey={(r) => r.date}
            emptyState={<EmptyState title="No daily bookings data" />}
          />
        </div>
      </div>
    </div>
  );
}

function RevenueReport({ queryParams }: { queryParams: { date_from: string; date_to: string } }) {
  const { data, isLoading, error: queryError, refetch } = useAdminReport<RevenueReportData>("revenue", queryParams);
  const error = queryError ? getApiErrorMessage(queryError, "Failed to load revenue report") : null;

  if (isLoading) return <LoadingState message="Loading revenue report..." />;
  if (error) return <ErrorState message={error} action={<Button onClick={() => refetch()}>Retry</Button>} />;
  if (!data?.data) return <EmptyState title="No data available" />;

  const report = data.data;
  
  // Calculate max revenue carefully since it might be strings or numbers
  const maxPerDay = Math.max(0, ...report.per_day.map(d => typeof d.revenue === "string" ? parseFloat(d.revenue) : d.revenue).filter(n => !isNaN(n)));

  const statusColumns: Column<{status: string, count: number}>[] = [
    { key: "status", header: "Payment Status" },
    { key: "count", header: "Count", render: (r) => formatNumber(r.count) },
  ];
  const statusData = Object.entries(report.count_by_status || {}).map(([status, count]) => ({ status, count }));

  const perDayColumns: Column<{date: string, revenue: string | number}>[] = [
    { key: "date", header: "Date" },
    { key: "revenue", header: "Revenue", render: (r) => `$${formatMoney(r.revenue)}` },
    { 
      key: "chart", 
      header: "Trend", 
      className: "w-1/2",
      render: (r) => {
        const val = typeof r.revenue === "string" ? parseFloat(r.revenue) : r.revenue;
        return <ProgressBar value={isNaN(val) ? 0 : val} max={maxPerDay} />;
      }
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-4 mb-6">
        <Card className="flex-1">
          <CardContent>
            <div className="text-sm font-medium text-muted">Paid Total</div>
            <div className="mt-2 text-2xl font-bold text-success">${formatMoney(report.paid_total)}</div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent>
            <div className="text-sm font-medium text-muted">Refunded Total</div>
            <div className="mt-2 text-2xl font-bold text-danger">${formatMoney(report.refunded_total)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <h2 className="text-xl font-bold mb-4">By Payment Status</h2>
          <Table 
            columns={statusColumns} 
            data={statusData} 
            rowKey={(r) => r.status}
            emptyState={<EmptyState title="No status data" />}
          />
        </div>
        <div className="md:col-span-2">
          <h2 className="text-xl font-bold mb-4">Revenue Per Day</h2>
          <Table 
            columns={perDayColumns} 
            data={report.per_day || []} 
            rowKey={(r) => r.date}
            emptyState={<EmptyState title="No daily revenue data" />}
          />
        </div>
      </div>
    </div>
  );
}

function ReviewsReport({ queryParams }: { queryParams: { date_from: string; date_to: string } }) {
  const { data, isLoading, error: queryError, refetch } = useAdminReport<ReviewReportData>("reviews", queryParams);
  const error = queryError ? getApiErrorMessage(queryError, "Failed to load reviews report") : null;

  if (isLoading) return <LoadingState message="Loading reviews report..." />;
  if (error) return <ErrorState message={error} action={<Button onClick={() => refetch()}>Retry</Button>} />;
  if (!data?.data) return <EmptyState title="No data available" />;

  const report = data.data;
  const maxPerDay = Math.max(0, ...report.per_day.map(d => d.count));

  const breakdownColumns: Column<{rating: string, count: number}>[] = [
    { key: "rating", header: "Rating", render: (r) => `${r.rating} Star${r.rating !== "1" ? "s" : ""}` },
    { key: "count", header: "Count", render: (r) => formatNumber(r.count) },
  ];
  // Sort descending by rating 5 -> 1
  const breakdownData = Object.entries(report.breakdown || {})
    .map(([rating, count]) => ({ rating, count }))
    .sort((a, b) => parseInt(b.rating) - parseInt(a.rating));

  const perDayColumns: Column<{date: string, count: number}>[] = [
    { key: "date", header: "Date" },
    { key: "count", header: "Reviews", render: (r) => formatNumber(r.count) },
    { 
      key: "chart", 
      header: "Trend", 
      className: "w-1/2",
      render: (r) => <ProgressBar value={r.count} max={maxPerDay} /> 
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent>
            <div className="text-sm font-medium text-muted">Total Reviews</div>
            <div className="mt-2 text-2xl font-bold">{formatNumber(report.count)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-sm font-medium text-muted">Average Rating</div>
            <div className="mt-2 text-2xl font-bold">{formatMoney(report.average)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-sm font-medium text-muted">Visible</div>
            <div className="mt-2 text-2xl font-bold">{formatNumber(report.count - report.hidden_count)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-sm font-medium text-muted">Hidden</div>
            <div className="mt-2 text-2xl font-bold text-danger">{formatNumber(report.hidden_count)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <h2 className="text-xl font-bold mb-4">Rating Breakdown</h2>
          <Table 
            columns={breakdownColumns} 
            data={breakdownData} 
            rowKey={(r) => r.rating}
            emptyState={<EmptyState title="No breakdown data" />}
          />
        </div>
        <div className="md:col-span-2">
          <h2 className="text-xl font-bold mb-4">Reviews Per Day</h2>
          <Table 
            columns={perDayColumns} 
            data={report.per_day || []} 
            rowKey={(r) => r.date}
            emptyState={<EmptyState title="No daily reviews data" />}
          />
        </div>
      </div>
    </div>
  );
}

function ComplaintsReport({ queryParams }: { queryParams: { date_from: string; date_to: string } }) {
  const { data, isLoading, error: queryError, refetch } = useAdminReport<ComplaintReportData>("complaints", queryParams);
  const error = queryError ? getApiErrorMessage(queryError, "Failed to load complaints report") : null;

  if (isLoading) return <LoadingState message="Loading complaints report..." />;
  if (error) return <ErrorState message={error} action={<Button onClick={() => refetch()}>Retry</Button>} />;
  if (!data?.data) return <EmptyState title="No data available" />;

  const report = data.data;
  const maxPerDay = Math.max(0, ...report.per_day.map(d => d.count));

  const statusColumns: Column<{status: string, count: number}>[] = [
    { key: "status", header: "Status" },
    { key: "count", header: "Count", render: (r) => formatNumber(r.count) },
  ];
  const statusData = Object.entries(report.by_status || {}).map(([status, count]) => ({ status, count }));

  const typeColumns: Column<{type: string, count: number}>[] = [
    { key: "type", header: "Type" },
    { key: "count", header: "Count", render: (r) => formatNumber(r.count) },
  ];
  const typeData = Object.entries(report.by_type || {}).map(([type, count]) => ({ type, count }));

  const perDayColumns: Column<{date: string, count: number}>[] = [
    { key: "date", header: "Date" },
    { key: "count", header: "Complaints", render: (r) => formatNumber(r.count) },
    { 
      key: "chart", 
      header: "Trend", 
      className: "w-1/2",
      render: (r) => <ProgressBar value={r.count} max={maxPerDay} /> 
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-bold mb-4">By Status</h2>
          <Table 
            columns={statusColumns} 
            data={statusData} 
            rowKey={(r) => r.status}
            emptyState={<EmptyState title="No status data" />}
          />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-4">By Type</h2>
          <Table 
            columns={typeColumns} 
            data={typeData} 
            rowKey={(r) => r.type}
            emptyState={<EmptyState title="No type data" />}
          />
        </div>
      </div>

      <h2 className="text-xl font-bold mt-8">Complaints Per Day</h2>
      <Table 
        columns={perDayColumns} 
        data={report.per_day || []} 
        rowKey={(r) => r.date}
        emptyState={<EmptyState title="No daily complaints data" />}
      />
    </div>
  );
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("users");
  
  // Local state for the date pickers
  const defaultDates = defaultRange();
  const [fromDate, setFromDate] = useState(defaultDates.from);
  const [toDate, setToDate] = useState(defaultDates.to);
  const [validationError, setValidationError] = useState<string | null>(null);

  // State applied to queries
  const [appliedDates, setAppliedDates] = useState<{ date_from: string; date_to: string }>({
    date_from: defaultDates.from,
    date_to: defaultDates.to,
  });

  const handleApply = () => {
    const err = validateRange(fromDate, toDate);
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError(null);
    setAppliedDates({ date_from: fromDate, date_to: toDate });
  };

  const tabs: TabItem[] = [
    { id: "users", label: "Users", content: <UsersReport queryParams={appliedDates} /> },
    { id: "providers", label: "Providers", content: <ProvidersReport queryParams={appliedDates} /> },
    { id: "services", label: "Services", content: <ServicesReport queryParams={appliedDates} /> },
    { id: "bookings", label: "Bookings", content: <BookingsReport queryParams={appliedDates} /> },
    { id: "revenue", label: "Revenue", content: <RevenueReport queryParams={appliedDates} /> },
    { id: "reviews", label: "Reviews", content: <ReviewsReport queryParams={appliedDates} /> },
    { id: "complaints", label: "Complaints", content: <ComplaintsReport queryParams={appliedDates} /> },
  ];

  return (
    <DashboardLayout
      sidebarItems={adminSidebarItems}
      activeHref="/dashboard/admin/reports"
      title="Reports"
      description="Detailed system reports and analytics"
      userName="Admin"
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 p-4 rounded-xl border border-line bg-surface shadow-sm">
          <div className="flex-1 flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="w-full sm:max-w-xs">
              <DatePicker
                label="Date From"
                value={fromDate}
                onChange={(val) => { setFromDate(val); setValidationError(null); }}
              />
            </div>
            <div className="w-full sm:max-w-xs">
              <DatePicker
                label="Date To"
                value={toDate}
                onChange={(val) => { setToDate(val); setValidationError(null); }}
              />
            </div>
            <div className="w-full sm:w-auto">
              <Button onClick={handleApply}>Apply Range</Button>
            </div>
          </div>
          {validationError && (
            <div className="text-sm font-medium text-danger mt-2 sm:mt-0">
              {validationError}
            </div>
          )}
        </div>

        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>
    </DashboardLayout>
  );
}
