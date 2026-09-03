import type { Campaign as CampaignRecord } from '@prisma/client';

export enum CampaignStatus {
  DRAFT = 'draft',
  GENERATING = 'generating',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface ICampaignDocument {
  _id: string;
  id: string;
  name: string;
  objective: string;
  strategy: string;
  suggestedOffer?: string;
  targetAudience?: string;
  rationale?: string;
  marketingContent?: Record<string, unknown> | null;
  status: CampaignStatus;
  posterId?: string;
  posterUrl?: string;
  failureReason?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  storeId: string;
  productId: string;
  ownerId: string;
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

export function mapCampaign(record: CampaignRecord): ICampaignDocument {
  return {
    _id: record.id,
    id: record.id,
    name: record.name,
    objective: record.objective,
    strategy: record.strategy,
    suggestedOffer: record.suggestedOffer ?? undefined,
    targetAudience: record.targetAudience ?? undefined,
    rationale: record.rationale ?? undefined,
    marketingContent: record.marketingContent as Record<string, unknown> | null,
    status: record.status as unknown as CampaignStatus,
    posterId: record.posterId ?? undefined,
    posterUrl: record.posterUrl ?? undefined,
    failureReason: record.failureReason ?? undefined,
    approvedAt: record.approvedAt ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    storeId: record.storeId,
    productId: record.productId,
    ownerId: record.ownerId,
  };
}
