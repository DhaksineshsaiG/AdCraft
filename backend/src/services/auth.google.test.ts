import { UserStatus } from '../models/User';

const mockVerifyIdToken = jest.fn();
const mockOAuthFindUnique = jest.fn();
const mockUserFindUnique = jest.fn();
const mockUserUpdate = jest.fn();
const mockRefreshDeleteMany = jest.fn();
const mockRefreshCreate = jest.fn();
const mockTxOAuthFindUnique = jest.fn();
const mockTxOAuthCreate = jest.fn();
const mockTxUserFindUnique = jest.fn();
const mockTxUserCreate = jest.fn();

const mockPrisma = {
  oAuthProviderAccount: {
    findUnique: mockOAuthFindUnique,
  },
  user: {
    findUnique: mockUserFindUnique,
    update: mockUserUpdate,
  },
  refreshToken: {
    deleteMany: mockRefreshDeleteMany,
    create: mockRefreshCreate,
  },
  $transaction: jest.fn(async (input: unknown) => {
    if (typeof input === 'function') {
      return input({
        oAuthProviderAccount: {
          findUnique: mockTxOAuthFindUnique,
          create: mockTxOAuthCreate,
        },
        user: {
          findUnique: mockTxUserFindUnique,
          create: mockTxUserCreate,
        },
      });
    }
    return Promise.all(input as Promise<unknown>[]);
  }),
};

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

jest.mock('../database/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

jest.mock('../database/mappers', () => ({
  mapUser: (record: Record<string, unknown>) => ({
    _id: record.id,
    id: record.id,
    name: record.name,
    email: record.email,
    password: record.password,
    role: record.role,
    status: record.status,
    avatarUrl: record.avatarUrl,
    isEmailVerified: record.isEmailVerified,
    refreshTokens: record.refreshTokens ?? [],
    oauthProviders: record.oauthProviders ?? [],
    notificationPreferences: {
      emailOnPosterGenerated: true,
      emailOnExportReady: true,
      emailOnStoreConnected: true,
      emailMarketing: false,
    },
    loginCount: record.loginCount ?? 0,
    stores: [],
    createdAt: record.createdAt ?? new Date(),
    updatedAt: record.updatedAt ?? new Date(),
  }),
  toSafeUser: (user: Record<string, unknown>) => user,
}));

import { googleAuth } from './auth.service';

function googlePayload(overrides: Record<string, unknown> = {}) {
  return {
    sub: 'google-subject-1',
    email: 'Person@Example.com',
    email_verified: true,
    name: 'Google Person',
    picture: 'https://example.com/avatar.png',
    ...overrides,
  };
}

function userRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: '4af35c85-6d2c-421a-9850-b80f68e21f05',
    name: 'Google Person',
    email: 'person@example.com',
    password: null,
    role: 'owner',
    status: 'active',
    avatarUrl: 'https://example.com/avatar.png',
    isEmailVerified: true,
    loginCount: 0,
    refreshTokens: [],
    oauthProviders: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function verified(payload: Record<string, unknown> | undefined) {
  mockVerifyIdToken.mockResolvedValue({
    getPayload: () => payload,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRefreshDeleteMany.mockResolvedValue({ count: 0 });
  mockRefreshCreate.mockResolvedValue({});
  mockUserUpdate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    ...userRecord(),
    lastLoginAt: data.lastLoginAt,
    lastLoginIp: data.lastLoginIp,
    loginCount: 1,
  }));
});

test('creates a new Google user and provider identity transactionally', async () => {
  verified(googlePayload());
  mockOAuthFindUnique.mockResolvedValue(null);
  mockTxOAuthFindUnique.mockResolvedValue(null);
  mockTxUserFindUnique.mockResolvedValue(null);
  mockTxUserCreate.mockResolvedValue({ id: userRecord().id });
  mockTxOAuthCreate.mockResolvedValue({});
  mockUserFindUnique.mockResolvedValue(userRecord());

  const result = await googleAuth('valid-google-id-token', '127.0.0.1');

  expect(mockVerifyIdToken).toHaveBeenCalledWith({
    idToken: 'valid-google-id-token',
    audience: 'test-client.apps.googleusercontent.com',
  });
  expect(mockTxUserCreate).toHaveBeenCalledWith({
    data: expect.objectContaining({
      email: 'person@example.com',
      password: null,
      status: 'active',
      isEmailVerified: true,
    }),
    select: { id: true },
  });
  expect(mockTxOAuthCreate).toHaveBeenCalledWith({
    data: {
      provider: 'google',
      providerId: 'google-subject-1',
      userId: userRecord().id,
    },
  });
  expect(result.tokens.accessToken).toEqual(expect.any(String));
  expect(result.tokens.refreshToken).toEqual(expect.any(String));
});

