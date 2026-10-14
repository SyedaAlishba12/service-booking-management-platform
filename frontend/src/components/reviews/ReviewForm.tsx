/**
 * @file ReviewForm.tsx
 * @description Form to create or edit a review
 */

import { useState } from "react";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import RatingInput from "./RatingInput";
import Dialog from "@/components/ui/Dialog";
import Toast from "@/components/ui/Toast";
import { getApiErrorMessage } from "@/utils/api_error_handler";
import { useCreateReview, useUpdateReview, useDeleteReview } from "@/hooks/useReviewMutations";
import type { Review } from "@/types/review";

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
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [toast, setToast] = useState<{ open: boolean; variant: "success" | "error"; message: string }>({
    open: false, variant: "success", message: ""
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const createReview = useCreateReview();
  const updateReview = useUpdateReview();
  const deleteReview = useDeleteReview();

  const isSubmitting = createReview.isPending || updateReview.isPending || deleteReview.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!rating) {
      setSubmitError("Please select a rating.");
      return;
    }

    try {
      if (existingReview) {
        const payload: { rating?: number; comment?: string | null } = {};
        if (rating !== existingReview.rating) payload.rating = rating;
        
        const newComment = comment.trim() || null;
        if (newComment !== existingReview.comment) payload.comment = newComment;

        // If no changes, just call onSuccess
        if (Object.keys(payload).length === 0) {
          onSuccess?.(existingReview);
          return;
        }

        const updated = await updateReview.mutateAsync({ id: existingReview.id, payload, requestOptions });
        setToast({ open: true, variant: "success", message: "Review updated successfully." });
        onSuccess?.(updated);
      } else {
        if (!bookingId) {
          setSubmitError("Booking ID is required.");
          return;
        }
        const payload = {
          booking_id: bookingId,
          rating,
          comment: comment.trim() || null,
        };
        const created = await createReview.mutateAsync({ payload, requestOptions });
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
      onSuccess?.(); // no review object for delete
    } catch (err) {
      setToast({ open: true, variant: "error", message: getApiErrorMessage(err, "Failed to delete review.") });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Rating <span className="text-danger">*</span></label>
        <RatingInput value={rating} onChange={setRating} disabled={isSubmitting} />
      </div>

      <Textarea
        label="Comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={2000}
        disabled={isSubmitting}
        placeholder="Share details of your own experience at this place"
      />

      {submitError && (
        <div className="text-danger text-sm">{submitError}</div>
      )}

      <div className="flex justify-between items-center gap-4">
        {existingReview ? (
          <Button
            type="button"
            variant="danger"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isSubmitting}
          >
            Delete review
          </Button>
        ) : (
          <div></div> // Spacer
        )}
        <div className="flex gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting || !rating}>
            {isSubmitting ? "Submitting..." : (existingReview ? "Save Changes" : "Submit Review")}
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
