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
import { useAdminServices, useSetServiceActive } from "@/hooks/useAdminServices";
import { useAdminCategories } from "@/hooks/useAdminCategories";
import { useDebounce } from "@/hooks/useDebounce";
import type { ProviderService } from "@/types/provider";

export default function ServicesPage() {
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [searchInput, setSearchInput] = useState("");
  
  const debouncedSearchQuery = useDebounce(searchInput, 300);

  const queryParams = {
    page,
    page_size: 10,
    ...(categoryFilter !== "All" && { category_id: categoryFilter }),
    ...(activeFilter !== "All" && { is_active: activeFilter === "Active" }),
    ...(debouncedSearchQuery && { q: debouncedSearchQuery }),
  };

  const { data, isLoading, error: queryError, refetch } = useAdminServices(queryParams);
  const { data: categoriesData } = useAdminCategories();
  const setServiceActive = useSetServiceActive();

  const error = queryError ? getApiErrorMessage(queryError, "Failed to load services") : null;

  const [toast, setToast] = useState<{ open: boolean; variant: "success" | "error"; message: string }>({
    open: false,
    variant: "success",
    message: "",
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [serviceToDeactivate, setServiceToDeactivate] = useState<string | null>(null);

  const services = data?.items || [];
  const meta = data?.meta;
  const categories = categoriesData || [];

  const categoryOptions = [
    { label: "All", value: "All" },
    ...categories.map((c) => ({ label: c.name, value: c.id }))
  ];

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setter(e.target.value);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setCategoryFilter("All");
    setActiveFilter("All");
    setSearchInput("");
    setPage(1);
  };

  const executeToggleActive = async (id: string, is_active: boolean) => {
    try {
      await setServiceActive.mutateAsync({ id, is_active });
      setToast({ open: true, variant: "success", message: `Service ${is_active ? "activated" : "deactivated"} successfully` });
      if (!is_active) setDialogOpen(false);
    } catch (err) {
      setToast({
        open: true,
        variant: "error",
        message: getApiErrorMessage(err, "Failed to update service"),
      });
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!serviceToDeactivate) return;
    await executeToggleActive(serviceToDeactivate, false);
  };

  const formatPrice = (price: string | number | undefined | null) => {
    if (price === undefined || price === null) return "0.00";
    const num = typeof price === "string" ? parseFloat(price) : price;
    if (isNaN(num)) return "0.00";
    return num.toFixed(2);
  };

  const getCategoryName = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    return cat ? cat.name : id.substring(0, 8);
  };

  const columns: Column<ProviderService>[] = [
    {
      key: "name",
      header: "Service Name",
      render: (s) => s.name,
    },
    {
      key: "category",
      header: "Category",
      render: (s) => getCategoryName(s.category_id),
    },
    {
      key: "provider_id",
      header: "Provider",
      render: (s) => (
        <span title={s.provider_id}>
          {s.provider_id.substring(0, 8)}
        </span>
      ),
    },
    {
      key: "price",
      header: "Price",
      render: (s) => `$${formatPrice(s.price)}`,
    },
    {
      key: "duration",
      header: "Duration",
      render: (s) => `${s.duration_minutes} min`,
    },
    {
      key: "type",
      header: "Type",
      render: (s) => (
        <span className="text-sm">
          {s.service_type === "ON_SITE" ? "On Site" : s.service_type === "AT_PROVIDER" ? "At Provider" : "Online"}
        </span>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      render: (s) => (
        <Badge variant={s.is_active ? "success" : "default"}>
          {s.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (s) => (
        <div className="flex justify-end gap-2">
          {s.is_active ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setServiceToDeactivate(s.id); setDialogOpen(true); }}
              disabled={setServiceActive.isPending}
            >
              Deactivate
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => executeToggleActive(s.id, true)}
              disabled={setServiceActive.isPending}
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
      activeHref="/dashboard/admin/services"
      title="Services"
      description="Manage all services"
      userName="Admin"
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">Services</h1>
          <div className="relative w-full sm:w-auto">
            <input
              type="search"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Search services..."
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

        <FilterBar onClear={handleClearFilters} showClear={categoryFilter !== "All" || activeFilter !== "All" || searchInput !== ""}>
          <Select
            label="Category"
            value={categoryFilter}
            onChange={handleFilterChange(setCategoryFilter)}
            options={categoryOptions}
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
          <LoadingState message="Loading services..." />
        ) : error ? (
          <ErrorState message={error} action={<Button onClick={() => refetch()}>Retry</Button>} />
        ) : (
          <>
            <Table
              columns={columns}
              data={services}
              rowKey={(s) => s.id}
              emptyState={<EmptyState title="No services found" description="Adjust your filters." />}
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
        onConfirm={handleConfirmDeactivate}
        title="Deactivate Service"
        description="Are you sure you want to deactivate this service?"
        variant="danger"
        confirmText="Deactivate"
        loading={setServiceActive.isPending}
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
