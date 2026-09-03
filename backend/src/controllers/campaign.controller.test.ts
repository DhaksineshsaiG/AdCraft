import express from 'express';
import request from 'supertest';

const mockCreateCampaign = jest.fn();
const mockGetCampaignById = jest.fn();
const mockGetCampaignsByStore = jest.fn();
const mockApproveCampaign = jest.fn();

jest.mock('../services/campaign.service', () => ({
  createCampaign: mockCreateCampaign,
  getCampaignById: mockGetCampaignById,
  getCampaignsByStore: mockGetCampaignsByStore,
  approveCampaign: mockApproveCampaign,
}));

jest.mock('../middleware/auth.middleware', () => ({
  protect: (req: any, _res: any, next: any) => {
    req.user = { _id: 'user-uuid-1', role: 'owner', status: 'active' };
    next();
  },
}));

import campaignRoutes from '../routes/campaign.routes';
import { errorHandler } from '../middleware/errorMiddleware';

function testApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/campaigns', campaignRoutes);
  app.use(errorHandler);
  return app;
}

describe('CampaignController API', () => {
  const validStoreId = '123e4567-e89b-12d3-a456-426614174000';
  const validProductId = '223e4567-e89b-12d3-a456-426614174001';
  const validCampaignId = '323e4567-e89b-12d3-a456-426614174002';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/campaigns', () => {
    test('rejects request with invalid UUID format with 422', async () => {
      const res = await request(testApp())
        .post('/api/v1/campaigns')
        .send({ storeId: 'invalid-id', productId: 'invalid-id' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('creates campaign successfully and returns 201', async () => {
      mockCreateCampaign.mockResolvedValue({
        id: validCampaignId,
        name: 'Spring Launch',
        status: 'pending_approval',
        storeId: validStoreId,
        productId: validProductId,
      });

      const res = await request(testApp())
        .post('/api/v1/campaigns')
        .send({
          storeId: validStoreId,
          productId: validProductId,
          name: 'Spring Launch',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(validCampaignId);
      expect(res.body.data.status).toBe('pending_approval');
    });
  });

  describe('GET /api/v1/campaigns/:id', () => {
    test('returns campaign details with 200', async () => {
      mockGetCampaignById.mockResolvedValue({
        id: validCampaignId,
        name: 'Spring Launch',
        status: 'pending_approval',
      });

      const res = await request(testApp()).get(`/api/v1/campaigns/${validCampaignId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(validCampaignId);
    });
  });

  describe('GET /api/v1/campaigns/store/:storeId', () => {
    test('returns list of campaigns for a store with 200', async () => {
      mockGetCampaignsByStore.mockResolvedValue([
        { id: validCampaignId, name: 'Spring Launch', status: 'pending_approval' },
      ]);

      const res = await request(testApp()).get(`/api/v1/campaigns/store/${validStoreId}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('POST /api/v1/campaigns/:id/approve', () => {
    test('approves campaign successfully with 200', async () => {
      mockApproveCampaign.mockResolvedValue({
        id: validCampaignId,
        status: 'approved',
        approvedAt: new Date().toISOString(),
      });

      const res = await request(testApp()).post(`/api/v1/campaigns/${validCampaignId}/approve`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('approved');
      expect(res.body.message).toContain('approved successfully');
    });
  });
});
