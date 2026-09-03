import { Request, Response } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { StatusCodes } from 'http-status-codes';
import * as PosterService from '../services/poster.service';
import { asyncHandler, ValidationError } from '../middleware/errorMiddleware';
import {
  GenerationStatus,
  PosterFormat,
  PosterSize,
} from '../models/Poster';
import { PosterStyle } from '../generated-content/promptBuilder.service';
import { getAvailableStyles } from '../services/template.service';

// â”€â”€â”€ Enum Value Arrays (built once, used in validators) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const POSTER_SIZE_VALUES   = Object.values(PosterSize);
const POSTER_FORMAT_VALUES = Object.values(PosterFormat);
const POSTER_STYLE_VALUES  = Object.values(PosterStyle);
const GEN_STATUS_VALUES    = Object.values(GenerationStatus);

// â”€â”€â”€ Validation Chains â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const validateGeneratePoster: ValidationChain[] = [
  param('productId')
    .isUUID().withMessage('Invalid product ID.'),

  body('style')
    .trim()
    .notEmpty().withMessage('style is required.')
    .isIn(POSTER_STYLE_VALUES)
    .withMessage(`style must be one of: ${POSTER_STYLE_VALUES.join(', ')}.`),

  body('size')
    .trim()
    .notEmpty().withMessage('size is required.')
    .isIn(POSTER_SIZE_VALUES)
    .withMessage(`size must be one of: ${POSTER_SIZE_VALUES.join(', ')}.`),

  body('format')
    .optional()
    .trim()
    .isIn(POSTER_FORMAT_VALUES)
    .withMessage(`format must be one of: ${POSTER_FORMAT_VALUES.join(', ')}.`),

  body('templateId')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('templateId must be between 1 and 100 characters.'),

  body('contentId')
    .optional()
    .isUUID().withMessage('contentId must be a valid UUID.'),

  body('title')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('title cannot exceed 255 characters.'),

  body('tags')
    .optional()
    .isArray({ max: 20 }).withMessage('tags must be an array with at most 20 items.')
    .custom((tags: unknown[]) => {
      if (!Array.isArray(tags)) return true;
      for (const tag of tags) {
        if (typeof tag !== 'string' || tag.length > 50) {
          throw new Error('Each tag must be a string of at most 50 characters.');
        }
      }
      return true;
    }),
];

export const validateRegeneratePoster: ValidationChain[] = [
  param('posterId')
    .isUUID().withMessage('Invalid poster ID.'),

  body('style')
    .optional()
    .trim()
    .isIn(POSTER_STYLE_VALUES)
    .withMessage(`style must be one of: ${POSTER_STYLE_VALUES.join(', ')}.`),

  body('size')
    .optional()
    .trim()
    .isIn(POSTER_SIZE_VALUES)
    .withMessage(`size must be one of: ${POSTER_SIZE_VALUES.join(', ')}.`),

  body('format')
    .optional()
    .trim()
    .isIn(POSTER_FORMAT_VALUES)
    .withMessage(`format must be one of: ${POSTER_FORMAT_VALUES.join(', ')}.`),

  body('templateId')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('templateId must be between 1 and 100 characters.'),

  body('contentId')
    .optional()
    .isUUID().withMessage('contentId must be a valid UUID.'),

  body('title')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('title cannot exceed 255 characters.'),
];

export const validatePosterId: ValidationChain[] = [
  param('posterId')
    .isUUID().withMessage('Invalid poster ID.'),
];

export const validateProductId: ValidationChain[] = [
  param('productId')
    .isUUID().withMessage('Invalid product ID.'),
];

export const validateListQuery: ValidationChain[] = [
  query('productId')
    .optional().isUUID().withMessage('productId must be a valid UUID.'),

  query('storeId')
    .optional().isUUID().withMessage('storeId must be a valid UUID.'),

  query('generationStatus')
    .optional()
    .isIn(GEN_STATUS_VALUES)
    .withMessage(`generationStatus must be one of: ${GEN_STATUS_VALUES.join(', ')}.`),

  query('size')
    .optional()
    .isIn(POSTER_SIZE_VALUES)
    .withMessage(`size must be one of: ${POSTER_SIZE_VALUES.join(', ')}.`),

  query('format')
    .optional()
    .isIn(POSTER_FORMAT_VALUES)
    .withMessage(`format must be one of: ${POSTER_FORMAT_VALUES.join(', ')}.`),

  query('isFavourited')
    .optional()
    .isBoolean().withMessage('isFavourited must be true or false.')
    .toBoolean(),

  query('isPublic')
    .optional()
    .isBoolean().withMessage('isPublic must be true or false.')
    .toBoolean(),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page must be a positive integer.')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100.')
    .toInt(),
];

