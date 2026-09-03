import express from 'express';
import request from 'supertest';

const mockCreatePaymentOrder = jest.fn();
const mockVerifyPayment = jest.fn();
const mockGetPaymentByCampaign = jest.fn();

jest.mock('../services/payment.service', () => ({
  createPaymentOrder: mockCreatePaymentOrder,
  verifyPayment: mockVerifyPayment,
  getPaymentByCampaign: mockGetPaymentByCampaign,
}));

jest.mock('../middleware/auth.middleware', () => ({
  protect: (req: any, _res: any, next: any) => {
    req.user = { _id: 'user-uuid-1', role: 'owner', status: 'active' };
    next();
  },
}));

import paymentRoutes from '../routes/payment.routes';
import { errorHandler } from '../middleware/errorMiddleware';

function testApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/payments', paymentRoutes);
  app.use(errorHandler);
  return app;
}

describe('PaymentController API', () => {
  const validCampaignId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/payments/campaigns/:campaignId/order', () => {
    test('rejects invalid campaign UUID format with 422', async () => {
      const res = await request(testApp())
        .post('/api/v1/payments/campaigns/not-a-valid-uuid/order')
        .send();

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('creates payment order successfully and returns 201', async () => {
      mockCreatePaymentOrder.mockResolvedValue({
        paymentId: 'pay-uuid-1',
        campaignId: validCampaignId,
        campaignName: 'Flash Sale',
        razorpayOrderId: 'order_rzp_123',
        razorpayKeyId: 'rzp_test_abc',
        amount: 499,
        amountInSubunits: 49900,
        currency: 'INR',
      });

      const res = await request(testApp())
        .post(`/api/v1/payments/campaigns/${validCampaignId}/order`)
        .send();

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.razorpayOrderId).toBe('order_rzp_123');
      expect(res.body.data.amount).toBe(499);
    });
  });

  describe('POST /api/v1/payments/verify', () => {
    test('rejects request with missing verification parameters with 422', async () => {
      const res = await request(testApp())
        .post('/api/v1/payments/verify')
        .send({ razorpay_order_id: 'order_123' }); // missing payment_id and signature

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('successfully verifies payment and returns 200', async () => {
      mockVerifyPayment.mockResolvedValue({
        payment: { id: 'pay-1', status: 'verified' },
        campaign: { id: validCampaignId, status: 'active' },
        alreadyVerified: false,
      });

      const res = await request(testApp())
        .post('/api/v1/payments/verify')
        .send({
          razorpay_order_id: 'order_123',
          razorpay_payment_id: 'pay_456',
          razorpay_signature: 'sig_789',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.campaign.status).toBe('active');
    });
  });

  describe('GET /api/v1/payments/campaigns/:campaignId', () => {
    test('returns payment history for campaign with 200', async () => {
      mockGetPaymentByCampaign.mockResolvedValue([
        { id: 'pay-1', amount: 499, currency: 'INR', status: 'verified' },
      ]);

      const res = await request(testApp())
        .get(`/api/v1/payments/campaigns/${validCampaignId}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });
});
