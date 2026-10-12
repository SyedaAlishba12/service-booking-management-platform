export type UserRole = "CUSTOMER" | "PROVIDER" | "ADMIN";

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  profile_image_url: string | null;
  is_active: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RefreshResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  full_name: string;
  email: string;
  phone?: string | null;
  password: string;
  role: "CUSTOMER" | "PROVIDER";
}

export interface UserUpdateRequest {
  full_name?: string;
  phone?: string | null;
  profile_image_url?: string | null;
}