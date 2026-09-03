import crypto from 'crypto';

const mockOrdersCreate = jest.fn();
jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: mockOrdersCreate,
    },
  }));
});

// Configure test environment variables for Razorpay
process.env.RAZORPAY_KEY_ID = 'rzp_test_sampleKey123';
process.env.RAZORPAY_KEY_SECRET = 'testSecret4567890abcdef';

import razorpayService from './razorpay.service';
import { AppError } from '../middleware/errorMiddleware';

describe('RazorpayService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    test('successfully creates a Razorpay order with proper subunit conversion', async () => {
      mockOrdersCreate.mockResolvedValue({
        id: 'order_test_123456',
        amount: 49900,
        currency: 'INR',
        receipt: 'rcpt_camp_123',
        status: 'created',
      });

      const order = await razorpayService.createOrder({
        amountInPaise: 49900,
        currency: 'INR',
        receipt: 'rcpt_camp_123',
        notes: { campaignId: 'camp-1' },
      });

      expect(order.id).toBe('order_test_123456');
      expect(order.amount).toBe(49900);
      expect(order.currency).toBe('INR');
      expect(mockOrdersCreate).toHaveBeenCalledWith({
        amount: 49900,
        currency: 'INR',
        receipt: 'rcpt_camp_123',
        notes: { campaignId: 'camp-1' },
      });
    });

    test('wraps Razorpay API failures into AppError without leaking secrets', async () => {
      mockOrdersCreate.mockRejectedValue(new Error('Gateway timeout'));

      await expect(
        razorpayService.createOrder({
          amountInPaise: 49900,
          currency: 'INR',
          receipt: 'rcpt_camp_123',
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('verifyPaymentSignature', () => {
    const orderId = 'order_test_ABC123';
    const paymentId = 'pay_test_XYZ789';
    const secret = process.env.RAZORPAY_KEY_SECRET!;

    test('validates correct HMAC SHA-256 signature', () => {
      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const isValid = razorpayService.verifyPaymentSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: validSignature,
      });

      expect(isValid).toBe(true);
    });

    test('rejects tampered or invalid signature', () => {
      const invalidSignature = 'tampered_signature_hex_value_1234567890';

      const isValid = razorpayService.verifyPaymentSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: invalidSignature,
      });

      expect(isValid).toBe(false);
    });

    test('rejects when orderId or paymentId is missing', () => {
      const isValid = razorpayService.verifyPaymentSignature({
        razorpayOrderId: '',
        razorpayPaymentId: paymentId,
        razorpaySignature: 'sig',
      });

      expect(isValid).toBe(false);
    });
  });
});
