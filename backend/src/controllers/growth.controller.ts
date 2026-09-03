import { Request, Response } from 'express';
import { param, validationResult, ValidationChain } from 'express-validator';
import { StatusCodes } from 'http-status-codes';
import GrowthAgent from '../agent/GrowthAgent';
import { asyncHandler, ValidationError } from '../middleware/errorMiddleware';

const growthAgent = new GrowthAgent();

// ─── Validation Chains ────────────────────────────────────────────────────────

export const validateAnalyzeStore: ValidationChain[] = [
  param('storeId')
    .trim()
    .notEmpty().withMessage('Store ID is required.')
    .isUUID().withMessage('Invalid store ID format. Must be a valid UUID.'),
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assertValid(req: Request): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      'Validation failed. Please check your input parameters.',
      errors.array().map((e) => ({
        field: e.type === 'field' ? e.path : e.type,
        message: e.msg,
      }))
    );
  }
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/v1/growth/analyze/:storeId
 * Authenticated — analyzes a merchant store's product catalog and returns
 * structured growth opportunities and an AI-driven campaign strategy.
 */
export const analyzeStore = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const storeId = req.params['storeId']!;
    const requestingUserId = req.user!._id.toString();

    const analysis = await growthAgent.analyzeStore(storeId, requestingUserId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Store growth analysis completed successfully.',
      data: analysis,
    });
  }
);
