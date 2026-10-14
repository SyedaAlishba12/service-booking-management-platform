"use client";

// TODO: admin routes are unauthenticated until Zainab's auth is merged; api_client must then send the auth header.

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Table, { Column } from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import Pagination from "@/components/ui/Pagination";
import Badge from "@/components/ui/Badge";
import FilterBar from "@/components/ui/FilterBar";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { getApiErrorMessage } from "@/utils/api_error_handler";
import { adminSidebarItems } from "@/constants/admin_sidebar";
import { useAdminComplaints, useUpdateComplaint } from "@/hooks/useAdminComplaints";
import type { AdminComplaint, ComplaintStatus, ComplaintType } from "@/types/complaint";

const STATUS_OPTIONS = [
  { label: "All", value: "All" },
  { label: "Open", value: "OPEN" },
  { label: "In Review", value: "IN_REVIEW" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "Rejected", value: "REJECTED" },
];

const TYPE_OPTIONS = [
  { label: "All", value: "All" },
  { label: "Booking", value: "BOOKING" },
  { label: "Provider", value: "PROVIDER" },
  { label: "Payment", value: "PAYMENT" },
  { label: "Platform", value: "PLATFORM" },
  { label: "Other", value: "OTHER" },
];

const ALLOWED_NEXT_STATUSES: Record<ComplaintStatus, ComplaintStatus[]> = {
  OPEN: ["IN_REVIEW", "RESOLVED", "REJECTED"],
  IN_REVIEW: ["IN_REVIEW", "RESOLVED", "REJECTED"],
  RESOLVED: [],
  REJECTED: [],
};

function getStatusVariant(status: ComplaintStatus) {
  switch (status) {
    case "OPEN": return "danger";
    case "IN_REVIEW": return "warning";
    case "RESOLVED": return "success";
    case "REJECTED": return "default";
    default: return "default";
  }
}

