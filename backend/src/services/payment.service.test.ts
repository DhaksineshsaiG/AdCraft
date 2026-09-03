const mockCampaignFindUnique = jest.fn();
const mockCampaignUpdate = jest.fn();
const mockPaymentCreate = jest.fn();
const mockPaymentUpdate = jest.fn();
const mockPaymentFindFirst = jest.fn();
const mockPaymentFindMany = jest.fn();

jest.mock('../database/prisma', () => ({
  __esModule: true,
  default: {
    campaign: {
      findUnique: mockCampaignFindUnique,
      update: mockCampaignUpdate,
    },
    payment: {
      create: mockPaymentCreate,
      update: mockPaymentUpdate,
      findFirst: mockPaymentFindFirst,
      findMany: mockPaymentFindMany,
    },
  },
}));

const mockCreateOrder = jest.fn();
const mockVerifyPaymentSignature = jest.fn();

jest.mock('./razorpay.service', () => ({
  __esModule: true,
  default: {
    createOrder: mockCreateOrder,
    verifyPaymentSignature: mockVerifyPaymentSignature,
  },
}));

import paymentService from './payment.service';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../middleware/errorMiddleware';

describe('PaymentService', () => {
  const campaignId = 'camp-uuid-1';
  const ownerId = 'user-owner-1';
  const storeId = 'store-uuid-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentOrder', () => {
    test('throws NotFoundError if campaign does not exist', async () => {
      mockCampaignFindUnique.mockResolvedValue(null);

      await expect(
        paymentService.createPaymentOrder(campaignId, ownerId)
      ).rejects.toThrow(NotFoundError);
    });

    test('throws ForbiddenError if campaign belongs to another merchant', async () => {
      mockCampaignFindUnique.mockResolvedValue({
        id: campaignId,
        ownerId: 'different-merchant',
        status: 'approved',
      });

      await expect(
        paymentService.createPaymentOrder(campaignId, ownerId)
      ).rejects.toThrow(ForbiddenError);
    });

    test('throws ValidationError if campaign is not in APPROVED status', async () => {
      mockCampaignFindUnique.mockResolvedValue({
        id: campaignId,
        ownerId,
        status: 'pending_approval', // Not yet approved by merchant!
      });

      await expect(
        paymentService.createPaymentOrder(campaignId, ownerId)
      ).rejects.toThrow(ValidationError);
    });

    test('enforces order persistence safety: creates local Payment before external Razorpay order', async () => {
      mockCampaignFindUnique.mockResolvedValue({
        id: campaignId,
        name: 'Festive Flash Promo',
        ownerId,
        status: 'approved',
        storeId,
      });

      mockPaymentFindFirst.mockResolvedValue(null);

      // Local record created FIRST
      mockPaymentCreate.mockResolvedValue({
        id: 'payment-uuid-1',
        amount: 499,
        currency: 'INR',
        status: 'created',
        campaignId,
      });

      mockCreateOrder.mockResolvedValue({
        id: 'order_rzp_987654',
        amount: 49900,
        currency: 'INR',
        receipt: 'rcpt_payment_1',
        status: 'created',
      });

      // Updated with razorpayOrderId
      mockPaymentUpdate.mockResolvedValue({
        id: 'payment-uuid-1',
        amount: 499,
        currency: 'INR',
        status: 'pending',
        razorpayOrderId: 'order_rzp_987654',
        campaignId,
      });

      const response = await paymentService.createPaymentOrder(campaignId, ownerId);

      expect(response.paymentId).toBe('payment-uuid-1');
      expect(response.razorpayOrderId).toBe('order_rzp_987654');
      expect(response.amount).toBe(499);
      expect(response.currency).toBe('INR');

      // Verify sequence: Local Payment created first
      expect(mockPaymentCreate).toHaveBeenCalledWith({
        data: {
          amount: 499,
          currency: 'INR',
          status: 'created',
          campaignId,
        },
      });

      expect(mockCreateOrder).toHaveBeenCalledTimes(1);

      expect(mockPaymentUpdate).toHaveBeenCalledWith({
        where: { id: 'payment-uuid-1' },
        data: {
          razorpayOrderId: 'order_rzp_987654',
          status: 'pending',
        },
      });
    });

    test('blocks duplicate payment orders if campaign already has verified payment', async () => {
      mockCampaignFindUnique.mockResolvedValue({
        id: campaignId,
        ownerId,
        status: 'approved',
      });

      mockPaymentFindFirst.mockResolvedValue({
        id: 'existing-payment-id',
        status: 'verified',
      });

      await expect(
        paymentService.createPaymentOrder(campaignId, ownerId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('verifyPayment', () => {
    const payload = {
      razorpay_order_id: 'order_rzp_987654',
      razorpay_payment_id: 'pay_rzp_112233',
      razorpay_signature: 'valid_crypto_signature_hex',
    };

    test('authoritatively transitions Payment to VERIFIED and Campaign to ACTIVE on valid signature', async () => {
      mockPaymentFindFirst.mockResolvedValue({
        id: 'payment-uuid-1',
        campaignId,
        status: 'pending',
        razorpayOrderId: payload.razorpay_order_id,
        amount: 499,
        currency: 'INR',
        campaign: {
          id: campaignId,
          name: 'Hero Campaign',
          ownerId,
          status: 'approved',
          store: { id: storeId, name: 'Demo Store' },
        },
      });

      mockVerifyPaymentSignature.mockReturnValue(true);

      mockPaymentUpdate.mockResolvedValue({
        id: 'payment-uuid-1',
        amount: 499,
        currency: 'INR',
        status: 'verified',
        razorpayOrderId: payload.razorpay_order_id,
        razorpayPaymentId: payload.razorpay_payment_id,
        razorpaySignature: payload.razorpay_signature,
        verifiedAt: new Date(),
        campaignId,
      });

      mockCampaignUpdate.mockResolvedValue({
        id: campaignId,
        name: 'Hero Campaign',
        status: 'active',
        ownerId,
        storeId,
      });

      const result = await paymentService.verifyPayment(payload, ownerId);

      expect(result.payment.status).toBe('verified');
      expect(result.campaign.status).toBe('active');
      expect(result.alreadyVerified).toBe(false);

      expect(mockPaymentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'verified' }),
        })
      );

      expect(mockCampaignUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: campaignId },
          data: { status: 'active' },
        })
      );
    });

    test('marks Payment as FAILED and does NOT activate Campaign if signature is invalid', async () => {
      mockPaymentFindFirst.mockResolvedValue({
        id: 'payment-uuid-1',
        campaignId,
        status: 'pending',
        razorpayOrderId: payload.razorpay_order_id,
        campaign: {
          id: campaignId,
          ownerId,
          status: 'approved',
        },
      });

      mockVerifyPaymentSignature.mockReturnValue(false); // Invalid signature!

      await expect(
        paymentService.verifyPayment(payload, ownerId)
      ).rejects.toThrow(ValidationError);

      // Payment marked as failed
      expect(mockPaymentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'failed' }),
        })
      );

      // Campaign update to ACTIVE was NEVER called
      expect(mockCampaignUpdate).not.toHaveBeenCalled();
    });

    test('handles idempotent duplicate verification requests gracefully', async () => {
      mockPaymentFindFirst.mockResolvedValue({
        id: 'payment-uuid-1',
        campaignId,
        status: 'verified', // Already verified!
        razorpayOrderId: payload.razorpay_order_id,
        campaign: {
          id: campaignId,
          ownerId,
          status: 'active',
        },
      });

      const result = await paymentService.verifyPayment(payload, ownerId);

      expect(result.alreadyVerified).toBe(true);
      expect(mockPaymentUpdate).not.toHaveBeenCalled();
      expect(mockCampaignUpdate).not.toHaveBeenCalled();
    });

    test('rejects verification attempt by unauthorized merchant with ForbiddenError', async () => {
      mockPaymentFindFirst.mockResolvedValue({
        id: 'payment-uuid-1',
        campaignId,
        campaign: {
          id: campaignId,
          ownerId: 'legit-merchant',
        },
      });

      await expect(
        paymentService.verifyPayment(payload, 'unauthorized-stranger')
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
