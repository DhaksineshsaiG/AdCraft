import { Request, Response } from 'express';
import { body, param, validationResult, ValidationChain } from 'express-validator';
import { StatusCodes } from 'http-status-codes';
import campaignService from '../services/campaign.service';
import { asyncHandler, ValidationError } from '../middleware/errorMiddleware';

// ─── Validation Chains ────────────────────────────────────────────────────────

export const validateCreateCampaign: ValidationChain[] = [
  body('storeId')
    .trim()
    .notEmpty().withMessage('Store ID is required.')
    .isUUID().withMessage('Store ID must be a valid UUID.'),
  body('productId')
    .trim()
    .notEmpty().withMessage('Product ID is required.')
    .isUUID().withMessage('Product ID must be a valid UUID.'),
  body('name')
    .optional()
    .isString().withMessage('Campaign name must be a string.')
    .trim()
    .isLength({ max: 255 }).withMessage('Campaign name cannot exceed 255 characters.'),
  body('objective')
    .optional()
    .isString().withMessage('Objective must be a string.')
    .trim(),
  body('strategy')
    .optional()
    .isString().withMessage('Strategy must be a string.')
    .trim(),
  body('suggestedOffer')
    .optional()
    .isString().withMessage('Suggested offer must be a string.')
    .trim(),
  body('targetAudience')
    .optional()
    .isString().withMessage('Target audience must be a string.')
    .trim(),
  body('rationale')
    .optional()
    .isString().withMessage('Rationale must be a string.')
    .trim(),
  body('posterStyle')
    .optional()
    .isString().withMessage('Poster style must be a string.'),
  body('posterSize')
    .optional()
    .isString().withMessage('Poster size must be a string.'),
];

export const validateCampaignId: ValidationChain[] = [
  param('id')
    .trim()
    .notEmpty().withMessage('Campaign ID is required.')
    .isUUID().withMessage('Invalid campaign ID format. Must be a valid UUID.'),
];

export const validateStoreId: ValidationChain[] = [
  param('storeId')
    .trim()
    .notEmpty().withMessage('Store ID is required.')
    .isUUID().withMessage('Invalid store ID format. Must be a valid UUID.'),
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
 * POST /api/v1/campaigns
 * Authenticated — creates and orchestrates campaign generation.
 */
export const createCampaign = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const requestingUserId = req.user!._id.toString();
    const campaign = await campaignService.createCampaign(req.body, requestingUserId);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Campaign created and ready for merchant review.',
      data: campaign,
    });
  }
);

/**
 * GET /api/v1/campaigns/:id
 * Authenticated — retrieves campaign details by ID.
 */
export const getCampaign = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const requestingUserId = req.user!._id.toString();
    const campaignId = req.params['id']!;

    const campaign = await campaignService.getCampaignById(campaignId, requestingUserId);

    res.status(StatusCodes.OK).json({
      success: true,
      data: campaign,
    });
  }
);

/**
 * GET /api/v1/campaigns/store/:storeId
 * Authenticated — lists all campaigns belonging to a specific store.
 */
export const getCampaignsByStore = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const requestingUserId = req.user!._id.toString();
    const storeId = req.params['storeId']!;

    const campaigns = await campaignService.getCampaignsByStore(storeId, requestingUserId);

    res.status(StatusCodes.OK).json({
      success: true,
      data: campaigns,
    });
  }
);

/**
 * POST /api/v1/campaigns/:id/approve
 * Authenticated — explicit merchant approval gate.
 */
export const approveCampaign = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const requestingUserId = req.user!._id.toString();
    const campaignId = req.params['id']!;

    const approvedCampaign = await campaignService.approveCampaign(
      campaignId,
      requestingUserId
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Campaign approved successfully by merchant.',
      data: approvedCampaign,
    });
  }
);
