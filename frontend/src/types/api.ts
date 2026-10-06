export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface PaginatedData<T> {
  items: T[];
  meta: PaginationMeta;
}