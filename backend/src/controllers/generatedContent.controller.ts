import { Request, Response } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { StatusCodes } from 'http-status-codes';
import * as GeneratedContentService from '../services/generatedContent.service';
import { asyncHandler, ValidationError } from '../middleware/errorMiddleware';
import { ContentType, ContentLanguage, ContentStatus } from '../models/GeneratedContent';
import { PosterStyle, ContentTone } from '../services/promptBuilder.service';

// ─── Validation Helpers ───────────────────────────────────────────────────────

const CONTENT_TYPE_VALUES = Object.values(ContentType);
const CONTENT_LANGUAGE_VALUES = Object.values(ContentLanguage);
const CONTENT_STATUS_VALUES = Object.values(ContentStatus);
const POSTER_STYLE_VALUES = Object.values(PosterStyle);
const CONTENT_TONE_VALUES = Object.values(ContentTone);

// ─── Shared Body Rules ────────────────────────────────────────────────────────
// These rules are reused across generate and regenerate endpoints.

const sharedGenerationBodyRules: ValidationChain[] = [
  body('style')
    .trim()
    .notEmpty().withMessage('style is required.')
    .isIn(POSTER_STYLE_VALUES)
    .withMessage(`style must be one of: ${POSTER_STYLE_VALUES.join(', ')}.`),

  body('tone')
    .trim()
    .notEmpty().withMessage('tone is required.')
    .isIn(CONTENT_TONE_VALUES)
    .withMessage(`tone must be one of: ${CONTENT_TONE_VALUES.join(', ')}.`),

  body('language')
    .optional()
    .trim()
    .isIn(CONTENT_LANGUAGE_VALUES)
    .withMessage(`language must be one of: ${CONTENT_LANGUAGE_VALUES.join(', ')}.`),

  body('variantCount')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('variantCount must be an integer between 1 and 5.')
    .toInt(),

  body('customInstructions')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('customInstructions cannot exceed 500 characters.'),

  body('discountPercent')
    .optional()
    .isFloat({ min: 1, max: 99 }).withMessage('discountPercent must be between 1 and 99.')
    .toFloat(),

  body('callToActionText')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('callToActionText cannot exceed 100 characters.'),
];

// ─── Validation Chains ────────────────────────────────────────────────────────

export const validateGenerateContent: ValidationChain[] = [
  param('productId')
    .isUUID().withMessage('Invalid product ID.'),

  body('contentType')
    .trim()
    .notEmpty().withMessage('contentType is required.')
    .isIn(CONTENT_TYPE_VALUES)
    .withMessage(`contentType must be one of: ${CONTENT_TYPE_VALUES.join(', ')}.`),

  ...sharedGenerationBodyRules,
];

export const validateGenerateAll: ValidationChain[] = [
  param('productId')
    .isUUID().withMessage('Invalid product ID.'),

  ...sharedGenerationBodyRules,
];

export const validateRegenerateContent: ValidationChain[] = [
  param('generatedContentId')
    .isUUID().withMessage('Invalid content ID.'),

  ...sharedGenerationBodyRules,
];

export const validateGetByProduct: ValidationChain[] = [
  param('productId')
    .isUUID().withMessage('Invalid product ID.'),

  query('contentType')
    .optional()
    .isIn(CONTENT_TYPE_VALUES)
    .withMessage(`contentType must be one of: ${CONTENT_TYPE_VALUES.join(', ')}.`),
];

export const validateContentId: ValidationChain[] = [
  param('contentId')
    .isUUID().withMessage('Invalid content ID.'),
];

export const validateSelectVariant: ValidationChain[] = [
  param('contentId')
    .isUUID().withMessage('Invalid content ID.'),

  body('variantIndex')
    .notEmpty().withMessage('variantIndex is required.')
    .isInt({ min: 0, max: 4 }).withMessage('variantIndex must be an integer between 0 and 4.')
    .toInt(),
];

export const validateHistoryQuery: ValidationChain[] = [
  query('productId')
    .optional()
    .isUUID().withMessage('productId must be a valid UUID.'),

  query('storeId')
    .optional()
    .isUUID().withMessage('storeId must be a valid UUID.'),

  query('contentType')
    .optional()
    .isIn(CONTENT_TYPE_VALUES)
    .withMessage(`contentType must be one of: ${CONTENT_TYPE_VALUES.join(', ')}.`),

  query('status')
    .optional()
    .isIn(CONTENT_STATUS_VALUES)
    .withMessage(`status must be one of: ${CONTENT_STATUS_VALUES.join(', ')}.`),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page must be a positive integer.')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100.')
    .toInt(),
];

