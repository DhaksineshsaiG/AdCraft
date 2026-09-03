import api from './auth.service';
import type { ApiResponse, Pagination } from './api.types';
import {
  contentRecordsToBlocks,
  toBackendContentType,
  type BackendContent,
} from './mappers';
import type { ContentBlock, ContentType } from '@components/posters/AIContentPanel';
import type { PosterStyle } from '@components/posters/PosterCard';

export interface ContentGenerationOptions {
  style: PosterStyle;
  tone?: 'friendly' | 'professional' | 'luxurious' | 'playful' | 'urgent' | 'enthusiastic' | 'humorous' | 'inspirational';
  language?: 'en';
  variantCount?: number;
  customInstructions?: string;
}

export interface ContentHistoryResult {
  records: BackendContent[];
  pagination: Pagination;
}

const defaultGenerationBody = (options: ContentGenerationOptions) => ({
  style: options.style,
  tone: options.tone ?? 'friendly',
  language: options.language ?? 'en',
  variantCount: options.variantCount ?? 3,
  customInstructions: options.customInstructions,
});

export async function getContentByProduct(productId: string): Promise<{ records: BackendContent[]; blocks: ContentBlock[] }> {
  const { data } = await api.get<ApiResponse<{ records: BackendContent[] }>>(`/generated-content/product/${productId}`);
  return {
    records: data.data.records,
    blocks: contentRecordsToBlocks(data.data.records),
  };
}

export async function getContentHistory(params: { productId?: string; page?: number; limit?: number } = {}): Promise<ContentHistoryResult> {
  const { data } = await api.get<ApiResponse<ContentHistoryResult>>('/generated-content/history', { params });
  return data.data;
}

export async function getUsageStats(): Promise<{ totalRequests?: number; totalTokens?: number; estimatedCostUsd?: number }> {
  const { data } = await api.get<ApiResponse<{ stats: { totalRequests?: number; totalTokens?: number; estimatedCostUsd?: number } }>>('/generated-content/usage-stats');
  return data.data.stats;
}

export async function generateAllContent(productId: string, options: ContentGenerationOptions): Promise<void> {
  await api.post(`/generated-content/generate-all/${productId}`, defaultGenerationBody(options));
}

export async function generateContent(productId: string, type: ContentType, options: ContentGenerationOptions): Promise<BackendContent> {
  const { data } = await api.post<ApiResponse<{ content: BackendContent }>>(`/generated-content/generate/${productId}`, {
    ...defaultGenerationBody(options),
    contentType: toBackendContentType(type),
  });
  return data.data.content;
}

export async function regenerateContent(contentId: string, options: ContentGenerationOptions): Promise<BackendContent> {
  const { data } = await api.post<ApiResponse<{ content: BackendContent }>>(`/generated-content/regenerate/${contentId}`, {
    ...defaultGenerationBody(options),
  });
  return data.data.content;
}

export async function selectVariant(contentId: string, variantIndex: number): Promise<void> {
  await api.patch(`/generated-content/${contentId}/select-variant`, { variantIndex });
}

export async function deleteContent(contentId: string): Promise<void> {
  await api.delete(`/generated-content/${contentId}`);
}
