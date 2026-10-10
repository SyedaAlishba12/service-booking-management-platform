export interface AdminReview {
  id: string;
  booking_id: string;
  user_id: string;
  provider_id: string;
  service_id: string;
  rating: number;
  comment: string | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewListParams {
  page: number;
  page_size: number;
  rating?: number;
  is_visible?: boolean;
}

export type Review = AdminReview;

export type RatingBreakdown = Record<"1"|"2"|"3"|"4"|"5", number>;

export interface ProviderRatingSummary {
  provider_id: string;
  average_rating: number;
  total_reviews: number;
  breakdown: RatingBreakdown;
}

export interface ReviewCreatePayload {
  booking_id: string;
  rating: number;
  comment?: string | null;
}

export interface ReviewUpdatePayload {
  rating?: number;
  comment?: string | null;
}
