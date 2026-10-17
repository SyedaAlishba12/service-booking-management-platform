"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Table, { Column } from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import Pagination from "@/components/ui/Pagination";
import StatusBadge, { Status } from "@/components/ui/StatusBadge";
import FilterBar from "@/components/ui/FilterBar";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { formatMoney, validateRange } from "@/utils/admin_report_utils";
import { getApiErrorMessage } from "@/utils/api_error_handler";
import { adminSidebarItems } from "@/constants/admin_sidebar";
import { useAdminBookings, useAdminBooking } from "@/hooks/useAdminBookings";
import { useDebounce } from "@/hooks/useDebounce";
import type {
  AdminBookingListItem,
  AdminBookingListParams,
  BookingStatus,
} from "@/types/admin_booking";

function renderText(val: string | number | null | undefined): React.ReactNode {
  if (val === null || val === undefined || val === "") {
    return <span className="text-muted italic">Not provided</span>;
  }
  return <span>{String(val)}</span>;
}

function renderDate(val: string | null | undefined): React.ReactNode {
  if (!val) return <span className="text-muted italic">Not provided</span>;
  const d = new Date(val);
  return isNaN(d.getTime()) ? <span>{val}</span> : <span>{d.toLocaleString()}</span>;
}

function renderMoney(val: string | number | null | undefined): React.ReactNode {
  if (val === null || val === undefined || val === "") {
    return <span className="text-muted italic">Not provided</span>;
  }
  return <span>${formatMoney(val)}</span>;
}

function renderDetailField(label: string, content: React.ReactNode) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-foreground break-words">{content}</dd>
    </div>
  );
}

