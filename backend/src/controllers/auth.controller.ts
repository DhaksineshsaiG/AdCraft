import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { StatusCodes } from 'http-status-codes';
import * as AuthService from '../services/auth.service';
import { asyncHandler, ValidationError } from '../middleware/errorMiddleware';
import { toSafeUser } from '../database/mappers';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Reads express-validator results and throws a ValidationError if any
 * field-level errors exist. Centralises validation handling so every
 * controller action stays free of boilerplate.
 */
function assertValid(req: Request): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      'Validation failed. Please check your input.',
      errors.array().map((e) => ({ field: e.type === 'field' ? e.path : e.type, message: e.msg }))
    );
  }
}

/**
 * Resolve the originating IP from the request.
 * Handles both direct connections and proxy-forwarded requests.
 */
function resolveIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
    req.ip ??
    'unknown'
  );
}

// ─── Register ─────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 * Public — creates a new user account and returns a token pair.
 *
 * Body: { name, email, password, confirmPassword }
 * Response 201: { success, message, data: { user, tokens } }
 */
export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  assertValid(req);

  const { name, email, password } = req.body as {
    name: string;
    email: string;
    password: string;
  };

  const result = await AuthService.register({ name, email, password }, resolveIp(req));

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: 'Account created successfully.',
    data: {
      user: result.user,
      tokens: {
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        accessTokenExpiresAt: result.tokens.accessTokenExpiresAt,
        refreshTokenExpiresAt: result.tokens.refreshTokenExpiresAt,
      },
    },
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/login
 * Public — authenticates credentials and returns a token pair.
 *
 * Body: { email, password }
 * Response 200: { success, message, data: { user, tokens } }
 */
export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  assertValid(req);

  const { email, password } = req.body as { email: string; password: string };

  const result = await AuthService.login({ email, password, ip: resolveIp(req) });

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Login successful.',
    data: {
      user: result.user,
      tokens: {
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        accessTokenExpiresAt: result.tokens.accessTokenExpiresAt,
        refreshTokenExpiresAt: result.tokens.refreshTokenExpiresAt,
      },
    },
  });
});

const FORGOT_PASSWORD_MESSAGE =
  'If an eligible account exists, password reset instructions have been sent.';

export const forgotPassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);
    const { email } = req.body as { email: string };
    try {
      await AuthService.forgotPassword(email);
    } catch {
      // The public response must not disclose account eligibility or provider failures.
      console.error('[AuthController] Password reset delivery failed.');
    }
    res.status(StatusCodes.OK).json({
      success: true,
      message: FORGOT_PASSWORD_MESSAGE,
    });
  }
);

export const resetPassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);
    const { token, password } = req.body as { token: string; password: string };
    await AuthService.resetPassword(token, password);
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
    });
  }
);

export const googleAuth = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  assertValid(req);

  const { credential } = req.body as { credential: string };
  const result = await AuthService.googleAuth(credential, resolveIp(req));

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Login successful.',
    data: {
      user: result.user,
      tokens: {
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        accessTokenExpiresAt: result.tokens.accessTokenExpiresAt,
        refreshTokenExpiresAt: result.tokens.refreshTokenExpiresAt,
      },
    },
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/logout
 * Protected — revokes the supplied refresh token for this device.
 * Pass ?all=true to revoke every active session (logout everywhere).
 *
 * Body: { refreshToken }
 * Response 200: { success, message }
 */
export const logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // req.user is guaranteed by the protect middleware applied in routes
  const userId = req.user!._id.toString();
  const logoutAll = req.query['all'] === 'true';

  if (logoutAll) {
    await AuthService.logoutAll(userId);
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Logged out from all devices successfully.',
    });
    return;
  }

  // Single-device logout — refresh token required in body
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Logged out successfully.',
    });
    return;
  }

  await AuthService.logout(userId, refreshToken);

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Logged out successfully.',
  });
});

// ─── Refresh Token ────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/refresh-token
 * Public — accepts a valid refresh token and returns a rotated token pair.
 * Implements refresh token rotation: the incoming token is revoked and a
 * brand-new pair is issued. Reuse of a rotated token invalidates all sessions.
 *
 * Body: { refreshToken }
 * Response 200: { success, message, data: { tokens } }
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  assertValid(req);

  const { refreshToken: incomingToken } = req.body as { refreshToken: string };

  const tokens = await AuthService.refreshTokens(incomingToken, resolveIp(req));

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Token refreshed successfully.',
    data: {
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      },
    },
  });
});

// ─── Change Password ──────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/change-password
 * Protected — updates the authenticated user's password.
 * All other active sessions are invalidated; a fresh token pair is returned
 * so the current session remains active without a forced re-login.
 *
 * Body: { currentPassword, newPassword, confirmNewPassword }
 * Response 200: { success, message, data: { tokens } }
 */
export const changePassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    assertValid(req);

    const userId = req.user!._id.toString();
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };

    const tokens = await AuthService.changePassword(
      userId,
      currentPassword,
      newPassword,
      resolveIp(req)
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Password changed successfully. All other sessions have been invalidated.',
      data: {
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          accessTokenExpiresAt: tokens.accessTokenExpiresAt,
          refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
        },
      },
    });
  }
);

// ─── Get Me ───────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/auth/me
 * Protected — returns the currently authenticated user's profile.
 * No service call needed — req.user is already populated by protect middleware.
 *
 * Response 200: { success, data: { user } }
 */
export const getMe = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      user: toSafeUser(req.user!),
    },
  });
});
