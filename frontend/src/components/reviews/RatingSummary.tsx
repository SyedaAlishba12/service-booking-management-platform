/**
 * @file RatingSummary.tsx
 * @description Displays the average rating, total count, and a 5-to-1 breakdown
 */

import { useProviderRating } from "@/hooks/useProviderRating";
import Rating from "@/components/ui/Rating";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import type { ProviderRatingSummary } from "@/types/review";

export type RatingSummaryProps =
  | { providerId: string; summary?: never }
  | { summary: ProviderRatingSummary; providerId?: never };

export default function RatingSummary({ providerId, summary: explicitSummary }: RatingSummaryProps) {
  const query = useProviderRating(providerId || "");
  
  const isLoading = providerId && query.isLoading;
  const error = providerId && query.error;
  const summary = explicitSummary || query.data;

  if (isLoading) return <LoadingState message="Loading rating..." />;
  if (error) return <ErrorState message="Failed to load rating" />;
  if (!summary) return null;

  const { average_rating, total_reviews, breakdown } = summary;

  if (total_reviews === 0) {
    return <div className="text-muted text-sm py-4">No reviews yet</div>;
  }

  const ratings = ["5", "4", "3", "2", "1"] as const;

  return (
    <div className="flex flex-col gap-4 max-w-sm">
      <div className="flex items-end gap-3">
        <h2 className="text-4xl font-bold text-foreground">{average_rating.toFixed(2)}</h2>
        <div className="flex flex-col gap-1 pb-1">
          <Rating value={average_rating} showValue={false} size="lg" />
          <span className="text-sm text-muted">{total_reviews} {total_reviews === 1 ? "review" : "reviews"}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {ratings.map((star) => {
          const count = breakdown[star] || 0;
          const percentage = total_reviews > 0 ? (count / total_reviews) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-3 text-sm">
              <span className="w-12 text-muted">{star} stars</span>
              <div className="flex-1 h-2 bg-brand-soft rounded-full overflow-hidden">
                <div
                  className="h-full bg-warning transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-8 text-right text-muted">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
