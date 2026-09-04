import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  deleteContent,
  generateContent,
  generateAllContent,
  getContentByProduct,
  getContentHistory,
  getUsageStats,
  regenerateContent,
  selectVariant,
  type ContentGenerationOptions,
} from '@services/generatedContent.service';
import {
  contentRecordsToBlocks,
  type BackendContent,
} from '@services/mappers';
import type { ContentBlock } from '@components/posters/AIContentPanel';
import type { ContentType } from '@components/posters/AIContentPanel';
import { normalizeQueryParams } from '../utils/query';

interface ProductContentResult {
  records: BackendContent[];
  blocks: ContentBlock[];
}

export const contentKeys = {
  all: ['generated-content'] as const,
  history: (
    productId?: string,
    params: { page?: number; limit?: number } = {}
  ) => [...contentKeys.all, 'history', productId ?? 'all', normalizeQueryParams(params)] as const,
  product: (productId?: string) => [...contentKeys.all, 'product', productId ?? 'none'] as const,
  usage: () => [...contentKeys.all, 'usage'] as const,
};

export function useContentHistory(
  productId?: string,
  params: { page?: number; limit?: number } = { limit: 20 }
) {
  const normalized = normalizeQueryParams(params);
  return useQuery({
    queryKey: contentKeys.history(productId, params),
    queryFn: () => getContentHistory({ productId, ...normalized }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useGeneratedContent(productId?: string) {
  return useQuery({
    queryKey: contentKeys.product(productId),
    queryFn: () => getContentByProduct(productId!),
    enabled: Boolean(productId),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useContentUsageStats() {
  return useQuery({
    queryKey: contentKeys.usage(),
    queryFn: getUsageStats,
    placeholderData: keepPreviousData,
  });
}

export function useGenerateAllContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { productId: string; options: ContentGenerationOptions }) =>
      generateAllContent(input.productId, input.options),
    onMutate: () => toast.loading('Generating content...'),
    onSuccess: (_result, input, toastId) => {
      queryClient.invalidateQueries({ queryKey: contentKeys.all });
      queryClient.invalidateQueries({ queryKey: contentKeys.product(input.productId) });
      toast.success('Content generated successfully', { id: toastId });
    },
    onError: (_error, _input, toastId) => {
      toast.error('Content generation failed', { id: toastId });
    },
  });
}

export function useGenerateContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { productId: string; type: ContentType; options: ContentGenerationOptions }) =>
      generateContent(input.productId, input.type, input.options),
    onMutate: () => toast.loading('Generating content...'),
    onSuccess: (_result, input, toastId) => {
      queryClient.invalidateQueries({ queryKey: contentKeys.all });
      queryClient.invalidateQueries({ queryKey: contentKeys.product(input.productId) });
      toast.success('Content generated successfully', { id: toastId });
    },
    onError: (_error, _input, toastId) => {
      toast.error('Content generation failed', { id: toastId });
    },
  });
}

export function useRegenerateContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { productId: string; contentId: string; options: ContentGenerationOptions }) =>
      regenerateContent(input.contentId, input.options),
    onMutate: () => toast.loading('Generating content...'),
    onSuccess: (updatedContent, input, toastId) => {
      queryClient.setQueryData<ProductContentResult | undefined>(
        contentKeys.product(input.productId),
        (current) => {
          if (!current) return current;
          const records = current.records.map((record) =>
            record._id === updatedContent._id ? updatedContent : record
          );
          return {
            records,
            blocks: contentRecordsToBlocks(records),
          };
        }
      );
      toast.success('Content generated successfully', { id: toastId });
    },
    onError: (_error, _input, toastId) => {
      toast.error('Content generation failed', { id: toastId });
    },
  });
}

export function useSelectContentVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { contentId: string; variantIndex: number }) =>
      selectVariant(input.contentId, input.variantIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentKeys.all });
      toast.success('Variant selected.');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not select variant.'),
  });
}

export function useDeleteContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentKeys.all });
      toast.success('Content deleted.');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not delete content.'),
  });
}
