export interface SearchFilters {
  query?: string;
  category_id?: string;
  location?: string;
  min_price?: number;
  max_price?: number;
  rating?: number;
  date?: string;
}

export interface SearchResult {
  id: string;
  type: "service" | "provider";
  title: string;
  description?: string;
  provider_name?: string;
  category_name?: string;
  price?: number;
  rating?: number;
  review_count?: number;
  image_url?: string;
}

export interface SearchResponse {
  items: SearchResult[];
  total: number;
}