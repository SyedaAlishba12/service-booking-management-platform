/**
 * @file ReviewList.tsx
 * @description List of reviews for a provider
 */

import { useState } from "react";
import { useProviderReviews } from "@/hooks/useProviderReviews";
import Rating from "@/components/ui/Rating";
import Pagination from "@/components/ui/Pagination";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";

export interface ReviewListProps {
  providerId: string;
  pageSize?: number;
}

export default function ReviewList({ providerId, pageSize = 6 }: ReviewListProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useProviderReviews(providerId, { page, page_size: pageSize });

  if (isLoading) return <LoadingState message="Loading reviews..." />;
  if (error) return <ErrorState message="Failed to load reviews" action={<Button onClick={() => refetch()}>Retry</Button>} />;
  if (!data || data.items.length === 0) return <EmptyState title="No reviews yet" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {data.items.map((review) => (
          <div key={review.id} className="p-4 rounded-lg border border-line bg-surface">
            <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-foreground">Customer</span>
                <span className="text-xs text-muted">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>
              <Rating value={review.rating} showValue={false} />
            </div>
            {review.comment ? (
              <p className="text-sm text-foreground whitespace-pre-wrap">{review.comment}</p>
            ) : (
              <p className="text-sm text-muted italic">No comment</p>
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
    </div>
  );
}
