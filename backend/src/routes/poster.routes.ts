import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import * as PosterController from '../controllers/poster.controller';
import { protect } from '../middleware/auth.middleware';

// â”€â”€â”€ Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const router = Router();

// â”€â”€â”€ Rate Limiters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Generation limiter â€” poster generation calls the Cloudinary composition
 * pipeline (network I/O, image processing). 20 per minute prevents runaway
 * generation loops while supporting normal interactive bursts.
 */
const generationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many poster generation requests. Please wait before generating again.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
  skip: (req) => process.env['NODE_ENV'] === 'test' || req.ip === '127.0.0.1',
});

/**
 * Export limiter â€” each export records an event and calls Cloudinary.
 * 60 per minute covers bulk export UX without enabling abuse.
 */
const exportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many export requests. Please slow down.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
  skip: (req) => process.env['NODE_ENV'] === 'test' || req.ip === '127.0.0.1',
});

// â”€â”€â”€ All routes require authentication â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.use(protect);

// â”€â”€â”€ Static / named routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CRITICAL ORDER: These MUST be declared before any /:posterId routes.
// Express matches routes in registration order â€” without this, strings like
// "templates", "preview", and "product" would be treated as UUID params
// and forwarded to the getPoster handler, causing a 422 validation error.

/**
 * GET /api/v1/posters/templates
 * Return all available poster templates (optionally filtered by ?style=<value>).
 * Used to populate the template picker in the frontend.
 *
 * Query: style? (one of: modern | bold | elegant | playful | minimalist | vintage | professional)
 */
router.get('/templates', PosterController.getTemplates);

/**
 * GET /api/v1/posters
 * Paginated list of all posters for the authenticated user.
 *
 * Query: productId?, storeId?, generationStatus?, size?, format?,
 *        isFavourited?, isPublic?, page?, limit?
 */
router.get(
  '/',
  PosterController.validateListQuery,
  PosterController.listPosters
);

// â”€â”€â”€ Product-scoped routes (:productId) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * POST /api/v1/posters/generate/:productId
 * Generate a new poster for the given product.
 * Requires at least one completed GeneratedContent record for the product.
 * Automatically selects a template matching the requested style + size.
 *
 * Body: { style, size, format?, templateId?, contentId?, title?, tags? }
 */
router.post(
  '/generate/:productId',
  generationLimiter,
  PosterController.validateGeneratePoster,
  PosterController.generatePoster
);

/**
 * GET /api/v1/posters/product/:productId
 * All posters for a specific product, sorted latest-version-first.
 * Populates generatedContent reference (contentType, status).
 */
router.get(
  '/product/:productId',
  PosterController.validateProductId,
  PosterController.getPostersByProduct
);

// â”€â”€â”€ Poster instance routes (:posterId) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * POST /api/v1/posters/regenerate/:posterId
 * Regenerate a poster from an existing one.
 * Increments the version number and links the new poster to the parent
 * via parentPosterId. All style/size/format/template overrides are optional â€”
 * unset fields are inherited from the original poster.
 *
 * Body: { style?, size?, format?, templateId?, contentId?, title? }
 */
router.post(
  '/regenerate/:posterId',
  generationLimiter,
  PosterController.validateRegeneratePoster,
  PosterController.regeneratePoster
);

/**
 * GET /api/v1/posters/preview/:posterId
 * Generate a signed, time-limited Cloudinary URL for previewing the poster.
 * URL expires after 1 hour. The poster must have generationStatus = completed.
 */
router.get(
  '/preview/:posterId',
  PosterController.validatePosterId,
  PosterController.previewPoster
);

/**
 * GET /api/v1/posters/:posterId
 * Get a single poster by its PostgreSQL _id.
 * Populates: product (name, images, price, currency),
 *            generatedContent (contentType, status, selectedVariantIndex, variants).
 */
router.get(
  '/:posterId',
  PosterController.validatePosterId,
  PosterController.getPoster
);

/**
 * PATCH /api/v1/posters/:posterId/favourite
 * Toggle the isFavourited flag. No body required.
 * Returns the new isFavourited value.
 */
router.patch(
  '/:posterId/favourite',
  PosterController.validatePosterId,
  PosterController.toggleFavourite
);

/**
 * POST /api/v1/posters/:posterId/export
 * Export a completed poster as JPEG, PNG, WEBP, or PDF.
 * Records the export event (incrementing totalDownloads) for analytics.
 *
 * Body: { format }
 */
router.post(
  '/:posterId/export',
  exportLimiter,
  PosterController.validateExport,
  PosterController.exportPoster
);

/**
 * POST /api/v1/posters/:posterId/save-edit
 * Persist edits made against the rendered SVG layer tree.
 * Body: { svg, editState?, saveAsNew? }
 */
router.post(
  '/:posterId/save-edit',
  generationLimiter,
  PosterController.validateSaveEdit,
  PosterController.savePosterEdit
);

/**
 * DELETE /api/v1/posters/:posterId
 * Delete a poster record and its Cloudinary storage asset.
 * Returns 400 if the poster is currently in PROCESSING state.
 */
router.delete(
  '/:posterId',
  PosterController.validatePosterId,
  PosterController.deletePoster
);

// â”€â”€â”€ Export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default router;
