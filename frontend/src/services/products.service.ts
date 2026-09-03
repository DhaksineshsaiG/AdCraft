import api from './auth.service';
import type { ApiResponse, Pagination } from './api.types';
import { toProduct, type BackendProduct } from './mappers';
import type { Product } from '@components/products/ProductCard';

export interface ProductListParams {
  storeId?: string;
  processingStatus?: Product['syncStatus'];
  search?: string;
  category?: string;
  vendor?: string;
  page?: number;
  limit?: number;
}

export interface ProductAnalytics {
  totalProducts: number;
  readyForGeneration: number;
  withImages: number;
  withVariants: number;
  byProcessingStatus: Record<Product['syncStatus'], number>;
  recentlySynced: number;
}

export interface ProductListResult {
  products: Product[];
  rawProducts: BackendProduct[];
  pagination: Pagination;
}

function cleanParams(params: ProductListParams): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== '' && value !== 'all')
  ) as Record<string, string | number | boolean>;
}

export async function listProducts(params: ProductListParams = {}): Promise<ProductListResult> {
  const endpoint = params.search && params.search.trim().length >= 2 ? '/products/search' : '/products';
  const query = endpoint === '/products/search'
    ? { ...cleanParams({ ...params, search: undefined }), q: params.search }
    : cleanParams(params);
  const { data } = await api.get<ApiResponse<{ products: BackendProduct[]; pagination: Pagination }>>(endpoint, {
    params: query,
  });

  return {
    products: data.data.products.map(toProduct),
    rawProducts: data.data.products,
    pagination: data.data.pagination,
  };
}

export async function getProductAnalytics(storeId?: string): Promise<ProductAnalytics> {
  const { data } = await api.get<ApiResponse<{ analytics: ProductAnalytics }>>('/products/analytics', {
    params: storeId ? { storeId } : undefined,
  });
  return data.data.analytics;
}

export async function getCategories(storeId?: string): Promise<string[]> {
  const { data } = await api.get<ApiResponse<{ categories: string[] }>>('/products/filters/categories', {
    params: storeId ? { storeId } : undefined,
  });
  return data.data.categories;
}

export async function getVendors(storeId?: string): Promise<string[]> {
  const { data } = await api.get<ApiResponse<{ vendors: string[] }>>('/products/filters/vendors', {
    params: storeId ? { storeId } : undefined,
  });
  return data.data.vendors;
}

export async function updateProductProcessing(
  productId: string,
  action: 'markProcessing' | 'markFailed' | 'markStale',
  errorMessage?: string
): Promise<void> {
  await api.patch(`/products/${productId}/processing`, { action, errorMessage });
}
