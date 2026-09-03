import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as PaymentController from '../controllers/payment.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// ─── Rate Limiters ────────────────────────────────────────────────────────────

const paymentOrderLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many payment requests. Please wait before attempting again.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
  skip: (req) => process.env['NODE_ENV'] === 'test' || req.ip === '127.0.0.1',
});

const paymentVerifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many verification attempts. Please wait.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
  skip: (req) => process.env['NODE_ENV'] === 'test' || req.ip === '127.0.0.1',
});

// ─── Protected Routes ─────────────────────────────────────────────────────────

router.use(protect);

/**
 * POST /api/v1/payments/campaigns/:campaignId/order
 * Initiates Razorpay order for an approved campaign.
 */
router.post(
  '/campaigns/:campaignId/order',
  paymentOrderLimiter,
  PaymentController.validateCampaignOrder,
  PaymentController.createOrder
);

/**
 * POST /api/v1/payments/verify
 * Authoritative cryptographic signature verification.
 */
router.post(
  '/verify',
  paymentVerifyLimiter,
  PaymentController.validateVerifyPayment,
  PaymentController.verifyPayment
);

/**
 * GET /api/v1/payments/campaigns/:campaignId
 * List payment records for a campaign.
 */
router.get(
  '/campaigns/:campaignId',
  PaymentController.validateCampaignOrder,
  PaymentController.getPaymentsForCampaign
);

export default router;
