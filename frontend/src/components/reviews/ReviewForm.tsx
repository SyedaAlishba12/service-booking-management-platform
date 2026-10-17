/**
 * Reusable create/edit/delete review form. Provide bookingId for a new review
 * or existingReview for editing; onSuccess receives the saved review.
 */

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import RatingInput from "./RatingInput";
import Dialog from "@/components/ui/Dialog";
import Toast from "@/components/ui/Toast";
import { getApiErrorMessage } from "@/utils/api_error_handler";
import { useCreateReview, useUpdateReview, useDeleteReview } from "@/hooks/useReviewMutations";
import type { Review } from "@/types/review";
import { reviewFormSchema, type ReviewFormValues } from "@/schemas/reviewSchemas";

export interface ReviewFormProps {
  bookingId?: string;
  existingReview?: Review;
  onSuccess?: (review?: Review) => void;
  onCancel?: () => void;
  requestOptions?: RequestInit;
}

export default function ReviewForm({
  bookingId,
  existingReview,
  onSuccess,
  onCancel,
  requestOptions,
}: ReviewFormProps) {
  const [toast, setToast] = useState<{ open: boolean; variant: "success" | "error"; message: string }>({
    open: false,
    variant: "success",
    message: "",
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const { control, register, handleSubmit, formState: { errors }, reset } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      rating: existingReview?.rating || 0,
      comment: existingReview?.comment || "",
    },
  });

  const createReview = useCreateReview();
  const updateReview = useUpdateReview();
  const deleteReview = useDeleteReview();
  const isSubmitting = createReview.isPending || updateReview.isPending || deleteReview.isPending;

  const onSubmit = async (values: ReviewFormValues) => {
    setSubmitError("");
    try {
      if (existingReview) {
        const payload: { rating?: number; comment?: string | null } = {};
        if (values.rating !== existingReview.rating) payload.rating = values.rating;
        const newComment = values.comment.trim() || null;
        if (newComment !== existingReview.comment) payload.comment = newComment;

        if (Object.keys(payload).length === 0) {
          onSuccess?.(existingReview);
          return;
        }

        const updated = await updateReview.mutateAsync({ id: existingReview.id, payload, requestOptions });
        reset({ rating: updated.rating, comment: updated.comment || "" });
        setToast({ open: true, variant: "success", message: "Review updated successfully." });
        onSuccess?.(updated);
      } else {
        if (!bookingId) {
          setSubmitError("Booking ID is required.");
          return;
        }
        const created = await createReview.mutateAsync({
          payload: { booking_id: bookingId, rating: values.rating, comment: values.comment.trim() || null },
          requestOptions,
        });
        setToast({ open: true, variant: "success", message: "Review submitted successfully." });
        onSuccess?.(created);
      }
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, "Failed to submit review."));
    }
  };

  const handleDelete = async () => {
    if (!existingReview) return;
    try {
      await deleteReview.mutateAsync({ id: existingReview.id, requestOptions });
      setToast({ open: true, variant: "success", message: "Review deleted successfully." });
      setDeleteDialogOpen(false);
      onSuccess?.();
    } catch (err) {
      setToast({ open: true, variant: "error", message: getApiErrorMessage(err, "Failed to delete review.") });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Rating <span className="text-danger">*</span>
        </label>
        <Controller
          name="rating"
          control={control}
          render={({ field }) => (
            <RatingInput value={field.value} onChange={field.onChange} disabled={isSubmitting} />
          )}
        />
        {errors.rating && <p className="mt-1.5 text-sm text-danger">{errors.rating.message}</p>}
      </div>

      <Textarea
        label="Comment"
        {...register("comment")}
        error={errors.comment?.message}
        maxLength={2000}
        disabled={isSubmitting}
        placeholder="Share details of your own experience at this place"
      />

      {submitError && <div className="text-danger text-sm">{submitError}</div>}

      <div className="flex justify-between items-center gap-4">
        {existingReview ? (
          <Button type="button" variant="danger" onClick={() => setDeleteDialogOpen(true)} disabled={isSubmitting}>
            Delete review
          </Button>
        ) : <div />}
        <div className="flex gap-3">
          {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : existingReview ? "Save Changes" : "Submit Review"}
          </Button>
        </div>
      </div>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Review"
        description="Are you sure you want to delete this review? This action cannot be undone."
        variant="danger"
        confirmText="Delete"
        loading={deleteReview.isPending}
      />

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
