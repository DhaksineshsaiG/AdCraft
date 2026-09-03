import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import * as ExportController from '../controllers/export.controller';
import { protect } from '../middleware/auth.middleware';
// â”€â”€â”€ Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const router = Router();

// â”€â”€â”€ Rate Limiters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Download limiter â€” each export call generates a signed Cloudinary URL
 * and writes to the database. 60 per minute supports interactive bulk
 * downloads while preventing automated harvesting.
 */
const downloadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many download requests. Please wait before exporting again.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
  skip: (req) => process.env['NODE_ENV'] === 'test' || req.ip === '127.0.0.1',
});

/**
 * Bulk export limiter â€” stricter than single-download because each request
 * can trigger up to 25 Cloudinary calls and 25 DB writes.
 * 10 per minute is generous for any real interactive use pattern.
 */
const bulkLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many bulk export requests. Please wait before exporting again.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
  skip: (req) => process.env['NODE_ENV'] === 'test' || req.ip === '127.0.0.1',
});

/**
 * Analytics limiter â€” runs multi-stage PostgreSQL aggregations.
 * 30 per minute prevents DB pressure from dashboard polling.
 */
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
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
// CRITICAL ORDER: Declared BEFORE /:posterId param routes.
// Express matches routes in registration order â€” "history", "analytics", and
// "bulk" would otherwise be captured as PostgreSQL UUID params, triggering
// a 422 validation error on the /:posterId handler.

/**
 * GET /api/v1/export/history
 * Paginated export event history for the authenticated user.
 * Each record is a single download event linked to a poster.
 *
 * Query: posterId?, storeId?, format?, page?, limit?, fromDate?, toDate?
 */
router.get(
  '/history',
  ExportController.validateHistoryQuery,
  ExportController.getHistory
);

/**
 * GET /api/v1/export/analytics
 * Download and export statistics for the authenticated user.
 * Covers format breakdown, top posters, and rolling 7/30-day counts.
 *
 * Query: storeId?
 */
router.get(
  '/analytics',
  analyticsLimiter,
  ExportController.validateAnalyticsQuery,
  ExportController.getAnalytics
);

/**
 * POST /api/v1/export/bulk
 * Export multiple posters in a single request.
 * Accepts up to 25 poster IDs. Each poster is processed independently.
 * Returns a per-poster result list alongside a success/failure summary.
 *
 * Body: { posterIds: string[], format }
 */
router.post(
  '/bulk',
  bulkLimiter,
  ExportController.validateExportBulk,
  ExportController.exportBulk
);

/**
 * GET /api/v1/export/downloads/:exportId
 * Download an already-created export through the API.
 * Streams bytes with Content-Disposition attachment headers.
 */
router.get(
  '/downloads/:exportId',
  downloadLimiter,
  ExportController.validateExportId,
  ExportController.downloadExportFile
);

/**
 * GET /api/v1/export/bulk-downloads/:archiveId
 * Download a just-created in-memory bulk export ZIP through the API.
 * Streams bytes with Content-Disposition attachment headers.
 */
router.get(
  '/bulk-downloads/:archiveId',
  downloadLimiter,
  ExportController.validateArchiveId,
  ExportController.downloadBulkArchive
);

// â”€â”€â”€ Poster instance routes (:posterId) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * GET /api/v1/export/:posterId/download
 * Redirect the client directly to a signed JPEG download URL.
 * Suitable for use as an anchor href (<a href="/api/v1/export/:id/download">).
 * Increments totalDownloads and records the export event.
 *
 * Query: format? (default: jpeg)
 */
router.get(
  '/:posterId/download',
  downloadLimiter,
  ExportController.validatePosterId,
  ExportController.downloadPoster
);

/**
 * POST /api/v1/export/:posterId
 * Export a single poster and receive a signed download URL in the response body.
 * Prefer this over the GET /download endpoint when the client needs to handle
 * the URL programmatically (e.g. show a "Your download is ready" UI).
 *
 * Body: { format, expiresInSeconds? }
 */
router.post(
  '/:posterId',
  downloadLimiter,
  ExportController.validateExportSingle,
  ExportController.exportPoster
);

// â”€â”€â”€ Export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default router;
