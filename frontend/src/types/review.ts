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
