export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export type MongoId = string;

export function getId(value: { _id?: string; id?: string } | string | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.id ?? value._id ?? '';
}
