import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  getCategories,
  getProductAnalytics,
  getVendors,
  listProducts,
  updateProductProcessing,
  type ProductListParams,
} from '@services/products.service';
import { normalizeQueryParams } from '../utils/query';

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params: ProductListParams) => [...productKeys.lists(), normalizeQueryParams(params as Record<string, unknown>)] as const,
  analytics: (storeId?: string) => [...productKeys.all, 'analytics', storeId ?? 'all'] as const,
  categories: (storeId?: string) => [...productKeys.all, 'categories', storeId ?? 'all'] as const,
  vendors: (storeId?: string) => [...productKeys.all, 'vendors', storeId ?? 'all'] as const,
};

export function useProducts(params: ProductListParams = {}) {
  const normalized = normalizeQueryParams(params as Record<string, unknown>) as ProductListParams;
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => listProducts(normalized),
    staleTime: 60_000,
    placeholderData: (previousData, previousQuery) => {
      const prevParams = (previousQuery?.queryKey?.[2] as Record<string, unknown> | undefined);
      if (prevParams?.storeId !== normalized.storeId) {
        return undefined;
      }
      return previousData;
    },
  });
}

export function useProductAnalytics(storeId?: string) {
  return useQuery({
    queryKey: productKeys.analytics(storeId),
    queryFn: () => getProductAnalytics(storeId),
    staleTime: 60_000,
    placeholderData: (previousData, previousQuery) => {
      const prevStoreId = previousQuery?.queryKey?.[2];
      if (prevStoreId !== (storeId ?? 'all')) {
        return undefined;
      }
      return previousData;
    },
  });
}

export function useProductCategories(storeId?: string) {
  return useQuery({
    queryKey: productKeys.categories(storeId),
    queryFn: () => getCategories(storeId),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
  });
}

export function useProductVendors(storeId?: string) {
  return useQuery({
    queryKey: productKeys.vendors(storeId),
    queryFn: () => getVendors(storeId),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
  });
}

export function useUpdateProductProcessing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { productId: string; action: 'markProcessing' | 'markFailed' | 'markStale'; errorMessage?: string }) =>
      updateProductProcessing(input.productId, input.action, input.errorMessage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      toast.success('Product status updated.');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to update product.'),
  });
}