export const validateUsageStatsQuery: ValidationChain[] = [
  query('storeId')
    .optional()
    .isUUID().withMessage('storeId must be a valid UUID.'),
];

// ─── Helper ───────────────────────────────────────────────────────────────────

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

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/v1/generated-content/generate/:productId
 * Generate a single content type for the given product.
 * Creates a new versioned GeneratedContent record.
 *
 * Params: productId
 * Body: { contentType, style, tone, language?, variantCount?, customInstructions?,
 *         discountPercent?, callToActionText? }
 *
 * Response 201: { success, message, data: { content } }
 */
export const generateContent = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const productId = req.params['productId']!;
    const ownerId = req.user!._id.toString();

    const {
      contentType,
      style,
      tone,
      language = ContentLanguage.EN,
      variantCount = 1,
      customInstructions,
      discountPercent,
      callToActionText,
    } = req.body as {
      contentType: ContentType;
      style: PosterStyle;
      tone: ContentTone;
      language?: ContentLanguage;
      variantCount?: number;
      customInstructions?: string;
      discountPercent?: number;
      callToActionText?: string;
    };

    const content = await GeneratedContentService.generateContent(productId, ownerId, {
      contentType,
      style,
      tone,
      language,
      variantCount,
      customInstructions,
      discountPercent,
      callToActionText,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: `${contentType.replace(/_/g, ' ')} generated successfully.`,
      data: { content },
    });
  }
);

/**
 * POST /api/v1/generated-content/generate-all/:productId
 * Generate all standard content types for a product in one request.
 * Runs sequentially — returns a summary array, not full records.
 *
 * Params: productId
 * Body: { style, tone, language?, variantCount?, customInstructions?,
 *         discountPercent?, callToActionText? }
 *
 * Response 201: { success, message, data: { results[], successCount, failCount } }
 */
export const generateAllContent = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const productId = req.params['productId']!;
    const ownerId = req.user!._id.toString();

    const {
      style,
      tone,
      language = ContentLanguage.EN,
      variantCount = 1,
      customInstructions,
      discountPercent,
      callToActionText,
    } = req.body as {
      style: PosterStyle;
      tone: ContentTone;
      language?: ContentLanguage;
      variantCount?: number;
      customInstructions?: string;
      discountPercent?: number;
      callToActionText?: string;
    };

    const results = await GeneratedContentService.generateAllContent(productId, ownerId, {
      style,
      tone,
      language,
      variantCount,
      customInstructions,
      discountPercent,
      callToActionText,
    });

    const successCount = results.filter((r) => r.status === ContentStatus.COMPLETED).length;
    const failCount = results.filter((r) => r.status === ContentStatus.FAILED).length;

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: `Generated ${successCount} content type(s)${failCount > 0 ? `, ${failCount} failed` : ''}.`,
      data: {
        results,
        successCount,
        failCount,
      },
    });
  }
);

/**
 * POST /api/v1/generated-content/regenerate/:generatedContentId
 * Regenerate a specific GeneratedContent record.
 * Preserves the existing content type and updates only the requested row.
 *
 * Params: generatedContentId
 * Body: { style, tone, language?, variantCount?, customInstructions?,
 *         discountPercent?, callToActionText? }
 *
 * Response 200: { success, message, data: { content } }
 */
export const regenerateContent = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const generatedContentId = req.params['generatedContentId']!;
    const ownerId = req.user!._id.toString();

    const {
      style,
      tone,
      language = ContentLanguage.EN,
      variantCount = 1,
      customInstructions,
      discountPercent,
      callToActionText,
    } = req.body as {
      style: PosterStyle;
      tone: ContentTone;
      language?: ContentLanguage;
      variantCount?: number;
      customInstructions?: string;
      discountPercent?: number;
      callToActionText?: string;
    };

    const content = await GeneratedContentService.regenerateContent(generatedContentId, ownerId, {
      style,
      tone,
      language,
      variantCount,
      customInstructions,
      discountPercent,
      callToActionText,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: `${content.contentType.replace(/_/g, ' ')} regenerated.`,
      data: { content },
    });
  }
);

