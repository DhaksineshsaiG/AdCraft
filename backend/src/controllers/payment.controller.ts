import { Request, Response } from 'express';
import { body, param, validationResult, ValidationChain } from 'express-validator';
import { StatusCodes } from 'http-status-codes';
import paymentService from '../services/payment.service';
import { asyncHandler, ValidationError } from '../middleware/errorMiddleware';

// ─── Validation Chains ────────────────────────────────────────────────────────

export const validateCampaignOrder: ValidationChain[] = [
  param('campaignId')
    .trim()
    .notEmpty().withMessage('Campaign ID is required.')
    .isUUID().withMessage('Invalid campaign ID format. Must be a valid UUID.'),
];

export const validateVerifyPayment: ValidationChain[] = [
  body('razorpay_order_id')
    .trim()
    .notEmpty().withMessage('razorpay_order_id is required.'),
  body('razorpay_payment_id')
    .trim()
    .notEmpty().withMessage('razorpay_payment_id is required.'),
  body('razorpay_signature')
    .trim()
    .notEmpty().withMessage('razorpay_signature is required.'),
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assertValid(req: Request): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      'Validation failed. Please check your request parameters.',
      errors.array().map((e) => ({
        field: e.type === 'field' ? e.path : e.type,
        message: e.msg,
      }))
    );
  }
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/v1/payments/campaigns/:campaignId/order
 * Authenticated — initiates a Razorpay Test Mode order for an APPROVED campaign.
 */
export const createOrder = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const requestingUserId = req.user!._id.toString();
    const campaignId = req.params['campaignId']!;

    const orderData = await paymentService.createPaymentOrder(
      campaignId,
      requestingUserId
    );

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Razorpay order created successfully.',
      data: orderData,
    });
  }
);

/**
 * POST /api/v1/payments/verify
 * Authenticated — verifies Razorpay payment signature server-side and activates campaign.
 */
export const verifyPayment = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const requestingUserId = req.user!._id.toString();

    const result = await paymentService.verifyPayment(
      req.body,
      requestingUserId
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: result.alreadyVerified
        ? 'Payment was already verified. Campaign is active.'
        : 'Payment verified successfully. Campaign is now active.',
      data: result,
    });
  }
);

/**
 * GET /api/v1/payments/campaigns/:campaignId
 * Authenticated — retrieves payment history for a campaign.
 */
export const getPaymentsForCampaign = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const requestingUserId = req.user!._id.toString();
    const campaignId = req.params['campaignId']!;

    const payments = await paymentService.getPaymentByCampaign(
      campaignId,
      requestingUserId
    );

    res.status(StatusCodes.OK).json({
      success: true,
      data: payments,
    });
  }
);
