
"use client";

import ProviderShell from "@/components/provider/ProviderShell";
import ReviewsPanel from "@/components/provider/ReviewsPanel";

export default function ProviderReviewsPage() {
  return (
    <ProviderShell
      activeHref="/dashboard/reviews"
      title="Customer Reviews"
      description="View your customer ratings, feedback, and reviews for your services."
    >
      <ReviewsPanel />
    </ProviderShell>
  );
}
