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
import Rating from "@/components/ui/Rating";
import Badge from "@/components/ui/Badge";
import FilterBar from "@/components/ui/FilterBar";
import Select from "@/components/ui/Select";
import { getApiErrorMessage } from "@/utils/api_error_handler";
import { adminSidebarItems } from "@/constants/admin_sidebar";
import { useAdminReviews, useSetReviewVisibility } from "@/hooks/useAdminReviews";
import type { AdminReview } from "@/types/review";

export default function ReviewsPage() {
  const [page, setPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState<string>("All");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("All");

  const queryParams = {
    page,
    page_size: 10,
    ...(ratingFilter !== "All" && { rating: Number(ratingFilter) }),
    ...(visibilityFilter !== "All" && { is_visible: visibilityFilter === "Visible" }),
  };

  const { data, isLoading, error: queryError, refetch } = useAdminReviews(queryParams);
  const setVisibility = useSetReviewVisibility();

  const error = queryError ? getApiErrorMessage(queryError, "Failed to load reviews") : null;

  const [toast, setToast] = useState<{ open: boolean; variant: "success" | "error"; message: string }>({
    open: false,
    variant: "success",
    message: "",
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewToHide, setReviewToHide] = useState<AdminReview | null>(null);

  const reviews = data?.items || [];
  const meta = data?.meta;

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setter(e.target.value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setRatingFilter("All");
    setVisibilityFilter("All");
    setPage(1);
  };

  const handleConfirmHide = async () => {
    if (!reviewToHide) return;
    try {
      await setVisibility.mutateAsync({ id: reviewToHide.id, is_visible: false });
      setToast({ open: true, variant: "success", message: "Review hidden successfully" });
      setDialogOpen(false);
    } catch (err) {
      setToast({
        open: true,
        variant: "error",
        message: getApiErrorMessage(err, "Failed to hide review"),
      });
    }
  };

  const handleShow = async (id: string) => {
    try {
      await setVisibility.mutateAsync({ id, is_visible: true });
      setToast({ open: true, variant: "success", message: "Review visible successfully" });
    } catch (err) {
      setToast({
        open: true,
        variant: "error",
        message: getApiErrorMessage(err, "Failed to show review"),
      });
    }
  };

  const columns: Column<AdminReview>[] = [
    {
      key: "rating",
      header: "Rating",
      render: (r) => <Rating value={r.rating} />,
    },
    {
      key: "comment",
      header: "Comment",
      render: (r) => {
        if (!r.comment) return <span className="text-muted">No comment</span>;
        const isTruncated = r.comment.length > 50;
        return (
          <span title={r.comment}>
            {isTruncated ? `${r.comment.slice(0, 50)}...` : r.comment}
          </span>
        );
      },
    },
    {
      key: "provider_id",
      header: "Provider",
      render: (r) => (
        <span title={r.provider_id}>
          {r.provider_id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: "user_id",
      header: "Reviewer",
      render: (r) => (
        <span title={r.user_id}>
          {r.user_id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      render: (r) => new Date(r.created_at).toLocaleDateString(),
    },
    {
      key: "is_visible",
      header: "Visibility",
      render: (r) => (
        <Badge variant={r.is_visible ? "success" : "default"}>
          {r.is_visible ? "Visible" : "Hidden"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-2">
          {r.is_visible ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => { setReviewToHide(r); setDialogOpen(true); }}
              disabled={setVisibility.isPending}
            >
              Hide
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleShow(r.id)}
              disabled={setVisibility.isPending}
            >
              Show
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      sidebarItems={adminSidebarItems}
      activeHref="/dashboard/admin/reviews"
      title="Reviews"
      description="Manage user reviews"
      userName="Admin"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">Reviews</h1>
        </div>

        <FilterBar onClear={handleClearFilters} showClear={ratingFilter !== "All" || visibilityFilter !== "All"}>
          <Select
            label="Rating"
            value={ratingFilter}
            onChange={handleFilterChange(setRatingFilter)}
            options={[
              { label: "All", value: "All" },
              { label: "1 Star", value: "1" },
              { label: "2 Stars", value: "2" },
              { label: "3 Stars", value: "3" },
              { label: "4 Stars", value: "4" },
              { label: "5 Stars", value: "5" },
            ]}
          />
          <Select
            label="Visibility"
            value={visibilityFilter}
            onChange={handleFilterChange(setVisibilityFilter)}
            options={[
              { label: "All", value: "All" },
              { label: "Visible", value: "Visible" },
              { label: "Hidden", value: "Hidden" },
            ]}
          />
        </FilterBar>

        {isLoading ? (
          <LoadingState message="Loading reviews..." />
        ) : error ? (
          <ErrorState message={error} action={<Button onClick={() => refetch()}>Retry</Button>} />
        ) : (
          <>
            <Table
              columns={columns}
              data={reviews}
              rowKey={(r) => r.id}
              emptyState={<EmptyState title="No reviews found" description="Adjust your filters or wait for users to leave reviews." />}
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
        onConfirm={handleConfirmHide}
        title="Hide Review"
        description="Are you sure you want to hide this review? It will no longer be visible to users."
        variant="danger"
        confirmText="Hide"
        loading={setVisibility.isPending}
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
