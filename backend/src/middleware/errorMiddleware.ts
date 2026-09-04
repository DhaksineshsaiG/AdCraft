import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Prisma } from '@prisma/client';
import { env } from '../config/env';

// â”€â”€â”€ Custom Error Classes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
    code?: string,
    details?: unknown,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    // Restore the prototype chain (required when extending built-ins in TS)
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, StatusCodes.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found.`, StatusCodes.NOT_FOUND, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required.') {
    super(message, StatusCodes.UNAUTHORIZED, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action.') {
    super(message, StatusCodes.FORBIDDEN, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, StatusCodes.CONFLICT, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests. Please try again later.') {
    super(message, StatusCodes.TOO_MANY_REQUESTS, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(
      `External service error [${service}]: ${message}`,
      StatusCodes.BAD_GATEWAY,
      'EXTERNAL_SERVICE_ERROR',
      { service }
    );
    this.name = 'ExternalServiceError';
  }
}

// â”€â”€â”€ Serialized Error Shape â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    details?: unknown;
    stack?: string;
  };
  requestId?: string;
  timestamp: string;
}

// â”€â”€â”€ Prisma / JWT Error Normalizers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function normalizePrismaError(err: unknown): AppError | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.['target'])
        ? (err.meta?.['target'] as string[]).join(', ')
        : 'field';
      return new ConflictError(`A record with this ${target} already exists.`);
    }
    if (err.code === 'P2025') return new NotFoundError('Resource');
    if (err.code === 'P2003') {
      return new ValidationError('The requested relation is invalid.');
    }
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    return new ValidationError('Database query validation failed.');
  }
  return null;
}

function normalizeJWTError(err: Record<string, unknown>): AppError | null {
  if (err['name'] === 'TokenExpiredError') {
    return new UnauthorizedError('Your session has expired. Please log in again.');
  }
  if (err['name'] === 'JsonWebTokenError') {
    return new UnauthorizedError('Invalid authentication token.');
  }
  if (err['name'] === 'NotBeforeError') {
    return new UnauthorizedError('Token not yet active.');
  }
  return null;
}

// â”€â”€â”€ Error Logger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function logError(err: Error, req: Request): void {
  const isProd = env.NODE_ENV === 'production';

  const meta = {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
  };

  if (err instanceof AppError && err.isOperational) {
    // Operational errors: expected, log as warning
    console.warn('[ErrorMiddleware] Operational error:', {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      ...meta,
    });
  } else {
    // Programmer errors: unexpected, log with full stack
    console.error('[ErrorMiddleware] Unexpected error:', {
      message: err.message,
      stack: isProd ? undefined : err.stack,
      ...meta,
    });
  }
}

// â”€â”€â”€ Global Error Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const raw = err as unknown as Record<string, unknown>;
  const isProd = env.NODE_ENV === 'production';

  // Always log the actual raw error with stack to server logs for debugging
  console.error('[ErrorMiddleware] Uncaught exception in request:', {
    message: err.message,
    name: err.name,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  const isCustomError =
    err instanceof AppError ||
    (err && typeof (err as any).statusCode === 'number');

  // Attempt to normalize known third-party errors into AppErrors
  let normalizedError: AppError =
    normalizePrismaError(err) ??
    normalizeJWTError(raw) ??
    (isCustomError
      ? (err as AppError)
      : new AppError(
          isProd ? 'An unexpected error occurred.' : err.message,
          StatusCodes.INTERNAL_SERVER_ERROR,
          'INTERNAL_SERVER_ERROR',
          undefined,
          false
        ));

  logError(normalizedError, req);

  const requestId = req.headers['x-request-id'] as string | undefined;

  const response: ErrorResponse = {
    success: false,
    error: {
      message: normalizedError.message,
      code: normalizedError.code,
      statusCode: normalizedError.statusCode,
      details: normalizedError.details,
      ...((!isProd || env.NODE_ENV === 'development') && { stack: normalizedError.stack }),
    },
    ...(requestId && { requestId }),
    timestamp: new Date().toISOString(),
  };

  res.status(normalizedError.statusCode).json(response);
}

// â”€â”€â”€ 404 Not Found Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl}`));
}

// â”€â”€â”€ Async Handler Wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Wraps async route handlers so unhandled promise rejections
// are forwarded to the Express error handler automatically.

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
