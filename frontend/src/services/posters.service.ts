import axios from 'axios';
import api from './auth.service';
import type { ApiResponse, Pagination } from './api.types';
import { toPoster, type BackendPoster } from './mappers';
import type { Poster, PosterFormat, PosterSize, PosterStatus, PosterStyle } from '@components/posters/PosterCard';

const GENERATION_TIMEOUT_MS = 180_000;
const GENERATION_POLL_INTERVAL_MS = 5_000;
const GENERATION_POLL_TIMEOUT_MS = 15 * 60_000;
const GENERATION_MATCH_SKEW_MS = 10_000;

export interface PosterListParams {
  productId?: string;
  storeId?: string;
  generationStatus?: PosterStatus;
  size?: PosterSize;
  format?: PosterFormat;
  isFavourited?: boolean;
  page?: number;
  limit?: number;
}

export interface PosterListResult {
  posters: Poster[];
  rawPosters: BackendPoster[];
  pagination: Pagination;
}

export interface GeneratePosterRequest {
  productId: string;
  style: PosterStyle;
  size: PosterSize;
  format: PosterFormat;
  contentId?: string;
  templateId?: string;
  title?: string;
}

export interface SavePosterEditRequest {
  svg: string;
  editState?: unknown;
  saveAsNew?: boolean;
}

export async function listPosters(params: PosterListParams = {}): Promise<PosterListResult> {
  const { data } = await api.get<ApiResponse<{ posters: BackendPoster[]; pagination: Pagination }>>('/posters', { params });
  return {
    posters: data.data.posters.map(toPoster),
    rawPosters: data.data.posters,
    pagination: data.data.pagination,
  };
}

export async function getTemplates(style?: PosterStyle): Promise<{ templates: Array<{ id?: string; style?: PosterStyle }>; styles: PosterStyle[] }> {
  const { data } = await api.get<ApiResponse<{ templates: Array<{ id?: string; style?: PosterStyle }>; styles: PosterStyle[] }>>('/posters/templates', {
    params: style ? { style } : undefined,
  });
  return data.data;
}

export async function generatePoster(request: GeneratePosterRequest): Promise<Poster> {
  const { productId, ...body } = request;
  const startedAt = new Date();
  try {
    const { data } = await api.post<ApiResponse<{ poster: BackendPoster }>>(
      `/posters/generate/${productId}`,
      body,
      { timeout: GENERATION_TIMEOUT_MS }
    );
    return toPoster(data.data.poster);
  } catch (error) {
    if (!isGenerationRequestTimeout(error)) throw error;
    return pollForGeneratedPoster(request, startedAt);
  }
}

export async function regeneratePoster(posterId: string, body: Partial<Omit<GeneratePosterRequest, 'productId'>> = {}): Promise<Poster> {
  const startedAt = new Date();
  try {
    const { data } = await api.post<ApiResponse<{ poster: BackendPoster }>>(
      `/posters/regenerate/${posterId}`,
      body,
      { timeout: GENERATION_TIMEOUT_MS }
    );
    return toPoster(data.data.poster);
  } catch (error) {
    if (!isGenerationRequestTimeout(error)) throw error;
    return pollForRegeneratedPoster(body, startedAt);
  }
}

function isGenerationRequestTimeout(error: unknown): boolean {
  return axios.isAxiosError(error) && (
    error.code === 'ECONNABORTED' ||
    error.message.toLowerCase().includes('timeout')
  );
}

async function pollForGeneratedPoster(
  request: GeneratePosterRequest,
  startedAt: Date
): Promise<Poster> {
  return pollForPosterCompletion({
    startedAt,
    params: {
      productId: request.productId,
      size: request.size,
      format: request.format,
      limit: 20,
    },
  });
}

async function pollForRegeneratedPoster(
  request: Partial<Omit<GeneratePosterRequest, 'productId'>>,
  startedAt: Date
): Promise<Poster> {
  return pollForPosterCompletion({
    startedAt,
    params: {
      size: request.size,
      format: request.format,
      limit: 20,
    },
  });
}

async function pollForPosterCompletion({
  startedAt,
  params,
}: {
  startedAt: Date;
  params: PosterListParams;
}): Promise<Poster> {
  const deadline = Date.now() + GENERATION_POLL_TIMEOUT_MS;
  let lastObservedPoster: Poster | undefined;

  while (Date.now() < deadline) {
    await delay(GENERATION_POLL_INTERVAL_MS);
    const result = await listPosters(params);
    const candidate = result.posters
      .filter((poster) => poster.createdAt.getTime() >= startedAt.getTime() - GENERATION_MATCH_SKEW_MS)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    if (!candidate) continue;
    lastObservedPoster = candidate;

    if (candidate.generationStatus === 'completed') return candidate;
    if (candidate.generationStatus === 'failed') {
      throw new Error('Poster generation failed on the server.');
    }
  }

  if (lastObservedPoster) {
    throw new Error('Poster generation is still processing. Check the posters list again shortly.');
  }

  throw new Error('Poster generation could not be confirmed. Please check the posters list before trying again.');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function previewPoster(posterId: string): Promise<{ previewUrl: string }> {
  const { data } = await api.get<ApiResponse<{ previewUrl: string }>>(`/posters/preview/${posterId}`);
  return data.data;
}

export async function toggleFavourite(
  posterId: string
): Promise<Poster> {
  const { data } = await api.patch<ApiResponse<{ poster?: BackendPoster; isFavourited: boolean }>>(
    `/posters/${posterId}/favourite`
  );
  if (data.data.poster) return toPoster(data.data.poster);
  return {
    id: posterId,
    productName: 'Product poster',
    storeName: 'Store',
    generationStatus: 'completed',
    format: 'jpeg',
    size: 'square',
    style: 'modern',
    version: 1,
    isFavourited: data.data.isFavourited,
    totalDownloads: 0,
    createdAt: new Date(),
    editableUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    isEditable: true,
  };
}

export async function savePosterEdit(posterId: string, request: SavePosterEditRequest): Promise<Poster> {
  const { data } = await api.post<ApiResponse<{ poster: BackendPoster }>>(`/posters/${posterId}/save-edit`, request);
  return toPoster(data.data.poster);
}

export async function exportPoster(
  posterId: string,
  format: PosterFormat
): Promise<{ downloadUrl: string; filename?: string; format?: PosterFormat }> {
  const { data } = await api.post<ApiResponse<{ downloadUrl: string; filename?: string; format?: PosterFormat }>>(
    `/posters/${posterId}/export`,
    { format }
  );
  return data.data;
}

export async function deletePoster(posterId: string): Promise<void> {
  await api.delete(`/posters/${posterId}`);
}