export default function ComplaintsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");

  const queryParams = {
    page,
    page_size: 10,
    ...(statusFilter !== "All" && { status: statusFilter as ComplaintStatus }),
    ...(typeFilter !== "All" && { complaint_type: typeFilter as ComplaintType }),
  };

  const { data, isLoading, error: queryError, refetch } = useAdminComplaints(queryParams);
  const updateComplaint = useUpdateComplaint();

  const error = queryError ? getApiErrorMessage(queryError, "Failed to load complaints") : null;

  const [toast, setToast] = useState<{ open: boolean; variant: "success" | "error"; message: string }>({
    open: false,
    variant: "success",
    message: "",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<AdminComplaint | null>(null);
  const [formData, setFormData] = useState<{ status: ComplaintStatus; admin_response: string }>({
    status: "OPEN",
    admin_response: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const complaints = data?.items || [];
  const meta = data?.meta;

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setter(e.target.value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setStatusFilter("All");
    setTypeFilter("All");
    setPage(1);
  };

  const handleOpenModal = (complaint: AdminComplaint) => {
    setSelectedComplaint(complaint);
    setFormData({
      status: complaint.status,
      admin_response: complaint.admin_response || "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedComplaint) return;
    
    const { status, admin_response } = formData;
    const isTerminal = status === "RESOLVED" || status === "REJECTED";
    
    if (isTerminal && !admin_response.trim()) {
      setFormError("Admin response is required when resolving or rejecting a complaint.");
      return;
    }
    setFormError("");

    try {
      setSubmitting(true);
      
      const payload: { status: ComplaintStatus; admin_response?: string } = { status };
      const originalResponse = selectedComplaint.admin_response || "";
      if (isTerminal || admin_response.trim() !== originalResponse.trim()) {
        payload.admin_response = admin_response.trim();
      }

      await updateComplaint.mutateAsync({ id: selectedComplaint.id, payload });
      setToast({ open: true, variant: "success", message: "Complaint updated successfully" });
      setModalOpen(false);
    } catch (err) {
      setToast({
        open: true,
        variant: "error",
        message: getApiErrorMessage(err, "Failed to update complaint"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<AdminComplaint>[] = [
    { key: "subject", header: "Subject" },
    {
      key: "complaint_type",
      header: "Type",
      render: (c) => <Badge variant="info">{c.complaint_type}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      render: (c) => <Badge variant={getStatusVariant(c.status)}>{c.status.replace("_", " ")}</Badge>,
    },
    {
      key: "user_id",
      header: "Complainant",
      render: (c) => (
        <span title={c.user_id}>
          {c.user_id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      render: (c) => new Date(c.created_at).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (c) => (
        <Button variant="outline" size="sm" onClick={() => handleOpenModal(c)}>
          Review
        </Button>
      ),
    },
  ];

  const allowedNext = selectedComplaint ? ALLOWED_NEXT_STATUSES[selectedComplaint.status] : [];
  const isTerminal = selectedComplaint?.status === "RESOLVED" || selectedComplaint?.status === "REJECTED";

  return (
    <DashboardLayout
      sidebarItems={adminSidebarItems}
      activeHref="/dashboard/admin/complaints"
      title="Complaints"
      description="Manage user complaints"
      userName="Admin"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">Complaints</h1>
        </div>

        <FilterBar onClear={handleClearFilters} showClear={statusFilter !== "All" || typeFilter !== "All"}>
          <Select
            label="Status"
            value={statusFilter}
            onChange={handleFilterChange(setStatusFilter)}
            options={STATUS_OPTIONS}
          />
          <Select
            label="Type"
            value={typeFilter}
            onChange={handleFilterChange(setTypeFilter)}
            options={TYPE_OPTIONS}
          />
        </FilterBar>

        {isLoading ? (
          <LoadingState message="Loading complaints..." />
        ) : error ? (
          <ErrorState message={error} action={<Button onClick={() => refetch()}>Retry</Button>} />
        ) : (
          <>
            <Table
              columns={columns}
              data={complaints}
              rowKey={(c) => c.id}
              onRowClick={handleOpenModal}
              emptyState={<EmptyState title="No complaints found" description="Adjust your filters or you're all caught up!" />}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Complaint Details" size="lg">
        {selectedComplaint && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold text-foreground">Subject:</span>
                <p className="mt-1 text-muted">{selectedComplaint.subject}</p>
              </div>
              <div>
                <span className="font-semibold text-foreground">Type:</span>
                <p className="mt-1"><Badge variant="info">{selectedComplaint.complaint_type}</Badge></p>
              </div>
              <div>
                <span className="font-semibold text-foreground">Created At:</span>
                <p className="mt-1 text-muted">{new Date(selectedComplaint.created_at).toLocaleString()}</p>
              </div>
              <div>
                <span className="font-semibold text-foreground">Status:</span>
                <p className="mt-1"><Badge variant={getStatusVariant(selectedComplaint.status)}>{selectedComplaint.status.replace("_", " ")}</Badge></p>
              </div>
              {selectedComplaint.booking_id && (
                <div>
                  <span className="font-semibold text-foreground">Booking ID:</span>
                  <p className="mt-1 text-muted">{selectedComplaint.booking_id}</p>
                </div>
              )}
              {selectedComplaint.provider_id && (
                <div>
                  <span className="font-semibold text-foreground">Provider ID:</span>
                  <p className="mt-1 text-muted">{selectedComplaint.provider_id}</p>
                </div>
              )}
            </div>

            <div>
              <span className="font-semibold text-sm text-foreground">Description:</span>
              <div className="mt-1 p-3 bg-brand-soft/20 rounded-md text-sm text-foreground whitespace-pre-wrap">
                {selectedComplaint.description}
              </div>
            </div>

            <div className="border-t border-line pt-4 space-y-4">
              {isTerminal ? (
                <>
                  <div>
                    <span className="font-semibold text-sm text-foreground">Admin Response:</span>
                    <div className="mt-1 p-3 bg-surface border border-line rounded-md text-sm text-foreground whitespace-pre-wrap">
                      {selectedComplaint.admin_response || "No response provided."}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Select
                    label="Update Status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ComplaintStatus })}
                    options={[
                      { label: selectedComplaint.status.replace("_", " "), value: selectedComplaint.status },
                      ...allowedNext.map(s => ({ label: s.replace("_", " "), value: s }))
                    ]}
                  />
                  <Textarea
                    label="Admin Response"
                    value={formData.admin_response}
                    onChange={(e) => setFormData({ ...formData, admin_response: e.target.value })}
                    maxLength={2000}
                    error={formError}
                    hint="Required when resolving or rejecting the complaint."
                  />
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
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
