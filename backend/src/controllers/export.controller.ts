import { Request, Response } from 'express';
import { param, body, query, validationResult, ValidationChain } from 'express-validator';
import { StatusCodes } from 'http-status-codes';
import * as ExportService from '../services/export.service';
import { asyncHandler, ValidationError } from '../middleware/errorMiddleware';
import { PosterFormat } from '../models/Poster';

// ─── Enum Value Arrays ────────────────────────────────────────────────────────

const POSTER_FORMAT_VALUES = Object.values(PosterFormat);

// ─── Validation Chains ────────────────────────────────────────────────────────

export const validateExportSingle: ValidationChain[] = [
  param('posterId')
    .isUUID().withMessage('Invalid poster ID.'),

  body('format')
    .trim()
    .notEmpty().withMessage('format is required.')
    .isIn(POSTER_FORMAT_VALUES)
    .withMessage(`format must be one of: ${POSTER_FORMAT_VALUES.join(', ')}.`),

  body('expiresInSeconds')
    .optional()
    .isInt({ min: 300, max: 86400 })
    .withMessage('expiresInSeconds must be an integer between 300 (5 min) and 86400 (24 hr).')
    .toInt(),
];

export const validateExportBulk: ValidationChain[] = [
  body('posterIds')
    .isArray({ min: 1, max: 25 })
    .withMessage('posterIds must be an array of 1–25 poster IDs.')
    .custom((ids: unknown[]) => {
      if (!Array.isArray(ids)) return true;
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const invalid = ids.filter((id) => typeof id !== 'string' || !uuidPattern.test(id));
      if (invalid.length > 0) {
        throw new Error(`Invalid poster ID(s): ${invalid.join(', ')}.`);
      }
      return true;
    }),

  body('format')
    .trim()
    .notEmpty().withMessage('format is required.')
    .isIn(POSTER_FORMAT_VALUES)
    .withMessage(`format must be one of: ${POSTER_FORMAT_VALUES.join(', ')}.`),
];

export const validateHistoryQuery: ValidationChain[] = [
  query('posterId')
    .optional()
    .isUUID().withMessage('posterId must be a valid UUID.'),

  query('storeId')
    .optional()
    .isUUID().withMessage('storeId must be a valid UUID.'),

  query('format')
    .optional()
    .isIn(POSTER_FORMAT_VALUES)
    .withMessage(`format must be one of: ${POSTER_FORMAT_VALUES.join(', ')}.`),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page must be a positive integer.')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100.')
    .toInt(),

  query('fromDate')
    .optional()
    .isISO8601().withMessage('fromDate must be a valid ISO 8601 date string.')
    .toDate(),

  query('toDate')
    .optional()
    .isISO8601().withMessage('toDate must be a valid ISO 8601 date string.')
    .toDate()
    .custom((toDate, { req }) => {
      const fromDate = req.query?.['fromDate'];
      if (fromDate && toDate < new Date(fromDate as string)) {
        throw new Error('toDate must be on or after fromDate.');
      }
      return true;
    }),
];

export const validateAnalyticsQuery: ValidationChain[] = [
  query('storeId')
    .optional()
    .isUUID().withMessage('storeId must be a valid UUID.'),
];

export const validatePosterId: ValidationChain[] = [
  param('posterId')
    .isUUID().withMessage('Invalid poster ID.'),
];

export const validateExportId: ValidationChain[] = [
  param('exportId')
    .isUUID().withMessage('Invalid export ID.'),
];