export const validateExport: ValidationChain[] = [
  param('posterId')
    .isUUID().withMessage('Invalid poster ID.'),

  body('format')
    .trim()
    .notEmpty().withMessage('format is required.')
    .isIn(POSTER_FORMAT_VALUES)
    .withMessage(`format must be one of: ${POSTER_FORMAT_VALUES.join(', ')}.`),
];

export const validateSaveEdit: ValidationChain[] = [
  param('posterId')
    .isUUID().withMessage('Invalid poster ID.'),

  body('svg')
    .isString().withMessage('svg is required.')
    .isLength({ min: 20, max: 2_000_000 }).withMessage('svg must be between 20 and 2,000,000 characters.'),

  body('saveAsNew')
    .optional()
    .isBoolean().withMessage('saveAsNew must be true or false.')
    .toBoolean(),

  body('editState')
    .optional(),
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

function resolveIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
    req.ip ??
    'unknown'
  );
}

function optionalBooleanQuery(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return undefined;
}

// â”€â”€â”€ Controllers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * POST /api/v1/posters/generate/:productId
 * Generate a new poster for a product using AI-generated content and a template.
 * Requires at least one completed GeneratedContent record for the product.
 *
 * Params: productId
 * Body: { style, size, format?, templateId?, contentId?, title?, tags? }
 *
 * Response 201: { success, message, data: { poster } }
 */
export const generatePoster = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const productId = req.params['productId']!;
    const ownerId   = req.user!._id.toString();

    const {
      style,
      size,
      format = PosterFormat.JPEG,
      templateId,
      contentId,
      title,
      tags,
    } = req.body as {
      style: PosterStyle;
      size: PosterSize;
      format?: PosterFormat;
      templateId?: string;
      contentId?: string;
      title?: string;
      tags?: string[];
    };

    const poster = await PosterService.generatePoster(productId, ownerId, {
      style,
      size,
      format,
      templateId,
      contentId,
      title,
      tags,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Poster generated successfully.',
      data: { poster },
    });
  }
);

/**
 * POST /api/v1/posters/regenerate/:posterId
 * Regenerate a poster from an existing one.
 * Increments version and links to parent via parentPosterId.
 *
 * Params: posterId
 * Body: { style?, size?, format?, templateId?, contentId?, title? }
 *
 * Response 201: { success, message, data: { poster } }
 */
export const regeneratePoster = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const posterId = req.params['posterId']!;
    const ownerId  = req.user!._id.toString();

    const { style, size, format, templateId, contentId, title } = req.body as {
      style?: PosterStyle;
      size?: PosterSize;
      format?: PosterFormat;
      templateId?: string;
      contentId?: string;
      title?: string;
    };

    const poster = await PosterService.regeneratePoster(posterId, ownerId, {
      style,
      size,
      format,
      templateId,
      contentId,
      title,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: `Poster regenerated successfully (version ${poster.version}).`,
      data: { poster },
    });
  }
);

/**
 * GET /api/v1/posters
 * Paginated list of posters for the authenticated user.
 *
 * Query: productId?, storeId?, generationStatus?, size?, format?,
 *        isFavourited?, isPublic?, page?, limit?
 *
 * Response 200: { success, data: { posters[], pagination } }
 */
export const listPosters = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const ownerId = req.user!._id.toString();
    const q = req.query as Record<string, unknown>;

    const result = await PosterService.listPosters({
      ownerId,
      productId:        q['productId'] as string | undefined,
      storeId:          q['storeId'] as string | undefined,
      generationStatus: q['generationStatus'] as GenerationStatus | undefined,
      size:             q['size']   as PosterSize   | undefined,
      format:           q['format'] as PosterFormat | undefined,
      isFavourited: optionalBooleanQuery(q['isFavourited']),
      isPublic:     optionalBooleanQuery(q['isPublic']),
      page:  typeof q['page'] === 'number' ? q['page'] : q['page'] ? parseInt(String(q['page']), 10) : undefined,
      limit: typeof q['limit'] === 'number' ? q['limit'] : q['limit'] ? parseInt(String(q['limit']), 10) : undefined,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      data: result,
    });
  }
);

/**
 * GET /api/v1/posters/product/:productId
 * All posters for a specific product, sorted latest-version-first.
 *
 * Params: productId
 * Response 200: { success, data: { posters[], total } }
 */
