import { Request, Response } from 'express';
import { body, param, validationResult, ValidationChain } from 'express-validator';
import { StatusCodes } from 'http-status-codes';
import * as StoreService from '../services/store.service';
import { asyncHandler, ValidationError } from '../middleware/errorMiddleware';

// â”€â”€â”€ Inline Validation Chains â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Kept in the controller file (rather than a separate validation file) because
// the store module only has two connect variants and no reuse elsewhere.

export const validateConnectShopify: ValidationChain[] = [
  body('name')
    .trim()
    .notEmpty().withMessage('Store name is required.')
    .isLength({ min: 2, max: 150 }).withMessage('Store name must be between 2 and 150 characters.'),

  body('shopDomain')
    .trim()
    .notEmpty().withMessage('Shopify shop domain is required.')
    .matches(/^[a-z0-9-]+\.myshopify\.com$/)
    .withMessage('Shop domain must be in the format: your-store.myshopify.com'),

  body('accessToken')
    .trim()
    .notEmpty().withMessage('Shopify access token is required.')
    .isLength({ min: 10 }).withMessage('Access token appears to be invalid.'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters.'),
];

export const validateConnectWooCommerce: ValidationChain[] = [
  body('name')
    .trim()
    .notEmpty().withMessage('Store name is required.')
    .isLength({ min: 2, max: 150 }).withMessage('Store name must be between 2 and 150 characters.'),

  body('storeUrl')
    .trim()
    .notEmpty().withMessage('Store URL is required.')
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Store URL must be a valid URL including http:// or https://'),

  body('consumerKey')
    .trim()
    .notEmpty().withMessage('WooCommerce consumer key is required.')
    .matches(/^ck_/).withMessage('Consumer key must start with "ck_".'),

  body('consumerSecret')
    .trim()
    .notEmpty().withMessage('WooCommerce consumer secret is required.')
    .matches(/^cs_/).withMessage('Consumer secret must start with "cs_".'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters.'),
];

export const validateStoreId: ValidationChain[] = [
  param('id')
    .isUUID().withMessage('Invalid store ID.'),
];

// â”€â”€â”€ Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function assertValid(req: Request): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      'Validation failed. Please check your input.',
      errors.array().map((e) => ({
        field: e.type === 'field' ? e.path : e.type,
        message: e.msg,
      }))
    );
  }
}

// â”€â”€â”€ Controllers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * GET /api/v1/stores
 * Protected â€” return all stores owned by the authenticated user.
 *
 * Response 200: { success, data: { stores[] } }
 */
export const getStores = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const ownerId = req.user!._id.toString();
  const stores = await StoreService.getStoresByOwner(ownerId);

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      stores: stores.map((s) => ({
        _id: s._id,
        name: s.name,
        slug: s.slug,
        description: s.description,
        logoUrl: s.logoUrl,
        type: s.type,
        status: s.status,
        syncState: s.syncState,
        usageStats: s.usageStats,
        posterDefaults: s.posterDefaults,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
      total: stores.length,
    },
  });
});

/**
 * GET /api/v1/stores/:id
 * Protected â€” return a single store by ID (ownership enforced).
 *
 * Response 200: { success, data: { store } }
 */
export const getStore = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  assertValid(req);

  const storeId = req.params['id']!;
  const ownerId = req.user!._id.toString();

  const store = await StoreService.getStoreById(storeId, ownerId);

  res.status(StatusCodes.OK).json({
    success: true,
    data: { store },
  });
});

/**
 * POST /api/v1/stores/connect/shopify
 * Protected â€” validate Shopify credentials and persist the connected store.
 *
 * Body: { name, shopDomain, accessToken, description? }
 * Response 201: { success, message, data: { store } }
 */
export const connectShopify = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  assertValid(req);

  const ownerId = req.user!._id.toString();
  const { name, shopDomain, accessToken, description } = req.body as {
    name: string;
    shopDomain: string;
    accessToken: string;
    description?: string;
  };

  const store = await StoreService.connectShopify(ownerId, {
    name,
    shopDomain,
    accessToken,
    description,
  });

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: `Shopify store "${store.name}" connected successfully.`,
    data: {
      store: {
        _id: store._id,
        name: store.name,
        slug: store.slug,
        type: store.type,
        status: store.status,
        syncState: store.syncState,
        usageStats: store.usageStats,
        posterDefaults: store.posterDefaults,
        createdAt: store.createdAt,
      },
    },
  });
});

/**
 * POST /api/v1/stores/connect/woocommerce
 * Protected â€” validate WooCommerce credentials and persist the connected store.
 *
 * Body: { name, storeUrl, consumerKey, consumerSecret, description? }
 * Response 201: { success, message, data: { store } }
 */
export const connectWooCommerce = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const ownerId = req.user!._id.toString();
    const { name, storeUrl, consumerKey, consumerSecret, description } = req.body as {
      name: string;
      storeUrl: string;
      consumerKey: string;
      consumerSecret: string;
      description?: string;
    };

    const store = await StoreService.connectWooCommerce(ownerId, {
      name,
      storeUrl,
      consumerKey,
      consumerSecret,
      description,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: `WooCommerce store "${store.name}" connected successfully.`,
      data: {
        store: {
          _id: store._id,
          name: store.name,
          slug: store.slug,
          type: store.type,
          status: store.status,
          syncState: store.syncState,
          usageStats: store.usageStats,
          posterDefaults: store.posterDefaults,
          createdAt: store.createdAt,
        },
      },
    });
  }
);

/**
 * POST /api/v1/stores/:id/sync
 * Protected â€” fetch all products from the external store and upsert into PostgreSQL.
 * Can be long-running; returns immediately with the sync result.
 *
 * Response 200: { success, message, data: { result } }
 */
export const syncStore = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  assertValid(req);

  const storeId = req.params['id']!;
  const ownerId = req.user!._id.toString();

  const result = await StoreService.syncProducts(storeId, ownerId);

  const hasErrors = result.errors.length > 0;
  const message = hasErrors
    ? `Sync completed with ${result.failed} error(s). ${result.created} created, ${result.updated} updated.`
    : `Sync completed successfully. ${result.created} created, ${result.updated} updated.`;

  res.status(StatusCodes.OK).json({
    success: true,
    message,
    data: { result },
  });
});

/**
 * POST /api/v1/stores/:id/test
 * Protected â€” test the API credentials of a connected store without syncing.
 *
 * Response 200: { success, message, data: { connected } }
 */
export const testConnection = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  assertValid(req);

  const storeId = req.params['id']!;
  const ownerId = req.user!._id.toString();

  const result = await StoreService.testStoreConnection(storeId, ownerId);

  res.status(StatusCodes.OK).json({
    success: true,
    message: result.message,
    data: { connected: result.success },
  });
});

/**
 * DELETE /api/v1/stores/:id
 * Protected â€” archive (disconnect) a store. Products are retained.
 *
 * Response 200: { success, message }
 */
export const disconnectStore = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const storeId = req.params['id']!;
    const ownerId = req.user!._id.toString();

    await StoreService.disconnectStore(storeId, ownerId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Store disconnected successfully. Generated posters have been retained.',
    });
  }
);
