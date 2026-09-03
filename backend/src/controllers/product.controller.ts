import { Request, Response } from 'express';
import { query, param, body, validationResult, ValidationChain } from 'express-validator';
import { StatusCodes } from 'http-status-codes';
import * as ProductService from '../services/product.service';
import { asyncHandler, ValidationError } from '../middleware/errorMiddleware';
import {
  ProductStatus,
  ProductSource,
  ProductProcessingStatus,
} from '../models/Product';

// â”€â”€â”€ Validation Chains â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const validateListQuery: ValidationChain[] = [
  query('storeId')
    .optional()
    .isUUID().withMessage('storeId must be a valid UUID.'),

  query('status')
    .optional()
    .isIn(Object.values(ProductStatus))
    .withMessage(`status must be one of: ${Object.values(ProductStatus).join(', ')}.`),

  query('source')
    .optional()
    .isIn(Object.values(ProductSource))
    .withMessage(`source must be one of: ${Object.values(ProductSource).join(', ')}.`),

  query('processingStatus')
    .optional()
    .isIn(Object.values(ProductProcessingStatus))
    .withMessage(`processingStatus must be one of: ${Object.values(ProductProcessingStatus).join(', ')}.`),

  query('category')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('category must be between 1 and 100 characters.'),

  query('tag')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('tag must be between 1 and 100 characters.'),

  query('vendor')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 }).withMessage('vendor must be between 1 and 255 characters.'),

  query('hasVariants')
    .optional()
    .isBoolean().withMessage('hasVariants must be true or false.')
    .toBoolean(),

  query('readyForGeneration')
    .optional()
    .isBoolean().withMessage('readyForGeneration must be true or false.')
    .toBoolean(),

  query('minPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('minPrice must be a non-negative number.')
    .toFloat(),

  query('maxPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('maxPrice must be a non-negative number.')
    .toFloat()
    .custom((value, { req }) => {
      const min = parseFloat(req.query?.['minPrice'] as string);
      if (!isNaN(min) && value < min) {
        throw new Error('maxPrice must be greater than or equal to minPrice.');
      }
      return true;
    }),

  query('search')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('search must be between 2 and 200 characters.'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page must be a positive integer.')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100.')
    .toInt(),

  query('sortBy')
    .optional()
    .isIn(['name', 'price', 'createdAt', 'updatedAt', 'lastSyncedAt', 'status'])
    .withMessage('sortBy must be one of: name, price, createdAt, updatedAt, lastSyncedAt, status.'),

  query('sortDir')
    .optional()
    .isIn(['asc', 'desc']).withMessage('sortDir must be asc or desc.'),
];

export const validateProductId: ValidationChain[] = [
  param('id')
    .isUUID().withMessage('Invalid product ID.'),
];

export const validateAnalyticsQuery: ValidationChain[] = [
  query('storeId')
    .optional()
    .isUUID().withMessage('storeId must be a valid UUID.'),
];

export const validateFilterMetaQuery: ValidationChain[] = [
  query('storeId')
    .optional()
    .isUUID().withMessage('storeId must be a valid UUID.'),
];

export const validateProcessingUpdate: ValidationChain[] = [
  param('id')
    .isUUID().withMessage('Invalid product ID.'),

  body('action')
    .notEmpty().withMessage('action is required.')
    .isIn(['markProcessing', 'markFailed', 'markStale'])
    .withMessage('action must be one of: markProcessing, markFailed, markStale.'),

  body('errorMessage')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('errorMessage cannot exceed 2,000 characters.'),
];

export const validateSearchQuery: ValidationChain[] = [
  query('q')
    .trim()
    .notEmpty().withMessage('Search query (q) is required.')
    .isLength({ min: 2, max: 200 }).withMessage('Search query must be between 2 and 200 characters.'),

  // Inherit pagination + sort from list validation â€” reuse slices
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sortBy')
    .optional()
    .isIn(['name', 'price', 'createdAt', 'updatedAt', 'lastSyncedAt', 'status']),
  query('sortDir').optional().isIn(['asc', 'desc']),
  query('storeId').optional().isUUID(),
  query('status').optional().isIn(Object.values(ProductStatus)),
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
 * GET /api/v1/products
 * List products for the authenticated user with filtering, sorting, and pagination.
 *
 * Query params: storeId, status, source, processingStatus, category, tag, vendor,
 *               hasVariants, readyForGeneration, minPrice, maxPrice, search,
 *               page, limit, sortBy, sortDir
 *
 * Response 200: { success, data: { products[], pagination, appliedFilters } }
 */
export const listProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  assertValid(req);

  const ownerId = req.user!._id.toString();
  const q = req.query as Record<string, string>;

  const result = await ProductService.listProducts({
    ownerId,
    storeId: q['storeId'],
    status: q['status'] as ProductStatus | undefined,
    source: q['source'] as ProductSource | undefined,
    processingStatus: q['processingStatus'] as ProductProcessingStatus | undefined,
    category: q['category'],
    tag: q['tag'],
    vendor: q['vendor'],
    hasVariants: q['hasVariants'] !== undefined ? q['hasVariants'] === 'true' : undefined,
    readyForGeneration: q['readyForGeneration'] === 'true',
    minPrice: q['minPrice'] !== undefined ? parseFloat(q['minPrice']) : undefined,
    maxPrice: q['maxPrice'] !== undefined ? parseFloat(q['maxPrice']) : undefined,
    search: q['search'],
    page: q['page'] !== undefined ? parseInt(q['page'], 10) : undefined,
    limit: q['limit'] !== undefined ? parseInt(q['limit'], 10) : undefined,
    sortBy: q['sortBy'] as ProductService.SortField | undefined,
    sortDir: q['sortDir'] as ProductService.SortDirection | undefined,
  });

  res.status(StatusCodes.OK).json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/v1/products/search
 * Full-text search across product name, description, and tags.
 * Results are sorted by relevance score, then by creation date.
 *
 * Query params: q (required), plus all list filters and pagination params
 *
 * Response 200: { success, data: { products[], pagination, appliedFilters } }
 */
export const searchProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  assertValid(req);

  const ownerId = req.user!._id.toString();
  const q = req.query as Record<string, string>;

  const result = await ProductService.searchProducts(ownerId, q['q'] ?? '', {
    storeId: q['storeId'],
    status: q['status'] as ProductStatus | undefined,
    page: q['page'] !== undefined ? parseInt(q['page'], 10) : undefined,
    limit: q['limit'] !== undefined ? parseInt(q['limit'], 10) : undefined,
    sortBy: q['sortBy'] as ProductService.SortField | undefined,
    sortDir: q['sortDir'] as ProductService.SortDirection | undefined,
  });

  res.status(StatusCodes.OK).json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/v1/products/:id
 * Get a single product by PostgreSQL _id.
 * Populates store name, slug, type, status, and poster defaults.
 *
 * Response 200: { success, data: { product } }
 */
export const getProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  assertValid(req);

  const productId = req.params['id']!;
  const ownerId = req.user!._id.toString();

  const product = await ProductService.getProductById(productId, ownerId);

  res.status(StatusCodes.OK).json({
    success: true,
    data: { product },
  });
});

