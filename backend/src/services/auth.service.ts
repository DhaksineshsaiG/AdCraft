import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import {
  AuthProvider as PrismaAuthProvider,
  Prisma,
  UserStatus as PrismaUserStatus,
} from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';
import { mapUser, toSafeUser } from '../database/mappers';
import prisma from '../database/prisma';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../middleware/errorMiddleware';
import { IUserDocument, SafeUser, UserStatus } from '../models/User';
import { isValidId } from '../utils/id';
import { sendPasswordResetEmail } from './email.service';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  ip: string;
}

const INVALID_RESET_TOKEN_MESSAGE =
  'This password reset link is invalid or has expired. Please request a new one.';

function hashPasswordResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

export interface AuthResult {
  user: SafeUser;
  tokens: TokenPair;
}

export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: string;
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;
  jti: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

const userInclude = {
  refreshTokens: true,
  oauthProviders: true,
  stores: { select: { id: true } },
} as const;

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

function parseDuration(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) throw new Error(`[AuthService] Invalid duration string: "${duration}"`);
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return parseInt(match[1]!, 10) * multipliers[match[2]!]!;
}

function generateAccessToken(user: IUserDocument): { token: string; expiresAt: Date } {
  const payload: Omit<JwtAccessPayload, 'iat' | 'exp'> = {
    sub: user._id,
    email: user.email,
    role: user.role,
    type: 'access',
  };
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: 'ai-poster-generator',
    audience: 'ai-poster-generator-client',
  };
  return {
    token: jwt.sign(payload, env.JWT_SECRET, options),
    expiresAt: new Date(Date.now() + parseDuration(env.JWT_EXPIRES_IN)),
  };
}

function generateRefreshToken(userId: string): {
  token: string;
  expiresAt: Date;
} {
  const jti = crypto.randomBytes(32).toString('hex');
  const payload: Omit<JwtRefreshPayload, 'iat' | 'exp' | 'jti'> = {
    sub: userId,
    type: 'refresh',
  };
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: 'ai-poster-generator',
    jwtid: jti,
  };
  return {
    token: jwt.sign(payload, env.JWT_REFRESH_SECRET, options),
    expiresAt: new Date(Date.now() + parseDuration(env.JWT_REFRESH_EXPIRES_IN)),
  };
}

async function buildTokenPair(user: IUserDocument, ip: string): Promise<TokenPair> {
  const access = generateAccessToken(user);
  const refresh = generateRefreshToken(user._id);
  const now = new Date();

  await prisma.$transaction([
    prisma.refreshToken.deleteMany({
      where: {
        userId: user._id,
        OR: [{ expiresAt: { lte: now } }, { isRevoked: true }],
      },
    }),
    prisma.refreshToken.create({
      data: {
        token: refresh.token,
        expiresAt: refresh.expiresAt,
        createdByIp: ip,
        userId: user._id,
      },
    }),
  ]);

  return {
    accessToken: access.token,
    refreshToken: refresh.token,
    accessTokenExpiresAt: access.expiresAt,
    refreshTokenExpiresAt: refresh.expiresAt,
  };
}

export async function register(payload: RegisterPayload, ip: string): Promise<AuthResult> {
  const email = payload.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError('An account with this email address already exists.');
  }

  const password = await bcrypt.hash(payload.password, 12);
  const record = await prisma.user.create({
    data: {
      name: payload.name.trim(),
      email,
      password,
      status: PrismaUserStatus.active,
    },
    include: userInclude,
  });
  const user = mapUser(record);
  return { user: toSafeUser(user), tokens: await buildTokenPair(user, ip) };
}

export async function login(payload: LoginPayload): Promise<AuthResult> {
  const record = await prisma.user.findUnique({
    where: { email: payload.email.toLowerCase().trim() },
    include: userInclude,
  });
  if (!record || !record.password) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  if (record.status === PrismaUserStatus.suspended) {
    throw new ForbiddenError('Your account has been suspended. Please contact support.');
  }
  if (record.status === PrismaUserStatus.inactive) {
    throw new ForbiddenError('Your account is inactive. Please contact support.');
  }
  if (record.status === PrismaUserStatus.pending_verification) {
    throw new ForbiddenError('Please verify your email address before logging in.');
  }
  if (!(await bcrypt.compare(payload.password, record.password))) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  const updated = await prisma.user.update({
    where: { id: record.id },
    data: {
      lastLoginAt: new Date(),
      lastLoginIp: payload.ip,
      loginCount: { increment: 1 },
    },
    include: userInclude,
  });
  const user = mapUser(updated);
  return { user: toSafeUser(user), tokens: await buildTokenPair(user, payload.ip) };
}

