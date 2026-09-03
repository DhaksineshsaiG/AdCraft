import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import * as StoreController from '../controllers/store.controller';
import { protect } from '../middleware/auth.middleware';
// â”€â”€â”€ Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const router = Router();

// â”€â”€â”€ Store-specific Rate Limiters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Connect limiter â€” 10 store connections per IP per hour.
 * Prevents automated credential-probing via the connect endpoints.
 */
const connectLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many store connection attempts. Please try again in an hour.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
  skip: (req) => process.env['NODE_ENV'] === 'test' || req.ip === '127.0.0.1',
});

/**
 * Sync limiter â€” 20 sync requests per store per 15 minutes.
 * Prevents hammering external APIs and runaway sync jobs.
 */
const syncLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many sync requests. Please wait before syncing again.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
  skip: (req) => process.env['NODE_ENV'] === 'test' || req.ip === '127.0.0.1',
});

// â”€â”€â”€ All routes require authentication â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Apply protect globally to this router so every store route is protected.
// Individual public exceptions (none currently) would be declared before this line.

router.use(protect);

// â”€â”€â”€ Store Collection Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * GET /api/v1/stores
 * Return all connected (non-archived) stores for the authenticated user.
 */
router.get('/', StoreController.getStores);

/**
 * POST /api/v1/stores/connect/shopify
 * Connect a Shopify store by providing the shop domain and access token.
 * Credentials are validated against the Shopify API before saving.
 *
 * Body: { name, shopDomain, accessToken, description? }
 */
router.post(
  '/connect/shopify',
  connectLimiter,
  StoreController.validateConnectShopify,
  StoreController.connectShopify
);

/**
 * POST /api/v1/stores/connect/woocommerce
 * Connect a WooCommerce store by providing the store URL, consumer key, and secret.
 * Credentials are validated against the WooCommerce system status API before saving.
 *
 * Body: { name, storeUrl, consumerKey, consumerSecret, description? }
 */
router.post(
  '/connect/woocommerce',
  connectLimiter,
  StoreController.validateConnectWooCommerce,
  StoreController.connectWooCommerce
);

// â”€â”€â”€ Store Instance Routes (:id) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// validateStoreId is applied on every :id route to reject malformed UUIDs early.

/**
 * GET /api/v1/stores/:id
 * Return a single store by ID (ownership enforced).
 */
router.get(
  '/:id',
  StoreController.validateStoreId,
  StoreController.getStore
);

/**
 * POST /api/v1/stores/:id/sync
 * Fetch all products from the connected external store and upsert them into PostgreSQL.
 * Idempotent â€” safe to run multiple times.
 */
router.post(
  '/:id/sync',
  syncLimiter,
  StoreController.validateStoreId,
  StoreController.syncStore
);

/**
 * POST /api/v1/stores/:id/test
 * Test the API credentials of a connected store without triggering a full sync.
 */
router.post(
  '/:id/test',
  StoreController.validateStoreId,
  StoreController.testConnection
);

/**
 * DELETE /api/v1/stores/:id
 * Disconnect (archive) a store. Products and posters are retained.
 */
router.delete(
  '/:id',
  StoreController.validateStoreId,
  StoreController.disconnectStore
);

// â”€â”€â”€ Export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default router;
