/**
 * @file types/api.types.ts
 * @description Shared API response shape generics.
 * All service functions should return one of these shapes.
 */

/** Standard single-resource response */
export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
  status: "success" | "error";
};

/** Paginated list response */
export type PaginatedResponse<T> = ApiResponse<{
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}>;
