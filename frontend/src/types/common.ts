export type UserRole = "CUSTOMER" | "PROVIDER" | "ADMIN";

export interface SelectOption {
  label: string;
  value: string;
}

export interface QueryParams {
  page?: number;
  page_size?: number;
  search?: string;
}