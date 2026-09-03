import { NextFunction, Request, Response } from 'express';
import { mapUser } from '../database/mappers';
import prisma from '../database/prisma';
import {
  ForbiddenError,
  UnauthorizedError,
  asyncHandler,
} from '../middleware/errorMiddleware';
import { IUserDocument, UserRole, UserStatus } from '../models/User';
import { JwtAccessPayload, verifyAccessToken } from '../services/auth.service';
import { isValidId } from '../utils/id';

declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
      tokenPayload?: JwtAccessPayload;
    }
  }
}

const userInclude = {
  oauthProviders: true,
  stores: { select: { id: true } },
} as const;

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim() || null;
}

async function loadUser(userId: string): Promise<IUserDocument | null> {
  if (!isValidId(userId)) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: userInclude,
  });
  return user ? mapUser(user) : null;
}

export const protect = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const token = extractBearerToken(req);
    if (!token) throw new UnauthorizedError('No authentication token provided.');

    const payload = verifyAccessToken(token);
    const user = await loadUser(payload.sub);
    if (!user) {
      throw new UnauthorizedError('The account belonging to this token no longer exists.');
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenError('Your account has been suspended. Please contact support.');
    }
    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenError('Your account is inactive.');
    }
    if (user.status === UserStatus.PENDING_VERIFICATION) {
      throw new ForbiddenError('Please verify your email address to continue.');
    }

    req.user = user;
    req.tokenPayload = payload;
    next();
  }
);

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new UnauthorizedError('Authentication required.');
    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Access denied. Required role(s): ${allowedRoles.join(', ')}.`
      );
    }
    next();
  };
}

export const optionalAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const token = extractBearerToken(req);
    if (!token) return next();
    try {
      const payload = verifyAccessToken(token);
      const user = await loadUser(payload.sub);
      if (user?.status === UserStatus.ACTIVE) {
        req.user = user;
        req.tokenPayload = payload;
      }
    } catch {
      // Optional authentication intentionally ignores invalid tokens.
    }
    next();
  }
);

export function requireOwnership(paramKey: string = 'userId') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new UnauthorizedError('Authentication required.');
    const resourceOwnerId = req.params[paramKey];
    if (!resourceOwnerId) {
      throw new ForbiddenError(`Route param "${paramKey}" not found for ownership check.`);
    }
    if (req.user._id !== resourceOwnerId && req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenError('You do not have permission to access this resource.');
    }
    next();
  };
}
