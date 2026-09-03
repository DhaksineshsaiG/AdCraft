import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import * as AuthController from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';
import {
  validateRegister,
  validateLogin,
  validateGoogleAuth,
  validateRefreshToken,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword,
} from '../validations/auth.validation'
// ─── Router ───────────────────────────────────────────────────────────────────

const router = Router();

// ─── Auth-specific Rate Limiters ──────────────────────────────────────────────
// Tighter limits than the global limiter in app.ts.
// Applied per-endpoint rather than to the whole auth namespace so that
// /me and /logout are never throttled for legitimate authenticated users.

/**
 * Strict limiter for credential submission endpoints (register, login).
 * 10 attempts per IP per 15 minutes — brute-force / credential-stuffing protection.
 */
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many attempts from this IP. Please try again in 15 minutes.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
  skip: (req) => process.env['NODE_ENV'] === 'test' || req.ip === '127.0.0.1',
});

/**
 * Moderate limiter for token rotation.
 * 30 requests per IP per 15 minutes — prevents automated token farming.
 */
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many token refresh attempts. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
  skip: (req) => process.env['NODE_ENV'] === 'test' || req.ip === '127.0.0.1',
});

function passwordResetLimiter(max: number, message: string) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { message, code: 'RATE_LIMIT_EXCEEDED', statusCode: 429 },
    },
    skip: (req) => process.env['NODE_ENV'] === 'test' || req.ip === '127.0.0.1',
  });
}

const forgotPasswordLimiter = passwordResetLimiter(
  5,
  'Too many password reset requests. Please try again in 15 minutes.'
);
const resetPasswordLimiter = passwordResetLimiter(
  10,
  'Too many password reset attempts. Please try again in 15 minutes.'
);

// ─── Public Routes ────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 * Create a new user account.
 * Rate limited — validation — handler.
 */
router.post(
  '/register',
  credentialLimiter,
  validateRegister,
  AuthController.register
);

/**
 * POST /api/v1/auth/login
 * Authenticate with email + password.
 * Rate limited — validation — handler.
 */
router.post(
  '/login',
  credentialLimiter,
  validateLogin,
  AuthController.login
);

router.post(
  '/google',
  credentialLimiter,
  validateGoogleAuth,
  AuthController.googleAuth
);

/**
 * POST /api/v1/auth/refresh-token
 * Rotate a refresh token and receive a new token pair.
 * Rate limited — validation — handler.
 */
router.post(
  '/refresh-token',
  refreshLimiter,
  validateRefreshToken,
  AuthController.refreshToken
);

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validateForgotPassword,
  AuthController.forgotPassword
);

router.post(
  '/reset-password',
  resetPasswordLimiter,
  validateResetPassword,
  AuthController.resetPassword
);

// ─── Protected Routes ─────────────────────────────────────────────────────────
// All routes below require a valid JWT access token via the protect middleware.

/**
 * GET /api/v1/auth/me
 * Return the currently authenticated user's profile.
 */
router.get(
  '/me',
  protect,
  AuthController.getMe
);

/**
 * POST /api/v1/auth/logout
 * Revoke the current device's refresh token.
 * Add ?all=true to revoke every active session.
 *
 * Body (single-device): { refreshToken }
 * Query (all devices):  ?all=true
 */
router.post(
  '/logout',
  protect,
  AuthController.logout
);

/**
 * POST /api/v1/auth/change-password
 * Change the authenticated user's password.
 * Invalidates all other active sessions on success.
 *
 * Body: { currentPassword, newPassword, confirmNewPassword }
 */
router.post(
  '/change-password',
  protect,
  validateChangePassword,
  AuthController.changePassword
);

// ─── Export ───────────────────────────────────────────────────────────────────

export default router;
