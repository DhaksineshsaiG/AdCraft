const mockStoreFindUnique = jest.fn();
const mockProductFindMany = jest.fn();
const mockProductFindUnique = jest.fn();
const mockCampaignCreate = jest.fn();
const mockCampaignUpdate = jest.fn();
const mockCampaignFindUnique = jest.fn();
const mockCampaignFindMany = jest.fn();
const mockGeneratedContentFindFirst = jest.fn();

jest.mock('../database/prisma', () => ({
  __esModule: true,
  default: {
    store: {
      findUnique: mockStoreFindUnique,
    },
    product: {
      findMany: mockProductFindMany,
      findUnique: mockProductFindUnique,
    },
    campaign: {
      create: mockCampaignCreate,
      update: mockCampaignUpdate,
      findUnique: mockCampaignFindUnique,
      findMany: mockCampaignFindMany,
    },
    generatedContent: {
      findFirst: mockGeneratedContentFindFirst,
    },
  },
}));

const mockGeneratePoster = jest.fn();
jest.mock('../services/poster.service', () => ({
  generatePoster: mockGeneratePoster,
}));

import GrowthAgent from './GrowthAgent';
import campaignService from '../services/campaign.service';
import { ValidationError, ForbiddenError } from '../middleware/errorMiddleware';

describe('End-to-End Growth to Campaign Flow (Phase 1 + Phase 2)', () => {
  const storeId = '11111111-1111-1111-1111-111111111111';
  const productId = '22222222-2222-2222-2222-222222222222';
  const ownerId = '33333333-3333-3333-3333-333333333333';
  const campaignId = '44444444-4444-4444-4444-444444444444';

  const mockStore = {
    id: storeId,
    name: 'SoleCraft Sneakers',
    ownerId,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProductRecord = {
    id: productId,
    sourceId: 'src-sole-1',
    source: 'shopify',
    name: 'Air Max Pulse',
    price: 130,
    compareAtPrice: 160, // 18.75% discount
    currency: 'USD',
    images: [{ url: 'https://cdn.example.com/shoes.png', position: 0 }],
    categories: ['Footwear'],
    tags: ['lifestyle', 'running'],
    variants: [{ title: '10', price: 130, inventory: 40, isAvailable: true }],
    status: 'active',
    processingStatus: 'ready',
    description: 'Ultra-cushioned running sneaker.',
    storeId,
    ownerId,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSyncedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreFindUnique.mockResolvedValue(mockStore);
    mockProductFindMany.mockResolvedValue([mockProductRecord]);
    mockProductFindUnique.mockResolvedValue(mockProductRecord);
    mockGeneratedContentFindFirst.mockResolvedValue(null);
  });

  test('full workflow: Opportunity Detection -> Strategy Formulation -> Campaign Orchestration -> Poster Generation -> Merchant Approval', async () => {
    // ── STEP 1: Phase 1 AI Growth Brain Analysis ──
    const growthAgent = new GrowthAgent();
    const growthResult = await growthAgent.analyzeStore(storeId, ownerId);

    expect(growthResult.storeId).toBe(storeId);
    expect(growthResult.topOpportunity.productId).toBe(productId);
    expect(growthResult.topOpportunity.signals.hasDiscount).toBe(true);
    expect(growthResult.topOpportunity.score).toBeGreaterThan(70);
    expect(growthResult.recommendation.suggestedCampaignName).toBeTruthy();
    expect(growthResult.recommendation.suggestedOffer).toBeTruthy();

    // ── STEP 2: Phase 2 Campaign Creation & Orchestration ──
    mockCampaignCreate.mockResolvedValue({
      id: campaignId,
      name: growthResult.recommendation.suggestedCampaignName,
      objective: growthResult.recommendation.objective,
      strategy: growthResult.recommendation.strategy,
      suggestedOffer: growthResult.recommendation.suggestedOffer,
      targetAudience: growthResult.recommendation.targetAudience,
      rationale: growthResult.recommendation.rationale,
      status: 'draft',
      storeId,
      productId,
      ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockCampaignUpdate.mockImplementation(({ data }: any) => {
      return {
        id: campaignId,
        name: growthResult.recommendation.suggestedCampaignName,
        status: data.status,
        posterId: data.posterId ?? null,
        posterUrl: data.posterUrl ?? null,
        approvedAt: data.approvedAt ?? null,
        storeId,
        productId,
        ownerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    // Simulate existing poster service rendering
    mockGeneratePoster.mockResolvedValue({
      _id: 'poster-rec-1',
      posterUrl: 'https://res.cloudinary.com/demo/image/upload/v1/campaign-poster.png',
      generationStatus: 'completed',
      dimensions: { width: 1080, height: 1080, unit: 'px' },
    });

    const pendingCampaign = await campaignService.createCampaign(
      {
        storeId,
        productId: growthResult.topOpportunity.productId,
        name: growthResult.recommendation.suggestedCampaignName,
        objective: growthResult.recommendation.objective,
        strategy: growthResult.recommendation.strategy,
        suggestedOffer: growthResult.recommendation.suggestedOffer,
        targetAudience: growthResult.recommendation.targetAudience,
        rationale: growthResult.recommendation.rationale,
      },
      ownerId
    );

    // Verify campaign reached PENDING_APPROVAL
    expect(pendingCampaign.id).toBe(campaignId);
    expect(pendingCampaign.status).toBe('pending_approval');
    expect(pendingCampaign.posterId).toBe('poster-rec-1');
    expect(pendingCampaign.posterUrl).toBe(
      'https://res.cloudinary.com/demo/image/upload/v1/campaign-poster.png'
    );
    expect(mockGeneratePoster).toHaveBeenCalledTimes(1);

    // ── STEP 3: Merchant Approval Gate ──
    mockCampaignFindUnique.mockResolvedValue({
      id: campaignId,
      status: 'pending_approval',
      storeId,
      productId,
      ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const approvedCampaign = await campaignService.approveCampaign(campaignId, ownerId);

    expect(approvedCampaign.status).toBe('approved');
    expect(approvedCampaign.approvedAt).toBeDefined();

    // ── STEP 4: Guardrails — Re-approval & Unauthorized rejection ──
    mockCampaignFindUnique.mockResolvedValue({
      id: campaignId,
      status: 'approved',
      storeId,
      productId,
      ownerId,
    });

    // Cannot re-approve
    await expect(campaignService.approveCampaign(campaignId, ownerId)).rejects.toThrow(
      ValidationError
    );

    // Unauthorized merchant cannot approve
    await expect(
      campaignService.approveCampaign(campaignId, 'unauthorized-stranger')
    ).rejects.toThrow(ForbiddenError);
  });
});
