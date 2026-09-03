import express from 'express';
import request from 'supertest';

const mockAnalyzeStore = jest.fn();

jest.mock('../agent/GrowthAgent', () => {
  return jest.fn().mockImplementation(() => ({
    analyzeStore: mockAnalyzeStore,
  }));
});

jest.mock('../middleware/auth.middleware', () => ({
  protect: (req: any, _res: any, next: any) => {
    req.user = { _id: 'user-uuid-1', role: 'owner', status: 'active' };
    next();
  },
}));

import growthRoutes from '../routes/growth.routes';
import { errorHandler } from '../middleware/errorMiddleware';

function testApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/growth', growthRoutes);
  app.use(errorHandler);
  return app;
}

describe('GrowthController API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects invalid store ID format with 422', async () => {
    const response = await request(testApp())
      .post('/api/v1/growth/analyze/not-a-valid-uuid')
      .send();

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('successfully returns 200 and structured growth recommendation', async () => {
    const validStoreId = '123e4567-e89b-12d3-a456-426614174000';
    mockAnalyzeStore.mockResolvedValue({
      storeId: validStoreId,
      storeName: 'Sneaker Haven',
      analyzedAt: '2026-09-03T17:00:00.000Z',
      catalogSummary: {
        totalProducts: 5,
        activeProducts: 5,
        candidatesEvaluated: 5,
      },
      topOpportunity: {
        productId: 'prod-uuid-1',
        productName: 'Air Velocity Sneakers',
        score: 88,
        confidence: 'high',
        reasons: ['Strong promotional price advantage.'],
        signals: {
          price: 120,
          compareAtPrice: 160,
          currency: 'USD',
          hasDiscount: true,
          discountPercent: 25,
          status: 'active',
          isAvailable: true,
          totalInventory: 40,
          hasInventoryTracking: true,
          imageCount: 2,
          hasPrimaryImage: true,
          hasDescription: true,
          descriptionLength: 120,
          isProcessed: true,
          processingStatus: 'ready',
          category: 'Footwear',
          tagsCount: 3,
          variantCount: 2,
        },
      },
      otherCandidates: [],
      recommendation: {
        objective: 'Capitalize on existing 25% price reduction.',
        strategy: 'Highlight verified price difference across promotional creative.',
        suggestedCampaignName: 'Clearance Advantage',
        suggestedOffer: 'Save 25% — Now $120.00',
        targetAudience: 'Shoppers seeking high-performance footwear.',
        rationale: 'Top catalog candidate with verified inventory and imagery.',
      },
      provider: 'deterministic-engine',
    });

    const response = await request(testApp())
      .post(`/api/v1/growth/analyze/${validStoreId}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Store growth analysis completed successfully.');
    expect(response.body.data.storeId).toBe(validStoreId);
    expect(response.body.data.topOpportunity.productName).toBe('Air Velocity Sneakers');
    expect(response.body.data.recommendation.suggestedCampaignName).toBe('Clearance Advantage');
  });
});
