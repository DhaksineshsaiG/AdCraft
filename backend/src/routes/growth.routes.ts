import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as GrowthController from '../controllers/growth.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// ─── Rate Limiters ────────────────────────────────────────────────────────────

const analysisLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 analyses per minute per user/IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many growth analysis requests. Please wait before analyzing again.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
  skip: (req) => process.env['NODE_ENV'] === 'test' || req.ip === '127.0.0.1',
});

// ─── Protected Routes ─────────────────────────────────────────────────────────

router.use(protect);

/**
 * POST /api/v1/growth/analyze/:storeId
 * Analyzes a merchant's product catalog, detects top growth opportunity,
 * and proposes an AI-driven campaign strategy.
 */
router.post(
  '/analyze/:storeId',
  analysisLimiter,
  GrowthController.validateAnalyzeStore,
  GrowthController.analyzeStore
);

export default router;
