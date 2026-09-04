import api from './auth.service';
import type { ApiResponse } from './api.types';

export type CampaignStatus =
  | 'draft'
  | 'generating'
  | 'pending_approval'
  | 'approved'
  | 'active'
  | 'completed'
  | 'failed';

export interface BackendCampaign {
  id: string;
  _id: string;
  name: string;
  objective: string;
  strategy: string;
  suggestedOffer?: string;
  targetAudience?: string;
  rationale?: string;
  status: CampaignStatus;
  posterId?: string;
  posterUrl?: string;
  failureReason?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  storeId: string;
  productId: string;
  ownerId: string;
  product?: {
    id: string;
    name: string;
    price: number;
    compareAtPrice?: number | null;
    currency: string;
    images?: Array<{ url: string; position?: number }>;
    categories?: string[];
  };
}

export interface CreateCampaignPayload {
  storeId: string;
  productId: string;
  name?: string;
  objective?: string;
  strategy?: string;
  suggestedOffer?: string;
  targetAudience?: string;
  rationale?: string;
  posterStyle?: string;
  posterSize?: string;
  contentId?: string;
}

/**
 * Dedicated timeout for campaign creation/creative generation (120 seconds).
 * Synchronous template layout, Sharp PNG rendering, and AWS S3 upload
 * legitimately require ~35-65 seconds under full load.
 */
export const CAMPAIGN_CREATION_TIMEOUT_MS = 120_000;

/**
 * Creates an agentic marketing campaign from a growth recommendation.
 */
export async function createCampaign(
  payload: CreateCampaignPayload
): Promise<BackendCampaign> {
  const { data } = await api.post<ApiResponse<BackendCampaign>>(
    '/campaigns',
    payload,
    {
      timeout: CAMPAIGN_CREATION_TIMEOUT_MS,
    }
  );
  return data.data;
}

/**
 * Fetches campaign details by ID.
 */
export async function getCampaign(campaignId: string): Promise<BackendCampaign> {
  const { data } = await api.get<ApiResponse<BackendCampaign>>(
    `/campaigns/${campaignId}`
  );
  return data.data;
}

/**
 * Lists all campaigns for a specific store.
 */
export async function listStoreCampaigns(storeId: string): Promise<BackendCampaign[]> {
  const { data } = await api.get<ApiResponse<BackendCampaign[]>>(
    `/campaigns/store/${storeId}`
  );
  return data.data;
}

/**
 * Approves a campaign (Merchant Human-in-the-Loop Approval Gate).
 */
export async function approveCampaign(campaignId: string): Promise<BackendCampaign> {
  const { data } = await api.post<ApiResponse<BackendCampaign>>(
    `/campaigns/${campaignId}/approve`
  );
  return data.data;
}
