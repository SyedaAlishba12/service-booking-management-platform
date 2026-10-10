export type ComplaintStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED";
export type ComplaintType = "BOOKING" | "PROVIDER" | "PAYMENT" | "PLATFORM" | "OTHER";

export interface AdminComplaint {
  id: string;
  user_id: string;
  booking_id: string | null;
  provider_id: string | null;
  complaint_type: ComplaintType;
  subject: string;
  description: string;
  status: ComplaintStatus;
  admin_response: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplaintListParams {
  page: number;
  page_size: number;
  status?: ComplaintStatus;
  complaint_type?: ComplaintType;
}

export interface ComplaintUpdatePayload {
  status: ComplaintStatus;
  admin_response?: string | null;
}