test('logs in a returning Google user without creating another identity', async () => {
  verified(googlePayload());
  mockOAuthFindUnique.mockResolvedValue({ userId: userRecord().id });
  mockUserFindUnique.mockResolvedValue(userRecord());

  await googleAuth('valid-google-id-token', '127.0.0.1');

  expect(mockTxUserCreate).not.toHaveBeenCalled();
  expect(mockTxOAuthCreate).not.toHaveBeenCalled();
  expect(mockUserUpdate).toHaveBeenCalled();
});

test('rejects an invalid Google credential', async () => {
  mockVerifyIdToken.mockRejectedValue(new Error('invalid token'));

  await expect(googleAuth('invalid', '127.0.0.1')).rejects.toMatchObject({
    message: 'Invalid Google credential.',
  });
});

test('passes the configured audience and rejects a wrong-audience token', async () => {
  mockVerifyIdToken.mockImplementation(async ({ audience }: { audience: string }) => {
    expect(audience).toBe('test-client.apps.googleusercontent.com');
    throw new Error('Wrong recipient, payload audience != requiredAudience');
  });

  await expect(googleAuth('wrong-audience', '127.0.0.1')).rejects.toMatchObject({
    message: 'Invalid Google credential.',
  });
});

test('rejects a verified payload with no email', async () => {
  verified(googlePayload({ email: undefined }));

  await expect(googleAuth('no-email', '127.0.0.1')).rejects.toMatchObject({
    message: 'Google account does not provide an email address.',
  });
});

test('rejects an unverified Google email', async () => {
  verified(googlePayload({ email_verified: false }));

  await expect(googleAuth('unverified-email', '127.0.0.1')).rejects.toMatchObject({
    message: 'Google account email is not verified.',
  });
});

test('returns a conflict when the verified email belongs to a local account', async () => {
  verified(googlePayload());
  mockOAuthFindUnique.mockResolvedValue(null);
  mockTxOAuthFindUnique.mockResolvedValue(null);
  mockTxUserFindUnique.mockResolvedValue({ id: userRecord().id });

  await expect(googleAuth('local-conflict', '127.0.0.1')).rejects.toMatchObject({
    statusCode: 409,
    message: expect.stringContaining('Sign in with your password first'),
  });
  expect(mockTxUserCreate).not.toHaveBeenCalled();
});

test.each([
  [UserStatus.SUSPENDED],
  [UserStatus.INACTIVE],
  [UserStatus.PENDING_VERIFICATION],
])('rejects a linked Google account with blocked status %s', async (status) => {
  verified(googlePayload());
  mockOAuthFindUnique.mockResolvedValue({ userId: userRecord().id });
  mockUserFindUnique.mockResolvedValue(userRecord({ status }));

  await expect(googleAuth('blocked-user', '127.0.0.1')).rejects.toMatchObject({
    message: 'Account is not active.',
  });
  expect(mockUserUpdate).not.toHaveBeenCalled();
});

test('prevents duplicate OAuth identity creation during a concurrent login', async () => {
  verified(googlePayload());
  mockOAuthFindUnique.mockResolvedValue(null);
  mockTxOAuthFindUnique.mockResolvedValue({ userId: userRecord().id });
  mockUserFindUnique.mockResolvedValue(userRecord());

  await googleAuth('concurrent-login', '127.0.0.1');

  expect(mockTxUserCreate).not.toHaveBeenCalled();
  expect(mockTxOAuthCreate).not.toHaveBeenCalled();
  expect(mockUserUpdate).toHaveBeenCalledTimes(1);
});
