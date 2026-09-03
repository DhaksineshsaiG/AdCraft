import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as CampaignController from '../controllers/campaign.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// ─── Rate Limiters ────────────────────────────────────────────────────────────

const campaignCreationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // 15 campaign generation calls per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many campaign creation requests. Please wait before creating another campaign.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
  skip: (req) => process.env['NODE_ENV'] === 'test' || req.ip === '127.0.0.1',
});

// ─── Protected Routes ─────────────────────────────────────────────────────────

router.use(protect);

/**
 * POST /api/v1/campaigns
 * Create a new campaign and generate creative assets.
 */
router.post(
  '/',
  campaignCreationLimiter,
  CampaignController.validateCreateCampaign,
  CampaignController.createCampaign
);

/**
 * GET /api/v1/campaigns/:id
 * Retrieve campaign details.
 */
router.get(
  '/:id',
  CampaignController.validateCampaignId,
  CampaignController.getCampaign
);

/**
 * GET /api/v1/campaigns/store/:storeId
 * List all campaigns for a specific store.
 */
router.get(
  '/store/:storeId',
  CampaignController.validateStoreId,
  CampaignController.getCampaignsByStore
);

/**
 * POST /api/v1/campaigns/:id/approve
 * Merchant approval gate to approve a campaign in PENDING_APPROVAL state.
 */
router.post(
  '/:id/approve',
  CampaignController.validateCampaignId,
  CampaignController.approveCampaign
);

export default router;
