"use client";

// TODO: admin routes are unauthenticated until Zainab's auth is merged; api_client must then send the auth header.

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Table, { Column } from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Toast from "@/components/ui/Toast";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import Pagination from "@/components/ui/Pagination";
import Badge from "@/components/ui/Badge";
import FilterBar from "@/components/ui/FilterBar";
import Select from "@/components/ui/Select";
import { getApiErrorMessage } from "@/utils/api_error_handler";
import { adminSidebarItems } from "@/constants/admin_sidebar";
import { useAdminProviders, useUpdateProviderStatus } from "@/hooks/useAdminProviders";
import { useDebounce } from "@/hooks/useDebounce";
import type { Provider, ProviderStatus } from "@/types/provider";

export default function ProvidersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const queryParams = {
    page,
    page_size: 10,
    ...(statusFilter !== "All" && { status: statusFilter as ProviderStatus }),
    ...(activeFilter !== "All" && { is_active: activeFilter === "Active" }),
    ...(debouncedSearchQuery && { q: debouncedSearchQuery }),
  };

  const { data, isLoading, error: queryError, refetch } = useAdminProviders(queryParams);
  const updateProviderStatus = useUpdateProviderStatus();

  const error = queryError ? getApiErrorMessage(queryError, "Failed to load providers") : null;

  const [toast, setToast] = useState<{ open: boolean; variant: "success" | "error"; message: string }>({
    open: false,
    variant: "success",
    message: "",
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<{ id: string; type: "Suspend" | "Deactivate" } | null>(null);

  const providers = data?.items || [];
  const meta = data?.meta;

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setter(e.target.value);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setStatusFilter("All");
    setActiveFilter("All");
    setSearchQuery("");
    setPage(1);
  };

  const executeAction = async (id: string, payload: { status?: ProviderStatus; is_active?: boolean }, successMessage: string) => {
    try {
      await updateProviderStatus.mutateAsync({ id, payload });
      setToast({ open: true, variant: "success", message: successMessage });
    } catch (err) {
      setToast({
        open: true,
        variant: "error",
        message: getApiErrorMessage(err, "Failed to update provider"),
      });
    }
  };

  const handleConfirmDialog = async () => {
    if (!dialogAction) return;
    
    if (dialogAction.type === "Suspend") {
      await executeAction(dialogAction.id, { status: "SUSPENDED" }, "Provider suspended successfully");
    } else if (dialogAction.type === "Deactivate") {
      await executeAction(dialogAction.id, { is_active: false }, "Provider deactivated successfully");
    }
    setDialogOpen(false);
  };

  const getStatusBadgeVariant = (status: ProviderStatus) => {
    switch (status) {
      case "APPROVED": return "success";
      case "PENDING": return "warning";
      case "SUSPENDED": return "danger";
      default: return "default";
    }
  };

  const columns: Column<Provider>[] = [
    {
      key: "business_name",
      header: "Business Name",
      render: (p) => p.business_name,
    },
    {
      key: "location",
      header: "Location",
      render: (p) => p.city ? `${p.location}, ${p.city}` : p.location,
    },
    {
      key: "contact",
      header: "Contact",
      render: (p) => (
        <div className="flex flex-col text-sm">
          <span>{p.contact_email || "-"}</span>
          <span className="text-muted">{p.contact_phone || "-"}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <Badge variant={getStatusBadgeVariant(p.status)}>
          {p.status}
        </Badge>
      ),
    },
    {
      key: "is_active",
      header: "Active",
      render: (p) => (
        <Badge variant={p.is_active ? "success" : "default"}>
          {p.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      render: (p) => new Date(p.created_at).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (p) => (
        <div className="flex justify-end gap-2">
          {p.status === "PENDING" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => executeAction(p.id, { status: "APPROVED" }, "Provider approved successfully")}
              disabled={updateProviderStatus.isPending}
            >
              Approve
            </Button>
          )}
          {(p.status === "PENDING" || p.status === "APPROVED") && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => { setDialogAction({ id: p.id, type: "Suspend" }); setDialogOpen(true); }}
              disabled={updateProviderStatus.isPending}
            >
              Suspend
            </Button>
          )}
          {p.status === "SUSPENDED" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => executeAction(p.id, { status: "APPROVED" }, "Provider restored successfully")}
              disabled={updateProviderStatus.isPending}
            >
              Approve
            </Button>
          )}
          {p.is_active ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setDialogAction({ id: p.id, type: "Deactivate" }); setDialogOpen(true); }}
              disabled={updateProviderStatus.isPending}
            >
              Deactivate
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => executeAction(p.id, { is_active: true }, "Provider activated successfully")}
              disabled={updateProviderStatus.isPending}
            >
              Activate
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      sidebarItems={adminSidebarItems}
      activeHref="/dashboard/admin/providers"
      title="Providers"
      description="Manage service providers"
      userName="Admin"
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">Providers</h1>
          <div className="relative w-full sm:w-auto">
            <input
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search providers..."
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

        <FilterBar onClear={handleClearFilters} showClear={statusFilter !== "All" || activeFilter !== "All" || searchQuery !== ""}>
          <Select
            label="Status"
            value={statusFilter}
            onChange={handleFilterChange(setStatusFilter)}
            options={[
              { label: "All", value: "All" },
              { label: "Pending", value: "PENDING" },
              { label: "Approved", value: "APPROVED" },
              { label: "Suspended", value: "SUSPENDED" },
            ]}
          />
          <Select
            label="Active State"
            value={activeFilter}
            onChange={handleFilterChange(setActiveFilter)}
            options={[
              { label: "All", value: "All" },
              { label: "Active", value: "Active" },
              { label: "Inactive", value: "Inactive" },
            ]}
          />
        </FilterBar>

        {isLoading ? (
          <LoadingState message="Loading providers..." />
        ) : error ? (
          <ErrorState message={error} action={<Button onClick={() => refetch()}>Retry</Button>} />
        ) : (
          <>
            <Table
              columns={columns}
              data={providers}
              rowKey={(p) => p.id}
              emptyState={<EmptyState title="No providers found" description="Adjust your filters or wait for providers to register." />}
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

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirmDialog}
        title={dialogAction?.type === "Suspend" ? "Suspend Provider" : "Deactivate Provider"}
        description={`Are you sure you want to ${dialogAction?.type?.toLowerCase()} this provider?`}
        variant="danger"
        confirmText={dialogAction?.type === "Suspend" ? "Suspend" : "Deactivate"}
        loading={updateProviderStatus.isPending}
      />

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