export const validateArchiveId: ValidationChain[] = [
  param('archiveId')
    .isUUID().withMessage('Invalid archive ID.'),
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function assertValid(req: Request): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      'Validation failed. Please check your input.',
      errors.array().map((e) => ({
        field:   e.type === 'field' ? e.path : e.type,
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

function logExport(message: string, details: Record<string, unknown> = {}): void {
  console.info('[export]', message, details);
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/v1/export/:posterId
 * Export a single completed poster and receive a signed download URL.
 * The URL is valid for `expiresInSeconds` seconds (default 1 hour).
 * Each call increments the poster's totalDownloads counter.
 *
 * Params: posterId
 * Body:   { format, expiresInSeconds? }
 *
 * Response 200: { success, message, data: { ExportResult } }
 */
export const exportPoster = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const posterId = req.params['posterId']!;
    const ownerId  = req.user!._id.toString();
    const { format, expiresInSeconds } = req.body as {
      format:             PosterFormat;
      expiresInSeconds?:  number;
    };

    const result = await ExportService.exportPoster({
      posterId,
      ownerId,
      format,
      ip: resolveIp(req),
      expiresInSeconds,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Poster ready for download as ${format.toUpperCase()}.`,
      data:    result,
    });
  }
);

/**
 * GET /api/v1/export/:posterId/download
 * Convenience endpoint — generates a JPEG download URL for a poster
 * and immediately redirects the client to it.
 * Suitable for use as an <a href> target in the frontend.
 *
 * Params: posterId
 * Query:  format? (default: jpeg)
 *
 * Response 302: Redirect to signed download URL
 */
export const downloadPoster = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const posterId = req.params['posterId']!;
    const ownerId  = req.user!._id.toString();
    const format   = (req.query['format'] as PosterFormat | undefined) ?? PosterFormat.JPEG;

    if (!Object.values(PosterFormat).includes(format)) {
      throw new ValidationError(
        `Invalid format "${format}". Must be one of: ${POSTER_FORMAT_VALUES.join(', ')}.`
      );
    }

    const result = await ExportService.exportPoster({
      posterId,
      ownerId,
      format,
      ip: resolveIp(req),
    });

    await sendExportFile(res, await ExportService.getExportDownload(result.exportId, ownerId));
  }
);

/**
 * GET /api/v1/export/downloads/:exportId
 * Stream a previously-created export through the API with attachment headers.
 *
 * Params: exportId
 *
 * Response 200: binary file download
 */
export const downloadExportFile = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const ownerId = req.user!._id.toString();
    const exportId = req.params['exportId']!;
    await sendExportFile(res, await ExportService.getExportDownload(exportId, ownerId));
  }
);

/**
 * GET /api/v1/export/bulk-downloads/:archiveId
 * Stream an in-memory bulk export ZIP through the API with attachment headers.
 *
 * Params: archiveId
 *
 * Response 200: binary ZIP download
 */
export const downloadBulkArchive = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const ownerId = req.user!._id.toString();
    const archiveId = req.params['archiveId']!;
    await sendExportFile(res, ExportService.getBulkArchiveDownload(archiveId, ownerId));
  }
);

async function sendExportFile(
  res: Response,
  file: ExportService.ExportDownload
): Promise<void> {
  const encodedFilename = encodeURIComponent(file.filename)
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');

  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Length', file.bytes.toString());
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${file.filename.replace(/"/g, '\\"')}"; filename*=UTF-8''${encodedFilename}`
  );
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader(
    'Access-Control-Expose-Headers',
    'Content-Disposition, Content-Length, Content-Type, Cache-Control'
  );

  logExport('Streaming started', {
    filename: file.filename,
    contentType: file.contentType,
    bytes: file.bytes,
  });
  logExport('Headers sent', {
    contentType: file.contentType,
    contentLength: file.bytes,
    contentDisposition: res.getHeader('Content-Disposition'),
    cacheControl: res.getHeader('Cache-Control'),
    exposedHeaders: res.getHeader('Access-Control-Expose-Headers'),
  });

  res.once('finish', () => {
    logExport('Streaming finished', {
      filename: file.filename,
      bytes: file.bytes,
      headersSent: res.headersSent,
      statusCode: res.statusCode,
    });
  });

  res.status(StatusCodes.OK).send(file.data);
}

/**
 * POST /api/v1/export/bulk
 * Export multiple posters in the same format.
 * Processes up to 25 posters per request. Individual failures do not
 * abort the batch — each result includes a downloadUrl or an error message.
 *
 * Body: { posterIds: string[], format }
 *
 * Response 200: { success, message, data: { BulkExportResult } }
 */
export const exportBulk = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const ownerId             = req.user!._id.toString();
    const { posterIds, format } = req.body as {
      posterIds: string[];
      format:    PosterFormat;
    };

    const result = await ExportService.exportBulk({
      posterIds,
      ownerId,
      format,
      ip: resolveIp(req),
    });

    const hasFailures = result.failed > 0;

    res.status(StatusCodes.OK).json({
      success: true,
      message: hasFailures
        ? `Bulk export completed with ${result.failed} failure(s). ${result.succeeded} poster(s) exported.`
        : `${result.succeeded} poster(s) exported successfully.`,
      data: result,
    });
  }
);

/**
 * GET /api/v1/export/history
 * Paginated export history for the authenticated user.
 * Each record represents a single download event across all their posters.
 *
 * Query: posterId?, storeId?, format?, page?, limit?, fromDate?, toDate?
 *
 * Response 200: { success, data: { records[], pagination } }
 */
export const getHistory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const ownerId = req.user!._id.toString();
    const q       = req.query as Record<string, string>;

    const result = await ExportService.getExportHistory({
      ownerId,
      posterId:  q['posterId'],
      storeId:   q['storeId'],
      format:    q['format'] as PosterFormat | undefined,
      page:      q['page']      ? parseInt(q['page'],  10) : undefined,
      limit:     q['limit']     ? parseInt(q['limit'], 10) : undefined,
      fromDate:  q['fromDate']  ? new Date(q['fromDate'])  : undefined,
      toDate:    q['toDate']    ? new Date(q['toDate'])    : undefined,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      data:    result,
    });
  }
);

/**
 * GET /api/v1/export/analytics
 * Download and export statistics for the authenticated user.
 * Includes format breakdown, top posters, and rolling window counts.
 *
 * Query: storeId?
 *
 * Response 200: { success, data: { analytics } }
 */
export const getAnalytics = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const ownerId = req.user!._id.toString();
    const storeId = req.query['storeId'] as string | undefined;

    const analytics = await ExportService.getExportAnalytics(ownerId, storeId);

    res.status(StatusCodes.OK).json({
      success: true,
      data:    { analytics },
    });
  }
);
