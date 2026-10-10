export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryCreatePayload {
  name: string;
  slug?: string;
  description?: string;
  image_url?: string;
  display_order?: number;
}

export interface CategoryUpdatePayload {
  name?: string;
  slug?: string;
  description?: string;
  image_url?: string;
  display_order?: number;
  is_active?: boolean;
}
