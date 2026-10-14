import type { UserRole } from "@/types/auth";

export interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  profile_image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUserDetail extends AdminUser {
  booking_count: number;
  review_count: number;
  complaint_count: number;
}

export interface AdminUserListParams {
  page?: number;
  page_size?: number;
  q?: string;
  role?: UserRole;
  is_active?: boolean;
}

export interface UserStatusUpdatePayload {
  is_active: boolean;
}