export default function AdminBookingsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  const [appliedDateFrom, setAppliedDateFrom] = useState("");
  const [appliedDateTo, setAppliedDateTo] = useState("");
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);

  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ open: boolean; variant: "success" | "error"; message: string }>({
    open: false,
    variant: "success",
    message: "",
  });

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const queryParams: AdminBookingListParams = {
    page,
    page_size: 10,
    ...(statusFilter !== "All" && { status: statusFilter as BookingStatus }),
    ...(debouncedSearchQuery.trim() && { q: debouncedSearchQuery.trim() }),
    ...(appliedDateFrom && { date_from: appliedDateFrom }),
    ...(appliedDateTo && { date_to: appliedDateTo }),
  };

  const { data, isLoading, error: queryError, refetch } = useAdminBookings(queryParams);
  const {
    data: bookingDetail,
    isLoading: isDetailLoading,
    error: detailQueryError,
  } = useAdminBooking(selectedBookingId);

  const error = queryError ? getApiErrorMessage(queryError, "Failed to load bookings") : null;

  const bookings = data?.items || [];
  const meta = data?.meta;

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleStartDateChange = (val: string) => {
    setStartDateInput(val);
    if (dateRangeError) setDateRangeError(null);
  };

  const handleEndDateChange = (val: string) => {
    setEndDateInput(val);
    if (dateRangeError) setDateRangeError(null);
  };

  const handleApplyDateRange = () => {
    const errorMsg = validateRange(startDateInput, endDateInput);
    if (errorMsg) {
      setDateRangeError(errorMsg);
      return;
    }
    setDateRangeError(null);
    setAppliedDateFrom(startDateInput);
    setAppliedDateTo(endDateInput);
    setPage(1);
  };

  const handleClearFilters = () => {
    setStatusFilter("All");
    setSearchQuery("");
    setStartDateInput("");
    setEndDateInput("");
    setAppliedDateFrom("");
    setAppliedDateTo("");
    setDateRangeError(null);
    setPage(1);
  };

  const isFiltering =
    statusFilter !== "All" ||
    searchQuery !== "" ||
    appliedDateFrom !== "" ||
    appliedDateTo !== "" ||
    startDateInput !== "" ||
    endDateInput !== "";

  const columns: Column<AdminBookingListItem>[] = [
    {
      key: "id",
      header: "Booking ID",
      render: (b) => (
        <span title={b.id} className="font-mono text-xs font-semibold text-foreground">
          {b.id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: "customer_name",
      header: "Customer",
      render: (b) =>
        b.customer_name?.trim() ? (
          <span>{b.customer_name}</span>
        ) : (
          <span title={b.customer_id} className="font-mono text-xs text-muted">
            {b.customer_id.slice(0, 8)}
          </span>
        ),
    },
    {
      key: "provider_business_name",
      header: "Provider",
      render: (b) =>
        b.provider_business_name?.trim() ? (
          <span>{b.provider_business_name}</span>
        ) : (
          <span title={b.provider_id} className="font-mono text-xs text-muted">
            {b.provider_id.slice(0, 8)}
          </span>
        ),
    },
    {
      key: "service_name",
      header: "Service",
      render: (b) =>
        b.service_name?.trim() ? (
          <span>{b.service_name}</span>
        ) : (
          <span title={b.service_id} className="font-mono text-xs text-muted">
            {b.service_id.slice(0, 8)}
          </span>
        ),
    },
    {
      key: "start_at",
      header: "Start Date & Time",
      render: (b) => {
        const date = new Date(b.start_at);
        return <span>{isNaN(date.getTime()) ? b.start_at : date.toLocaleString()}</span>;
      },
    },
    {
      key: "price",
      header: "Price",
      render: (b) => <span>${formatMoney(b.price)}</span>,
    },
    {
      key: "status",
      header: "Booking Status",
      render: (b) => <StatusBadge status={b.status.toLowerCase() as Status} />,
    },
    {
      key: "payment_status",
      header: "Payment Status",
      render: (b) =>
        b.payment_status ? (
          <StatusBadge status={b.payment_status.toLowerCase() as Status} />
        ) : (
          <span className="text-muted text-sm">No payment</span>
        ),
    },
  ];

  return (
    <DashboardLayout
      sidebarItems={adminSidebarItems}
      activeHref="/dashboard/admin/bookings"
      title="Bookings"
      description="Manage and monitor platform bookings"
      userName="Admin"
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">Bookings</h1>
          <div className="relative w-full sm:w-auto">
            <input
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search bookings..."
              className="input min-h-10 pl-11 w-full sm:w-64"
              aria-label="Search"
            />
            <span aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                <circle cx="8.75" cy="8.75" r="5.25" stroke="currentColor" strokeWidth="1.7" />
                <path d="M12.75 12.75L17 17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </span>
          </div>
        </div>

        <div>
          <FilterBar onClear={handleClearFilters} showClear={isFiltering}>
            <Select
              label="Status"
              value={statusFilter}
              onChange={handleStatusChange}
              options={[
                { label: "All", value: "All" },
                { label: "Pending", value: "PENDING" },
                { label: "Confirmed", value: "CONFIRMED" },
                { label: "Cancelled", value: "CANCELLED" },
                { label: "Completed", value: "COMPLETED" },
                { label: "No Show", value: "NO_SHOW" },
              ]}
            />
            <DatePicker
              label="Start Date From"
              value={startDateInput}
              onChange={handleStartDateChange}
              id="booking-date-from"
            />
            <DatePicker
              label="Start Date To"
              value={endDateInput}
              onChange={handleEndDateChange}
              id="booking-date-to"
            />
            <div className="flex flex-col justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={handleApplyDateRange}
                className="h-10 w-full"
              >
                Apply Dates
              </Button>
            </div>
          </FilterBar>
          {dateRangeError && (
            <p className="mt-2 text-sm text-danger" role="alert">
              {dateRangeError}
            </p>
          )}
        </div>

        {isLoading ? (
          <LoadingState message="Loading bookings..." />
        ) : error ? (
          <ErrorState message={error} action={<Button onClick={() => refetch()}>Retry</Button>} />
        ) : (
          <>
            <Table
              columns={columns}
              data={bookings}
              rowKey={(b) => b.id}
              onRowClick={(b) => setSelectedBookingId(b.id)}
              emptyState={
                <EmptyState
                  title="No bookings found"
                  description="Adjust your filters or wait for customers to place bookings."
                />
              }
            />
            {meta && meta.total_pages > 1 && (
              <div className="mt-4">
                <Pagination
                  currentPage={meta.page}
                  totalPages={meta.total_pages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        open={Boolean(selectedBookingId)}
        onClose={() => setSelectedBookingId(null)}
        title={`Booking Details: ${selectedBookingId ? selectedBookingId.slice(0, 8) : ""}`}
        size="lg"
      >
        {isDetailLoading ? (
          <LoadingState message="Loading booking details..." />
        ) : detailQueryError ? (
          <ErrorState
            message={getApiErrorMessage(detailQueryError, "Failed to load booking details")}
          />
        ) : bookingDetail ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-base font-semibold text-foreground">Booking Overview</h3>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {renderDetailField("Booking ID", <span className="font-mono text-xs">{bookingDetail.id}</span>)}
                  {renderDetailField(
                    "Booking Status",
                    <StatusBadge status={bookingDetail.status.toLowerCase() as Status} />
                  )}
                  {renderDetailField("Total Price", renderMoney(bookingDetail.price))}
                  {renderDetailField("Start At", renderDate(bookingDetail.start_at))}
                  {renderDetailField("End At", renderDate(bookingDetail.end_at))}
                  {renderDetailField("Created At", renderDate(bookingDetail.created_at))}
                  {renderDetailField("Updated At", renderDate(bookingDetail.updated_at))}
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-base font-semibold text-foreground">Customer & Provider Information</h3>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {renderDetailField("Customer Name", renderText(bookingDetail.customer_name))}
                  {renderDetailField("Customer Email", renderText(bookingDetail.customer_email))}
                  {renderDetailField(
                    "Customer ID",
                    <span className="font-mono text-xs">{renderText(bookingDetail.customer_id)}</span>
                  )}
                  {renderDetailField("Provider Business", renderText(bookingDetail.provider_business_name))}
                  {renderDetailField("Provider Timezone", renderText(bookingDetail.provider_timezone))}
                  {renderDetailField(
                    "Provider ID",
                    <span className="font-mono text-xs">{renderText(bookingDetail.provider_id)}</span>
                  )}
                  {renderDetailField("Service Name", renderText(bookingDetail.service_name))}
                  {renderDetailField(
                    "Service ID",
                    <span className="font-mono text-xs">{renderText(bookingDetail.service_id)}</span>
                  )}
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-base font-semibold text-foreground">Timing & Lifecycle Details</h3>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {renderDetailField("Confirmed At", renderDate(bookingDetail.confirmed_at))}
                  {renderDetailField("Completed At", renderDate(bookingDetail.completed_at))}
                  {renderDetailField("Cancelled At", renderDate(bookingDetail.cancelled_at))}
                  {renderDetailField("Cancellation Reason", renderText(bookingDetail.cancellation_reason))}
                  {renderDetailField("No Show At", renderDate(bookingDetail.no_show_at))}
                  {renderDetailField("Hold Expires At", renderDate(bookingDetail.hold_expires_at))}
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-base font-semibold text-foreground">Notes</h3>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {renderText(bookingDetail.notes)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-base font-semibold text-foreground">Payment Details</h3>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {renderDetailField(
                    "Payment ID",
                    <span className="font-mono text-xs">{renderText(bookingDetail.payment_id)}</span>
                  )}
                  {renderDetailField(
                    "Payment Status",
                    bookingDetail.payment_status ? (
                      <StatusBadge status={bookingDetail.payment_status.toLowerCase() as Status} />
                    ) : (
                      <span className="text-muted italic">Not provided</span>
                    )
                  )}
                  {renderDetailField("Payment Amount", renderMoney(bookingDetail.payment_amount))}
                  {renderDetailField("Payment Method", renderText(bookingDetail.payment_method))}
                  {renderDetailField("Transaction Ref", renderText(bookingDetail.transaction_reference))}
                  {renderDetailField("Paid At", renderDate(bookingDetail.paid_at))}
                  {renderDetailField("Refund Amount", renderMoney(bookingDetail.refund_amount))}
                  {renderDetailField("Refunded At", renderDate(bookingDetail.refunded_at))}
                  {renderDetailField("Failure Reason", renderText(bookingDetail.failure_reason))}
                </dl>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </Modal>

      <div className="fixed bottom-4 right-4 z-50">
        <Toast
          open={toast.open}
          onClose={() => setToast({ ...toast, open: false })}
          variant={toast.variant}
          message={toast.message}
        />
      </div>
    </DashboardLayout>
  );
}
