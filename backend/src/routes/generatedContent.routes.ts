import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import * as GeneratedContentController from '../controllers/generatedContent.controller';
import { protect } from '../middleware/auth.middleware';
// â”€â”€â”€ Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const router = Router();

// â”€â”€â”€ Rate Limiters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Generation limiter â€” each call hits the OpenAI API and incurs cost.
 * 30 generation requests per user per minute is generous for interactive use
 * while preventing runaway loops or accidental batch abuse.
 */
const generationLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many generation requests. Please wait a moment before generating again.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
  skip: (req) => process.env['NODE_ENV'] === 'test' || req.ip === '127.0.0.1',
});

/**
 * Generate-all limiter â€” stricter because it fires multiple OpenAI calls per request
 * (up to 6 content types Ã— N variants). 10 per minute prevents accidental
 * cost explosions while still supporting normal interactive use.
 */
const generateAllLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many generate-all requests. Please wait before generating again.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
  skip: (req) => process.env['NODE_ENV'] === 'test' || req.ip === '127.0.0.1',
});

// â”€â”€â”€ All routes require authentication â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.use(protect);

// â”€â”€â”€ Named / static routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Declared BEFORE /:contentId to prevent "history" and "usage-stats" being
// matched as PostgreSQL UUIDs by the param handler.

/**
 * GET /api/v1/generated-content/history
 * Paginated generation history for the authenticated user.
 *
 * Query: productId?, storeId?, contentType?, status?, page?, limit?
 */
router.get(
  '/history',
  GeneratedContentController.validateHistoryQuery,
  GeneratedContentController.getHistory
);

/**
 * GET /api/v1/generated-content/usage-stats
 * Token usage and cost analytics.
 *
 * Query: storeId?
 */
router.get(
  '/usage-stats',
  GeneratedContentController.validateUsageStatsQuery,
  GeneratedContentController.getUsageStats
);

// â”€â”€â”€ Product-scoped generation routes (:productId) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * POST /api/v1/generated-content/generate/:productId
 * Generate a single content type for a product.
 *
 * Body: { contentType, style, tone, language?, variantCount?,
 *         customInstructions?, discountPercent?, callToActionText? }
 */
router.post(
  '/generate/:productId',
  generationLimiter,
  GeneratedContentController.validateGenerateContent,
  GeneratedContentController.generateContent
);

/**
 * POST /api/v1/generated-content/generate-all/:productId
 * Generate all standard content types for a product in one request.
 * Runs headline, tagline, CTA, product description, marketing copy, image prompt.
 *
 * Body: { style, tone, language?, variantCount?,
 *         customInstructions?, discountPercent?, callToActionText? }
 */
router.post(
  '/generate-all/:productId',
  generateAllLimiter,
  GeneratedContentController.validateGenerateAll,
  GeneratedContentController.generateAllContent
);

/**
 * POST /api/v1/generated-content/regenerate/:generatedContentId
 * Regenerate one existing GeneratedContent row.
 * The content type is preserved from the selected record.
 *
 * Body: { style, tone, language?, variantCount?,
 *         customInstructions?, discountPercent?, callToActionText? }
 */
router.post(
  '/regenerate/:generatedContentId',
  generationLimiter,
  GeneratedContentController.validateRegenerateContent,
  GeneratedContentController.regenerateContent
);

/**
 * GET /api/v1/generated-content/product/:productId
 * All GeneratedContent records for a product, sorted latest-version-first.
 * Includes a latestByType summary map for quick dashboard rendering.
 *
 * Query: contentType? (filter to a single type)
 */
router.get(
  '/product/:productId',
  GeneratedContentController.validateGetByProduct,
  GeneratedContentController.getContentByProduct
);

// â”€â”€â”€ Content instance routes (:contentId) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * GET /api/v1/generated-content/:contentId
 * Retrieve a single GeneratedContent record by its PostgreSQL _id.
 */
router.get(
  '/:contentId',
  GeneratedContentController.validateContentId,
  GeneratedContentController.getContentById
);

/**
 * PATCH /api/v1/generated-content/:contentId/select-variant
 * Select and approve a specific variant within a completed content record.
 * Transitions status to APPROVED and marks the chosen variant isSelected=true.
 *
 * Body: { variantIndex: number }
 */
router.patch(
  '/:contentId/select-variant',
  GeneratedContentController.validateSelectVariant,
  GeneratedContentController.selectVariant
);

/**
 * DELETE /api/v1/generated-content/:contentId
 * Delete a content record. Only FAILED or REJECTED records may be deleted.
 */
router.delete(
  '/:contentId',
  GeneratedContentController.validateContentId,
  GeneratedContentController.deleteContent
);

// â”€â”€â”€ Export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default router;