/**
 * GET /api/v1/products/analytics
 * Aggregate analytics for the authenticated user's product catalogue.
 * Optionally scoped to a single store via ?storeId=<id>.
 *
 * Response 200: { success, data: { analytics } }
 */
export const getAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  assertValid(req);

  const ownerId = req.user!._id.toString();
  const storeId = req.query['storeId'] as string | undefined;

  const analytics = await ProductService.getProductAnalytics(ownerId, storeId);

  res.status(StatusCodes.OK).json({
    success: true,
    data: { analytics },
  });
});

/**
 * GET /api/v1/products/filters/categories
 * Return a sorted list of all distinct category names for the authenticated user.
 * Optionally scoped to a store via ?storeId=<id>.
 * Used to populate filter dropdown in the dashboard.
 *
 * Response 200: { success, data: { categories: string[] } }
 */
export const getCategories = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  assertValid(req);

  const ownerId = req.user!._id.toString();
  const storeId = req.query['storeId'] as string | undefined;

  const categories = await ProductService.getDistinctCategories(ownerId, storeId);

  res.status(StatusCodes.OK).json({
    success: true,
    data: { categories, total: categories.length },
  });
});

/**
 * GET /api/v1/products/filters/vendors
 * Return a sorted list of all distinct vendor names for the authenticated user.
 * Optionally scoped to a store via ?storeId=<id>.
 * Used to populate filter dropdown in the dashboard.
 *
 * Response 200: { success, data: { vendors: string[] } }
 */
export const getVendors = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  assertValid(req);

  const ownerId = req.user!._id.toString();
  const storeId = req.query['storeId'] as string | undefined;

  const vendors = await ProductService.getDistinctVendors(ownerId, storeId);

  res.status(StatusCodes.OK).json({
    success: true,
    data: { vendors, total: vendors.length },
  });
});

/**
 * PATCH /api/v1/products/:id/processing
 * Update the AI processing status of a product.
 * Called by the AI engine (Phase 7) to track progress.
 * Also usable from the dashboard to manually reset stale/failed products.
 *
 * Body: { action: 'markProcessing' | 'markFailed' | 'markStale', errorMessage?: string }
 *
 * Response 200: { success, message, data: { product } }
 */
export const updateProcessingStatus = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const productId = req.params['id']!;
    const ownerId = req.user!._id.toString();
    const { action, errorMessage } = req.body as {
      action: 'markProcessing' | 'markFailed' | 'markStale';
      errorMessage?: string;
    };

    const product = await ProductService.updateProcessingStatus(
      productId,
      ownerId,
      action,
      errorMessage
    );

    const messages: Record<string, string> = {
      markProcessing: 'Product marked as processing.',
      markFailed: 'Product marked as failed.',
      markStale: 'Product marked as stale and queued for reprocessing.',
    };

    res.status(StatusCodes.OK).json({
      success: true,
      message: messages[action] ?? 'Processing status updated.',
      data: {
        product: {
          _id: product._id,
          name: product.name,
          processingMetadata: product.processingMetadata,
          updatedAt: product.updatedAt,
        },
      },
    });
  }
);