/**
 * GET /api/v1/generated-content/product/:productId
 * Retrieve all GeneratedContent records for a product.
 * Sorted by version desc so the latest generation is always first.
 * Optionally filtered by contentType via query param.
 *
 * Params: productId
 * Query: contentType?
 *
 * Response 200: { success, data: { records[], total, latestByType } }
 */
export const getContentByProduct = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const productId = req.params['productId']!;
    const ownerId = req.user!._id.toString();
    const contentType = req.query['contentType'] as ContentType | undefined;

    const records = await GeneratedContentService.getContentByProduct(
      productId,
      ownerId,
      contentType
    );

    // Compute a latestByType summary for the dashboard — latest approved/completed
    // record per content type without requiring a separate API call
    const latestByType: Record<string, { contentId: string; status: string; version: number; selectedText: string | null } | null> =
      {};

    if (!contentType) {
      for (const type of Object.values(ContentType)) {
        const latest = records.find((r) => r.contentType === type) ?? null;
        latestByType[type] = latest
          ? {
              contentId: latest._id.toString(),
              status: latest.status,
              version: latest.version,
              selectedText: latest.selectedText,
            }
          : null;
      }
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        records,
        total: records.length,
        ...(Object.keys(latestByType).length > 0 && { latestByType }),
      },
    });
  }
);

/**
 * GET /api/v1/generated-content/:contentId
 * Retrieve a single GeneratedContent record by its ID.
 *
 * Response 200: { success, data: { content } }
 */
export const getContentById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const contentId = req.params['contentId']!;
    const ownerId = req.user!._id.toString();

    const content = await GeneratedContentService.getContentById(contentId, ownerId);

    res.status(StatusCodes.OK).json({
      success: true,
      data: { content },
    });
  }
);

/**
 * PATCH /api/v1/generated-content/:contentId/select-variant
 * Select a specific variant as the approved version.
 * Sets isSelected=true on the chosen variant, false on all others.
 * Transitions the record to status APPROVED.
 *
 * Body: { variantIndex: number }
 *
 * Response 200: { success, message, data: { content } }
 */
export const selectVariant = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const contentId = req.params['contentId']!;
    const ownerId = req.user!._id.toString();
    const { variantIndex } = req.body as { variantIndex: number };

    const content = await GeneratedContentService.selectVariant(
      contentId,
      ownerId,
      variantIndex
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Variant ${variantIndex} selected and content approved.`,
      data: { content },
    });
  }
);

/**
 * GET /api/v1/generated-content/history
 * Paginated content history for the authenticated user.
 * Supports filtering by product, store, contentType, and status.
 *
 * Query: productId?, storeId?, contentType?, status?, page?, limit?
 *
 * Response 200: { success, data: { records[], pagination } }
 */
export const getHistory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const ownerId = req.user!._id.toString();
    const q = req.query as Record<string, string>;

    const result = await GeneratedContentService.getContentHistory({
      ownerId,
      productId: q['productId'],
      storeId: q['storeId'],
      contentType: q['contentType'] as ContentType | undefined,
      status: q['status'] as ContentStatus | undefined,
      page: q['page'] ? parseInt(q['page'], 10) : undefined,
      limit: q['limit'] ? parseInt(q['limit'], 10) : undefined,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      data: result,
    });
  }
);

/**
 * GET /api/v1/generated-content/usage-stats
 * Token usage and cost analytics for the authenticated user.
 * Optionally scoped to a specific store via ?storeId=<id>.
 *
 * Response 200: { success, data: { stats } }
 */
export const getUsageStats = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const ownerId = req.user!._id.toString();
    const storeId = req.query['storeId'] as string | undefined;

    const stats = await GeneratedContentService.getUsageStats(ownerId, storeId);

    res.status(StatusCodes.OK).json({
      success: true,
      data: { stats },
    });
  }
);

/**
 * DELETE /api/v1/generated-content/:contentId
 * Delete a single GeneratedContent record.
 * Only records with status FAILED or REJECTED may be deleted.
 *
 * Response 200: { success, message }
 */
export const deleteContent = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const contentId = req.params['contentId']!;
    const ownerId = req.user!._id.toString();

    await GeneratedContentService.deleteContent(contentId, ownerId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Content record deleted successfully.',
    });
  }
);
