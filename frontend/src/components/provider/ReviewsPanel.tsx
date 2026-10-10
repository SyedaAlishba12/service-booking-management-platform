"use client";

import { USE_MOCK } from "@/api/provider_api";
import { RatingSummaryCard } from "@/components/provider-dashboard/SummaryCards";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import Rating from "@/components/ui/Rating";
import { useMyReviews, useProviderRating } from "@/hooks/useProviderDashboard";
import { useMyProvider } from "@/hooks/useProviderProfile";
import { getApiErrorMessage } from "@/utils/api_error_handler";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Overall rating, breakdown and review list (Taha's review API; sample data in mock mode). */
export default function ReviewsPanel() {
  const provider = useMyProvider();
  const rating = useProviderRating(provider.data?.id);
  const reviews = useMyReviews(provider.data?.id);

  if (provider.isLoading || rating.isLoading || reviews.isLoading) {
    return <LoadingState message="Loading reviews..." />;
  }
  if (provider.isError || rating.isError || reviews.isError || !rating.data || !reviews.data) {
    return (
      <ErrorState
        message={getApiErrorMessage(provider.error ?? rating.error ?? reviews.error)}
        action={
          <Button
            onClick={() => {
              provider.refetch();
              rating.refetch();
              reviews.refetch();
            }}
          >
            Try again
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <RatingSummaryCard rating={rating.data} sample={USE_MOCK} />
      </div>

      <div className="space-y-4 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">Customer reviews</h3>
          {USE_MOCK && <Badge variant="warning">Sample data</Badge>}
        </div>

        {reviews.data.length === 0 ? (
          <EmptyState title="No reviews yet" description="Reviews appear here after customers complete a booking." />
        ) : (
          reviews.data.map((review) => (
            <Card key={review.id}>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{review.customer_name}</p>
                    <p className="text-xs text-muted">
                      {review.service_name ? `${review.service_name} · ` : ""}
                      {formatDate(review.created_at)}
                    </p>
                  </div>
                  <Rating value={review.rating} size="sm" showValue={false} />
                </div>
                {review.comment && <p className="text-sm text-muted">{review.comment}</p>}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
