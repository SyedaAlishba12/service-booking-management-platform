/**
 * Reusable complaint submission form. Defaults may bind it to a booking or provider.
 */

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Toast from "@/components/ui/Toast";
import { getApiErrorMessage } from "@/utils/api_error_handler";
import { useCreateComplaint } from "@/hooks/useCreateComplaint";
import type { AdminComplaint, ComplaintType } from "@/types/complaint";
import { complaintFormSchema, type ComplaintFormValues } from "@/schemas/complaintSchemas";

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

export default function ComplaintForm({
  defaultType = "OTHER",
  defaultBookingId = "",
  defaultProviderId = "",
  onSuccess,
  onCancel,
  requestOptions,
}: ComplaintFormProps) {
  const [toast, setToast] = useState<{ open: boolean; variant: "success" | "error"; message: string }>({
    open: false, variant: "success", message: "",
  });
  const [submitError, setSubmitError] = useState("");
  const { register, handleSubmit, control, formState: { errors } } = useForm<ComplaintFormValues>({
    resolver: zodResolver(complaintFormSchema),
    defaultValues: {
      complaint_type: defaultType,
      booking_id: defaultBookingId,
      provider_id: defaultProviderId,
      subject: "",
      description: "",
    },
  });
  const complaintType = useWatch({ control, name: "complaint_type" });
  const createComplaint = useCreateComplaint();
  const isSubmitting = createComplaint.isPending;

  const onSubmit = async (values: ComplaintFormValues) => {
    setSubmitError("");
    try {
      const created = await createComplaint.mutateAsync({
        payload: {
          complaint_type: values.complaint_type,
          subject: values.subject.trim(),
          description: values.description.trim(),
          booking_id: values.booking_id.trim() || null,
          provider_id: values.provider_id.trim() || null,
        },
        requestOptions,
      });
      setToast({ open: true, variant: "success", message: "Complaint submitted successfully." });
      onSuccess?.(created);
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, "Failed to submit complaint."));
    }
  };

  const showBookingId = (complaintType === "BOOKING" || complaintType === "PAYMENT") && !defaultBookingId;
  const showProviderId = complaintType === "PROVIDER" && !defaultProviderId;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
      <Select label="Complaint Type" {...register("complaint_type")} options={TYPE_OPTIONS} disabled={isSubmitting} />
      {showBookingId && <Input label="Booking ID" {...register("booking_id")} error={errors.booking_id?.message} disabled={isSubmitting} />}
      {showProviderId && <Input label="Provider ID" {...register("provider_id")} error={errors.provider_id?.message} disabled={isSubmitting} />}
      <Input label="Subject" {...register("subject")} maxLength={200} error={errors.subject?.message} disabled={isSubmitting} />
      <Textarea label="Description" {...register("description")} maxLength={5000} error={errors.description?.message} disabled={isSubmitting} rows={6} />
      {submitError && <div className="text-danger text-sm">{submitError}</div>}
      <div className="flex justify-end gap-3">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>}
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Submitting..." : "Submit Complaint"}</Button>
      </div>
      <div className="fixed bottom-4 right-4 z-50">
        <Toast open={toast.open} onClose={() => setToast({ ...toast, open: false })} variant={toast.variant} message={toast.message} />
      </div>
    </form>
  );
}
