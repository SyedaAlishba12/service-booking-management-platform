"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Table, { Column } from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Modal from "@/components/ui/Modal";
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
import { useAuth } from "@/app/providers/AuthProvider";
import { useAdminUsers, useAdminUserDetail, useUpdateUserStatus } from "@/hooks/useAdminUsers";
import { useDebounce } from "@/hooks/useDebounce";
import type { AdminUser, AdminUserListParams } from "@/types/admin_user";
import type { UserRole } from "@/types/auth";

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const queryParams: AdminUserListParams = {
    page,
    page_size: 10,
    ...(roleFilter !== "All" && { role: roleFilter as UserRole }),
    ...(activeFilter !== "All" && { is_active: activeFilter === "Active" }),
    ...(debouncedSearchQuery.trim() !== "" && { q: debouncedSearchQuery.trim() }),
  };

  const { data, isLoading, error: queryError, refetch } = useAdminUsers(queryParams);
  const updateUserStatus = useUpdateUserStatus();

  // State for user detail modal
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const { data: userDetail, isLoading: isDetailLoading } = useAdminUserDetail(detailUserId);

  const error = queryError ? getApiErrorMessage(queryError, "Failed to load users") : null;

  const [toast, setToast] = useState<{ open: boolean; variant: "success" | "error"; message: string }>({
    open: false,
    variant: "success",
    message: "",
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<{ user: AdminUser; type: "Activate" | "Deactivate" } | null>(null);

  const users = data?.items || [];
  const meta = data?.meta;

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value);
    setPage(1);
  };

  const handleActiveChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveFilter(e.target.value);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setRoleFilter("All");
    setActiveFilter("All");
    setSearchQuery("");
    setPage(1);
  };

  const openActionDialog = (user: AdminUser, type: "Activate" | "Deactivate") => {
    setDialogAction({ user, type });
    setDialogOpen(true);
  };

  const handleConfirmDialog = async () => {
    if (!dialogAction) return;

    const { user, type } = dialogAction;
    const isActivating = type === "Activate";

    try {
      await updateUserStatus.mutateAsync({
        id: user.id,
        payload: { is_active: isActivating },
      });
      setToast({
        open: true,
        variant: "success",
        message: `User ${user.full_name} ${isActivating ? "activated" : "deactivated"} successfully`,
      });
    } catch (err) {
      setToast({
        open: true,
        variant: "error",
        message: getApiErrorMessage(err, `Failed to ${type.toLowerCase()} user`),
      });
    } finally {
      setDialogOpen(false);
      setDialogAction(null);
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case "ADMIN":
        return "plum";
      case "PROVIDER":
        return "default";
      case "CUSTOMER":
        return "warning";
      default:
        return "default";
    }
  };

  const columns: Column<AdminUser>[] = [
    {
      key: "user",
      header: "User",
      render: (u) => {
        const isSelf = currentUser?.id === u.id;
        const initials = u.full_name
          ? u.full_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase()
          : "U";

        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
              {u.profile_image_url ? (
                <img
                  src={u.profile_image_url}
                  alt={u.full_name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground truncate">{u.full_name}</span>
                {isSelf && (
                  <Badge variant="plum" className="text-[10px] px-1.5 py-0.5">
                    You
                  </Badge>
                )}
              </div>
              <span className="block text-xs text-muted truncate">{u.email}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: "phone",
      header: "Phone",
      render: (u) => <span className="text-muted">{u.phone || "—"}</span>,
    },
    {
      key: "role",
      header: "Role",
      render: (u) => <Badge variant={getRoleBadgeVariant(u.role)}>{u.role}</Badge>,
    },
    {
      key: "is_active",
      header: "Status",
      render: (u) => (
        <Badge variant={u.is_active ? "success" : "danger"}>
          {u.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "created_at",
      header: "Registered",
      render: (u) => (
        <span className="text-muted">
          {new Date(u.created_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (u) => {
        const isSelf = currentUser?.id === u.id;

        return (
          <div className="flex justify-end gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailUserId(u.id)}
            >
              Details
            </Button>

            {u.is_active ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => openActionDialog(u, "Deactivate")}
                disabled={isSelf || updateUserStatus.isPending}
                title={isSelf ? "You cannot deactivate your own account" : undefined}
              >
                Deactivate
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => openActionDialog(u, "Activate")}
                disabled={updateUserStatus.isPending}
              >
                Activate
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DashboardLayout
      sidebarItems={adminSidebarItems}
      activeHref="/dashboard/admin/users"
      title="Users"
      description="Manage platform accounts, roles, and access statuses"
      userName={currentUser?.full_name || "Admin"}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-sm text-muted">
              View all registered users and toggle account access.
            </p>
          </div>
          <div className="relative w-full sm:w-auto">
            <input
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by name or email..."
              className="input min-h-10 pl-11 w-full sm:w-72"
              aria-label="Search users"
            />
            <span
              aria-hidden="true"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                <circle cx="8.75" cy="8.75" r="5.25" stroke="currentColor" strokeWidth="1.7" />
                <path
                  d="M12.75 12.75L17 17"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </div>
        </div>

        <FilterBar
          onClear={handleClearFilters}
          showClear={roleFilter !== "All" || activeFilter !== "All" || searchQuery.trim() !== ""}
        >
          <Select
            label="Role"
            value={roleFilter}
            onChange={handleRoleChange}
            options={[
              { label: "All Roles", value: "All" },
              { label: "Customer", value: "CUSTOMER" },
              { label: "Provider", value: "PROVIDER" },
              { label: "Admin", value: "ADMIN" },
            ]}
          />
          <Select
            label="Account Status"
            value={activeFilter}
            onChange={handleActiveChange}
            options={[
              { label: "All Statuses", value: "All" },
              { label: "Active", value: "Active" },
              { label: "Inactive", value: "Inactive" },
            ]}
          />
        </FilterBar>

        {isLoading ? (
          <LoadingState message="Loading platform users..." />
        ) : error ? (
          <ErrorState
            message={error}
            action={<Button onClick={() => refetch()}>Retry</Button>}
          />
        ) : (
          <>
            <Table
              columns={columns}
              data={users}
              rowKey={(u) => u.id}
              emptyState={
                <EmptyState
                  title="No users found"
                  description="Try adjusting your search terms or filters to find what you're looking for."
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

      {/* Confirmation Dialog for Activate/Deactivate */}
      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setDialogAction(null);
        }}
        onConfirm={handleConfirmDialog}
        title={
          dialogAction?.type === "Deactivate"
            ? "Deactivate User Account"
            : "Activate User Account"
        }
        description={
          dialogAction?.type === "Deactivate"
            ? `Are you sure you want to deactivate ${dialogAction?.user.full_name} (${dialogAction?.user.email})? Inactive users will immediately be blocked from logging into the platform.`
            : `Are you sure you want to activate ${dialogAction?.user.full_name} (${dialogAction?.user.email})? They will be allowed to log in and use their account.`
        }
        variant={dialogAction?.type === "Deactivate" ? "danger" : "primary"}
        confirmText={dialogAction?.type === "Deactivate" ? "Deactivate" : "Activate"}
        loading={updateUserStatus.isPending}
      />

      {/* User Detail Modal */}
      <Modal
        open={!!detailUserId}
        onClose={() => setDetailUserId(null)}
        title="User Details"
        description="Comprehensive user profile and activity summary"
        size="md"
      >
        {isDetailLoading ? (
          <LoadingState message="Loading user details..." />
        ) : userDetail ? (
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-brand-soft/40 border border-line">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-soft text-lg font-bold text-brand">
                {userDetail.profile_image_url ? (
                  <img
                    src={userDetail.profile_image_url}
                    alt={userDetail.full_name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  userDetail.full_name.substring(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-foreground text-lg truncate">
                  {userDetail.full_name}
                </h3>
                <p className="text-sm text-muted truncate">{userDetail.email}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant={getRoleBadgeVariant(userDetail.role)}>
                    {userDetail.role}
                  </Badge>
                  <Badge variant={userDetail.is_active ? "success" : "danger"}>
                    {userDetail.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-line p-3 text-center bg-surface">
                <span className="block text-2xl font-bold text-foreground">
                  {userDetail.booking_count}
                </span>
                <span className="text-xs text-muted font-medium">Bookings</span>
              </div>
              <div className="rounded-xl border border-line p-3 text-center bg-surface">
                <span className="block text-2xl font-bold text-foreground">
                  {userDetail.review_count}
                </span>
                <span className="text-xs text-muted font-medium">Reviews</span>
              </div>
              <div className="rounded-xl border border-line p-3 text-center bg-surface">
                <span className="block text-2xl font-bold text-foreground">
                  {userDetail.complaint_count}
                </span>
                <span className="text-xs text-muted font-medium">Complaints</span>
              </div>
            </div>

            <div className="space-y-2 text-sm text-foreground">
              <div className="flex justify-between py-1.5 border-b border-line">
                <span className="text-muted">User ID</span>
                <span className="font-mono text-xs">{userDetail.id}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-line">
                <span className="text-muted">Phone Number</span>
                <span>{userDetail.phone || "Not provided"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-line">
                <span className="text-muted">Registered On</span>
                <span>{new Date(userDetail.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted">Last Updated</span>
                <span>{new Date(userDetail.updated_at).toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setDetailUserId(null)}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <EmptyState title="User not found" description="Unable to load details for this user." />
        )}
      </Modal>

      {/* Feedback Toast */}
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