export async function forgotPassword(emailInput: string): Promise<void> {
  const record = await prisma.user.findUnique({
    where: { email: emailInput.toLowerCase().trim() },
    select: { id: true, email: true, name: true, password: true, status: true },
  });
  if (!record || !record.password || record.status !== PrismaUserStatus.active) return;

  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = new Date(
    Date.now() + env.PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000
  );

  await prisma.user.update({
    where: { id: record.id },
    data: {
      passwordResetToken: tokenHash,
      passwordResetTokenExpiresAt: expiresAt,
    },
  });

  const resetUrl =
    `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;
  await sendPasswordResetEmail({
    email: record.email,
    name: record.name,
    resetUrl,
    expiresInMinutes: env.PASSWORD_RESET_TOKEN_TTL_MINUTES,
  });
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = hashPasswordResetToken(rawToken);
  const lookupTime = new Date();
  const record = await prisma.user.findFirst({
    where: {
      passwordResetToken: tokenHash,
      passwordResetTokenExpiresAt: { gt: lookupTime },
      password: { not: null },
      status: PrismaUserStatus.active,
    },
    select: { id: true },
  });
  if (!record) throw new UnauthorizedError(INVALID_RESET_TOKEN_MESSAGE);

  const password = await bcrypt.hash(newPassword, 12);
  const consumedAt = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const consumed = await tx.user.updateMany({
      where: {
        id: record.id,
        passwordResetToken: tokenHash,
        passwordResetTokenExpiresAt: { gt: consumedAt },
        password: { not: null },
        status: PrismaUserStatus.active,
      },
      data: {
        password,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null,
      },
    });
    if (consumed.count !== 1) return false;

    await tx.refreshToken.updateMany({
      where: { userId: record.id, isRevoked: false },
      data: { isRevoked: true, revokedAt: consumedAt },
    });
    return true;
  });

  if (!result) throw new UnauthorizedError(INVALID_RESET_TOKEN_MESSAGE);
}

async function loadGoogleUser(providerId: string): Promise<IUserDocument | null> {
  const provider = await prisma.oAuthProviderAccount.findUnique({
    where: {
      provider_providerId: {
        provider: PrismaAuthProvider.google,
        providerId,
      },
    },
    select: { userId: true },
  });
  if (!provider) return null;

  const record = await prisma.user.findUnique({
    where: { id: provider.userId },
    include: userInclude,
  });
  return record ? mapUser(record) : null;
}

async function completeGoogleLogin(user: IUserDocument, ip: string): Promise<AuthResult> {
  assertActiveStatus(user.status);

  const updated = await prisma.user.update({
    where: { id: user._id },
    data: {
      lastLoginAt: new Date(),
      lastLoginIp: ip,
      loginCount: { increment: 1 },
    },
    include: userInclude,
  });
  const mapped = mapUser(updated);
  return { user: toSafeUser(mapped), tokens: await buildTokenPair(mapped, ip) };
}

export async function googleAuth(credential: string, ip: string): Promise<AuthResult> {
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    throw new UnauthorizedError('Invalid Google credential.');
  }

  if (!payload?.sub) {
    throw new UnauthorizedError('Google credential does not contain a subject identifier.');
  }
  if (!payload.email) {
    throw new UnauthorizedError('Google account does not provide an email address.');
  }
  if (payload.email_verified !== true) {
    throw new UnauthorizedError('Google account email is not verified.');
  }

  const providerId = payload.sub;
  const email = payload.email.toLowerCase().trim();

  const linkedUser = await loadGoogleUser(providerId);
  if (linkedUser) return completeGoogleLogin(linkedUser, ip);

  let userId: string;
  try {
    userId = await prisma.$transaction(async (tx) => {
      const identity = await tx.oAuthProviderAccount.findUnique({
        where: {
          provider_providerId: {
            provider: PrismaAuthProvider.google,
            providerId,
          },
        },
        select: { userId: true },
      });
      if (identity) return identity.userId;

      const existingUser = await tx.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existingUser) {
        throw new ConflictError(
          'An account with this email already exists. Sign in with your password first; Google account linking will be available from authenticated settings.'
        );
      }

      const user = await tx.user.create({
        data: {
          name: (payload.name?.trim() || 'Google User').slice(0, 100),
          email,
          password: null,
          avatarUrl: payload.picture,
          status: PrismaUserStatus.active,
          isEmailVerified: true,
        },
        select: { id: true },
      });

      await tx.oAuthProviderAccount.create({
        data: {
          provider: PrismaAuthProvider.google,
          providerId,
          userId: user.id,
        },
      });
      return user.id;
    });
  } catch (error) {
    if (error instanceof ConflictError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const racedIdentity = await loadGoogleUser(providerId);
      if (racedIdentity) return completeGoogleLogin(racedIdentity, ip);
      throw new ConflictError(
        'An account with this email already exists. Sign in with your password first; Google account linking will be available from authenticated settings.'
      );
    }
    throw error;
  }

  const record = await prisma.user.findUnique({
    where: { id: userId },
    include: userInclude,
  });
  if (!record) throw new UnauthorizedError('Google account could not be loaded.');
  return completeGoogleLogin(mapUser(record), ip);
}

export async function logout(userId: string, refreshToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, token: refreshToken, isRevoked: false },
    data: { isRevoked: true, revokedAt: new Date() },
  });
}

export async function logoutAll(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true, revokedAt: new Date() },
  });
}

export async function refreshTokens(incomingRefreshToken: string, ip: string): Promise<TokenPair> {
  let decoded: JwtRefreshPayload;
  try {
    decoded = jwt.verify(incomingRefreshToken, env.JWT_REFRESH_SECRET, {
      issuer: 'ai-poster-generator',
    }) as JwtRefreshPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token.');
  }
  if (decoded.type !== 'refresh') throw new UnauthorizedError('Token type mismatch.');
  if (!isValidId(decoded.sub)) {
    throw new UnauthorizedError('Invalid or expired refresh token.');
  }

  const record = await prisma.user.findUnique({
    where: { id: decoded.sub },
    include: userInclude,
  });
  if (!record) throw new UnauthorizedError('User not found.');
  if (record.status !== PrismaUserStatus.active) {
    throw new ForbiddenError('Account is not active.');
  }

  const storedToken = record.refreshTokens.find(
    (token) => token.token === incomingRefreshToken
  );
  if (!storedToken || storedToken.isRevoked) {
    await logoutAll(record.id);
    throw new UnauthorizedError(
      storedToken
        ? 'Refresh token has been revoked. All sessions have been invalidated.'
        : 'Refresh token reuse detected. All sessions have been invalidated.'
    );
  }
  if (storedToken.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token has expired. Please log in again.');
  }

  await logout(record.id, incomingRefreshToken);
  return buildTokenPair(mapUser(record), ip);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  ip: string
): Promise<TokenPair> {
  const record = await prisma.user.findUnique({
    where: { id: userId },
    include: userInclude,
  });
  if (!record || !record.password) throw new NotFoundError('User');
  if (!(await bcrypt.compare(currentPassword, record.password))) {
    throw new ValidationError('Current password is incorrect.');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { password: await bcrypt.hash(newPassword, 12) },
    include: userInclude,
  });
  await logoutAll(userId);
  return buildTokenPair(mapUser(updated), ip);
}

export function verifyAccessToken(token: string): JwtAccessPayload {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'ai-poster-generator',
      audience: 'ai-poster-generator-client',
    }) as JwtAccessPayload;
    if (payload.type !== 'access') throw new UnauthorizedError('Token type mismatch.');
    return payload;
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    throw new UnauthorizedError('Invalid or expired access token.');
  }
}

export function assertActiveStatus(status: UserStatus): void {
  if (status !== UserStatus.ACTIVE) {
    throw new ForbiddenError('Account is not active.');
  }
}
