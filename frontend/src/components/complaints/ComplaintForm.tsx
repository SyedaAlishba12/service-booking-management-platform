/**
 * @file ComplaintForm.tsx
 * @description Form to create a new complaint
 */

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Toast from "@/components/ui/Toast";
import { getApiErrorMessage } from "@/utils/api_error_handler";
import { useCreateComplaint } from "@/hooks/useCreateComplaint";
import type { AdminComplaint, ComplaintType } from "@/types/complaint";

export interface ComplaintFormProps {
  defaultType?: ComplaintType;
  defaultBookingId?: string;
  defaultProviderId?: string;
  onSuccess?: (complaint: AdminComplaint) => void;
  onCancel?: () => void;
  requestOptions?: RequestInit;
}

const TYPE_OPTIONS = [
  { label: "Booking Issue", value: "BOOKING" },
  { label: "Provider Issue", value: "PROVIDER" },
  { label: "Payment Issue", value: "PAYMENT" },
  { label: "Platform Issue", value: "PLATFORM" },
  { label: "Other", value: "OTHER" },
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ComplaintForm({
  defaultType = "OTHER",
  defaultBookingId = "",
  defaultProviderId = "",
  onSuccess,
  onCancel,
  requestOptions,
}: ComplaintFormProps) {
  const [complaintType, setComplaintType] = useState<ComplaintType>(defaultType);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [bookingId, setBookingId] = useState(defaultBookingId);
  const [providerId, setProviderId] = useState(defaultProviderId);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  
  const [toast, setToast] = useState<{ open: boolean; variant: "success" | "error"; message: string }>({
    open: false, variant: "success", message: ""
  });

  const createComplaint = useCreateComplaint();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!subject.trim()) newErrors.subject = "Subject is required.";
    else if (subject.length > 200) newErrors.subject = "Subject cannot exceed 200 characters.";

    if (!description.trim()) newErrors.description = "Description is required.";
    else if (description.length > 5000) newErrors.description = "Description cannot exceed 5000 characters.";

    if (complaintType === "BOOKING" || complaintType === "PAYMENT") {
      if (!bookingId.trim() && !defaultBookingId) newErrors.bookingId = "Booking ID is required for this complaint type.";
      else if (bookingId && !UUID_REGEX.test(bookingId)) newErrors.bookingId = "Must be a valid UUID.";
    }

    if (complaintType === "PROVIDER") {
      if (!providerId.trim() && !defaultProviderId) newErrors.providerId = "Provider ID is required for this complaint type.";
      else if (providerId && !UUID_REGEX.test(providerId)) newErrors.providerId = "Must be a valid UUID.";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    
    if (!validate()) return;

    try {
      const payload = {
        complaint_type: complaintType,
        subject: subject.trim(),
        description: description.trim(),
        booking_id: bookingId.trim() || defaultBookingId || null,
        provider_id: providerId.trim() || defaultProviderId || null,
      };

      const created = await createComplaint.mutateAsync({ payload, requestOptions });
      setToast({ open: true, variant: "success", message: "Complaint submitted successfully." });
      onSuccess?.(created);
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, "Failed to submit complaint."));
    }
  };

  const showBookingId = (complaintType === "BOOKING" || complaintType === "PAYMENT") && !defaultBookingId;
  const showProviderId = complaintType === "PROVIDER" && !defaultProviderId;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <Select
        label="Complaint Type"
        value={complaintType}
        onChange={(e) => {
          setComplaintType(e.target.value as ComplaintType);
          setErrors({});
        }}
        options={TYPE_OPTIONS}
        disabled={createComplaint.isPending}
      />

      {showBookingId && (
        <Input
          label="Booking ID"
          value={bookingId}
          onChange={(e) => setBookingId(e.target.value)}
          error={errors.bookingId}
          disabled={createComplaint.isPending}
        />
      )}

      {showProviderId && (
        <Input
          label="Provider ID"
          value={providerId}
          onChange={(e) => setProviderId(e.target.value)}
          error={errors.providerId}
          disabled={createComplaint.isPending}
        />
      )}

      <Input
        label="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        maxLength={200}
        error={errors.subject}
        disabled={createComplaint.isPending}
      />

      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={5000}
        error={errors.description}
        disabled={createComplaint.isPending}
        rows={6}
      />

      {submitError && (
        <div className="text-danger text-sm">{submitError}</div>
      )}

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={createComplaint.isPending}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={createComplaint.isPending}>
          {createComplaint.isPending ? "Submitting..." : "Submit Complaint"}
        </Button>
      </div>

      <div className="fixed bottom-4 right-4 z-50">
        <Toast
          open={toast.open}
          onClose={() => setToast({ ...toast, open: false })}
          variant={toast.variant}
          message={toast.message}
        />
      </div>
    </form>
  );
}