export const getPostersByProduct = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const productId = req.params['productId']!;
    const ownerId   = req.user!._id.toString();

    const posters = await PosterService.getPostersByProduct(productId, ownerId);

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        posters,
        total: posters.length,
      },
    });
  }
);

/**
 * GET /api/v1/posters/:posterId
 * Get a single poster by its PostgreSQL _id.
 * Populates product and generatedContent references.
 *
 * Params: posterId
 * Response 200: { success, data: { poster } }
 */
export const getPoster = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const posterId = req.params['posterId']!;
    const ownerId  = req.user!._id.toString();

    const poster = await PosterService.getPosterById(posterId, ownerId);

    res.status(StatusCodes.OK).json({
      success: true,
      data: { poster },
    });
  }
);

/**
 * GET /api/v1/posters/preview/:posterId
 * Generate a signed, time-limited preview URL (1 hour TTL).
 * The poster must be in COMPLETED status.
 *
 * Params: posterId
 * Response 200: { success, data: { posterId, previewUrl, expiresAt, isCompleted } }
 */
export const previewPoster = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const posterId = req.params['posterId']!;
    const ownerId  = req.user!._id.toString();

    const result = await PosterService.previewPoster(posterId, ownerId);

    res.status(StatusCodes.OK).json({
      success: true,
      data: result,
    });
  }
);

/**
 * DELETE /api/v1/posters/:posterId
 * Delete a poster and its Cloudinary storage asset.
 * Cannot delete a poster with status PROCESSING.
 *
 * Params: posterId
 * Response 200: { success, message }
 */
export const deletePoster = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const posterId = req.params['posterId']!;
    const ownerId  = req.user!._id.toString();

    await PosterService.deletePoster(posterId, ownerId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Poster deleted successfully.',
    });
  }
);

/**
 * PATCH /api/v1/posters/:posterId/favourite
 * Toggle the isFavourited flag on a poster.
 *
 * Params: posterId
 * Response 200: { success, message, data: { poster, isFavourited } }
 */
export const toggleFavourite = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const posterId = req.params['posterId']!;
    const ownerId  = req.user!._id.toString();

    const poster = await PosterService.toggleFavourite(posterId, ownerId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: poster.isFavourited ? 'Poster added to favourites.' : 'Poster removed from favourites.',
      data: { poster, isFavourited: poster.isFavourited },
    });
  }
);

/**
 * POST /api/v1/posters/:posterId/export
 * Export a completed poster in a specified format.
 * Records the export event for analytics.
 *
 * Params: posterId
 * Body: { format }
 * Response 200: { success, message, data: { downloadUrl, format } }
 */
export const exportPoster = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const posterId = req.params['posterId']!;
    const ownerId  = req.user!._id.toString();
    const { format } = req.body as { format: PosterFormat };

    const result = await PosterService.exportPoster(
      posterId,
      ownerId,
      format,
      resolveIp(req)
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Poster ready for download in ${format.toUpperCase()} format.`,
      data: result,
    });
  }
);

/**
 * POST /api/v1/posters/:posterId/save-edit
 * Save an edited SVG-rendered poster.
 *
 * Body: { svg, editState?, saveAsNew? }
 * saveAsNew=false overwrites the current poster asset and preserves version/history.
 * saveAsNew=true creates a new poster record at version 1 and leaves the original untouched.
 */
export const savePosterEdit = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const posterId = req.params['posterId']!;
    const ownerId = req.user!._id.toString();
    const { svg, editState, saveAsNew } = req.body as {
      svg: string;
      editState?: unknown;
      saveAsNew?: boolean;
    };

    const poster = await PosterService.savePosterEdit(posterId, ownerId, {
      svg,
      editState,
      saveAsNew,
    });

    res.status(saveAsNew ? StatusCodes.CREATED : StatusCodes.OK).json({
      success: true,
      message: saveAsNew ? 'Poster saved as a new poster.' : 'Poster changes saved.',
      data: { poster },
    });
  }
);

/**
 * GET /api/v1/posters/templates
 * Return all available poster templates, optionally filtered by style.
 * Used by the frontend template-picker UI.
 *
 * Query: style?
 * Response 200: { success, data: { templates[], styles[] } }
 */
export const getTemplates = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const style = req.query['style'] as PosterStyle | undefined;

    // Lazy import to avoid circular dependency issues
    const { getTemplates: fetchTemplates } = await import('../services/template.service')
    const templates = fetchTemplates(style);
    const styles = getAvailableStyles();

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        templates,
        styles,
        total: templates.length,
      },
    });
  }
);
