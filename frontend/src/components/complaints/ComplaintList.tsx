/**
 * @file ComplaintList.tsx
 * @description List of user's complaints
 */

import { useState } from "react";
import { useMyComplaints } from "@/hooks/useMyComplaints";
import Badge from "@/components/ui/Badge";
import Pagination from "@/components/ui/Pagination";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import type { AdminComplaint, ComplaintStatus } from "@/types/complaint";

export interface ComplaintListProps {
  pageSize?: number;
  requestOptions?: RequestInit;
  onSelect?: (complaint: AdminComplaint) => void;
}

function getStatusVariant(status: ComplaintStatus) {
  switch (status) {
    case "OPEN": return "danger";
    case "IN_REVIEW": return "warning";
    case "RESOLVED": return "success";
    case "REJECTED": return "default";
    default: return "default";
  }
}

export default function ComplaintList({ pageSize = 6, requestOptions, onSelect }: ComplaintListProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useMyComplaints({ page, page_size: pageSize }, requestOptions);
  
  const [selectedComplaint, setSelectedComplaint] = useState<AdminComplaint | null>(null);

  if (isLoading) return <LoadingState message="Loading complaints..." />;
  if (error) return <ErrorState message="Failed to load complaints" action={<Button onClick={() => refetch()}>Retry</Button>} />;
  if (!data || data.items.length === 0) return <EmptyState title="You have not submitted any complaints" />;

  const handleRowClick = (complaint: AdminComplaint) => {
    if (onSelect) {
      onSelect(complaint);
    } else {
      setSelectedComplaint(complaint);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {data.items.map((complaint) => (
          <div
            key={complaint.id}
            onClick={() => handleRowClick(complaint)}
            className="p-4 rounded-lg border border-line bg-surface hover:bg-brand-soft/10 transition-colors cursor-pointer"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-foreground">{complaint.subject}</h3>
              <div className="flex gap-2">
                <Badge variant="info">{complaint.complaint_type}</Badge>
                <Badge variant={getStatusVariant(complaint.status)}>{complaint.status.replace("_", " ")}</Badge>
              </div>
            </div>
            <p className="text-sm text-muted mb-2">
              {new Date(complaint.created_at).toLocaleDateString()}
            </p>
            {complaint.admin_response && (
              <div className="mt-2 p-2 bg-brand-soft/20 rounded text-sm text-foreground">
                <span className="font-semibold">Admin response:</span> {complaint.admin_response}
              </div>
            )}
          </div>
        ))}
      </div>

      {data.meta && data.meta.total_pages > 1 && (
        <Pagination
          currentPage={data.meta.page}
          totalPages={data.meta.total_pages}
          onPageChange={setPage}
        />
      )}

      {!onSelect && (
        <Modal
          open={!!selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          title="Complaint Details"
        >
          {selectedComplaint && (
            <div className="space-y-4">
              <div>
                <span className="font-semibold text-foreground">Subject:</span>
                <p className="mt-1">{selectedComplaint.subject}</p>
              </div>
              <div className="flex gap-4">
                <div>
                  <span className="font-semibold text-foreground">Type:</span>
                  <p className="mt-1"><Badge variant="info">{selectedComplaint.complaint_type}</Badge></p>
                </div>
                <div>
                  <span className="font-semibold text-foreground">Status:</span>
                  <p className="mt-1"><Badge variant={getStatusVariant(selectedComplaint.status)}>{selectedComplaint.status.replace("_", " ")}</Badge></p>
                </div>
              </div>
              <div>
                <span className="font-semibold text-foreground">Description:</span>
                <p className="mt-1 whitespace-pre-wrap p-2 bg-surface border border-line rounded">{selectedComplaint.description}</p>
              </div>
              {selectedComplaint.admin_response && (
                <div>
                  <span className="font-semibold text-foreground">Admin Response:</span>
                  <p className="mt-1 whitespace-pre-wrap p-2 bg-brand-soft/20 rounded">{selectedComplaint.admin_response}</p>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
