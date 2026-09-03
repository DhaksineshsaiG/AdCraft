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

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params: ProductListParams) => [...productKeys.lists(), params] as const,
  analytics: (storeId?: string) => [...productKeys.all, 'analytics', storeId ?? 'all'] as const,
  categories: (storeId?: string) => [...productKeys.all, 'categories', storeId ?? 'all'] as const,
  vendors: (storeId?: string) => [...productKeys.all, 'vendors', storeId ?? 'all'] as const,
};

export function useProducts(params: ProductListParams = {}) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => listProducts(params),
    placeholderData: (previousData) => previousData,
    staleTime: 15_000,
  });
}

export function useProductAnalytics(storeId?: string) {
  return useQuery({
    queryKey: productKeys.analytics(storeId),
    queryFn: () => getProductAnalytics(storeId),
    placeholderData: (previousData) => previousData,
    staleTime: 15_000,
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
