import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import * as ProductController from '../controllers/product.controller';
import { protect } from '../middleware/auth.middleware';

// â”€â”€â”€ Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const router = Router();

// â”€â”€â”€ Product-specific Rate Limiters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Analytics limiter â€” analytics and filter-meta endpoints run multi-stage
 * aggregations; limit to 60 requests / minute to protect the DB under load.
 */
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many analytics requests. Please slow down.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
  skip: (req) => process.env['NODE_ENV'] === 'test' || req.ip === '127.0.0.1',
});

// â”€â”€â”€ All routes require authentication â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.use(protect);

// â”€â”€â”€ Static / named routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// IMPORTANT: These must be declared BEFORE /:id routes, otherwise Express
// will match "search", "analytics", and "filters" as PostgreSQL UUIDs and
// forward them to the getProduct handler, which throws a 422.

/**
 * GET /api/v1/products/search
 * Full-text product search across name, description, and tags.
 * Results ranked by relevance score (PostgreSQL $text + textScore).
 *
 * Query: q (required), storeId?, status?, page?, limit?, sortBy?, sortDir?
 */
router.get(
  '/search',
  ProductController.validateSearchQuery,
  ProductController.searchProducts
);

/**
 * GET /api/v1/products/analytics
 * Aggregate analytics for the authenticated user's product catalogue.
 * Covers status breakdown, source breakdown, processing status, price range,
 * top categories, top tags, ready-for-generation count, and more.
 *
 * Query: storeId? (scope analytics to a single store)
 */
router.get(
  '/analytics',
  analyticsLimiter,
  ProductController.validateAnalyticsQuery,
  ProductController.getAnalytics
);

/**
 * GET /api/v1/products/filters/categories
 * Distinct sorted category names for populating filter dropdowns.
 *
 * Query: storeId?
 */
router.get(
  '/filters/categories',
  ProductController.validateFilterMetaQuery,
  ProductController.getCategories
);

/**
 * GET /api/v1/products/filters/vendors
 * Distinct sorted vendor names for populating filter dropdowns.
 *
 * Query: storeId?
 */
router.get(
  '/filters/vendors',
  ProductController.validateFilterMetaQuery,
  ProductController.getVendors
);

// â”€â”€â”€ Collection route â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * GET /api/v1/products
 * List products with full filter, sort, and pagination support.
 *
 * Query: storeId?, status?, source?, processingStatus?, category?, tag?,
 *        vendor?, hasVariants?, readyForGeneration?, minPrice?, maxPrice?,
 *        search?, page?, limit?, sortBy?, sortDir?
 */
router.get(
  '/',
  ProductController.validateListQuery,
  ProductController.listProducts
);

// â”€â”€â”€ Instance routes (:id) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * GET /api/v1/products/:id
 * Return a single product by PostgreSQL _id.
 * Populates store: name, slug, type, status, posterDefaults.
 */
router.get(
  '/:id',
  ProductController.validateProductId,
  ProductController.getProduct
);

/**
 * PATCH /api/v1/products/:id/processing
 * Update the AI processing status of a product.
 * Used by the AI poster generation engine (Phase 7) to track pipeline progress.
 * Also usable from the dashboard to manually reset stale or failed products.
 *
 * Body: { action: 'markProcessing' | 'markFailed' | 'markStale', errorMessage?: string }
 */
router.patch(
  '/:id/processing',
  ProductController.validateProcessingUpdate,
  ProductController.updateProcessingStatus
);

// â”€â”€â”€ Export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default router;
