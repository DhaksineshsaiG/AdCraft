import crypto from 'crypto';

const mockUserFindUnique = jest.fn();
const mockUserFindFirst = jest.fn();
const mockUserUpdate = jest.fn();
const mockTxUserUpdateMany = jest.fn();
const mockTxRefreshUpdateMany = jest.fn();
const mockSendPasswordResetEmail = jest.fn();

const mockPrisma = {
  user: {
    findUnique: mockUserFindUnique,
    findFirst: mockUserFindFirst,
    update: mockUserUpdate,
  },
  refreshToken: {
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
    callback({
      user: { updateMany: mockTxUserUpdateMany },
      refreshToken: { updateMany: mockTxRefreshUpdateMany },
    })
  ),
};

jest.mock('../database/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));
jest.mock('./email.service', () => ({
  sendPasswordResetEmail: mockSendPasswordResetEmail,
}));

import { forgotPassword, resetPassword } from './auth.service';

const activeUser = {
  id: '4af35c85-6d2c-421a-9850-b80f68e21f05',
  name: 'Local User',
  email: 'local@example.com',
  password: '$2a$12$existing',
  status: 'active',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUserUpdate.mockResolvedValue({});
  mockSendPasswordResetEmail.mockResolvedValue(undefined);
  mockTxUserUpdateMany.mockResolvedValue({ count: 1 });
  mockTxRefreshUpdateMany.mockResolvedValue({ count: 2 });
});

test('eligible existing user receives email and stores only a SHA-256 token hash with expiry', async () => {
  mockUserFindUnique.mockResolvedValue(activeUser);
  const before = Date.now();

  await forgotPassword('LOCAL@example.com');

  const updateData = mockUserUpdate.mock.calls[0][0].data;
  const emailInput = mockSendPasswordResetEmail.mock.calls[0][0];
  const rawToken = new URL(emailInput.resetUrl).searchParams.get('token');
  expect(rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(updateData.passwordResetToken).toBe(
    crypto.createHash('sha256').update(rawToken!).digest('hex')
  );
  expect(updateData.passwordResetToken).not.toBe(rawToken);
  expect(updateData.passwordResetTokenExpiresAt.getTime()).toBeGreaterThanOrEqual(
    before + 60 * 60 * 1000
  );
  expect(emailInput).toMatchObject({
    email: activeUser.email,
    name: activeUser.name,
    expiresInMinutes: 60,
  });
});

test('a new request replaces the previous reset token', async () => {
  mockUserFindUnique.mockResolvedValue(activeUser);
  await forgotPassword(activeUser.email);
  await forgotPassword(activeUser.email);

  const first = mockUserUpdate.mock.calls[0][0].data.passwordResetToken;
  const second = mockUserUpdate.mock.calls[1][0].data.passwordResetToken;
  expect(first).not.toBe(second);
  expect(mockUserUpdate).toHaveBeenCalledTimes(2);
});

test.each([
  ['missing user', null],
  ['Google-only user', { ...activeUser, password: null }],
  ['inactive user', { ...activeUser, status: 'inactive' }],
  ['suspended user', { ...activeUser, status: 'suspended' }],
])('does nothing for %s', async (_label, record) => {
  mockUserFindUnique.mockResolvedValue(record);
  await forgotPassword(activeUser.email);
  expect(mockUserUpdate).not.toHaveBeenCalled();
  expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
});

test('propagates Brevo failure for the controller to mask', async () => {
  mockUserFindUnique.mockResolvedValue(activeUser);
  mockSendPasswordResetEmail.mockRejectedValue(new Error('provider unavailable'));
  await expect(forgotPassword(activeUser.email)).rejects.toThrow('provider unavailable');
  expect(mockUserUpdate).toHaveBeenCalledTimes(1);
});

test('successfully consumes a valid token, updates password, and revokes every active refresh token', async () => {
  const rawToken = 'valid-reset-token';
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  mockUserFindFirst.mockResolvedValue({ id: activeUser.id });

  await resetPassword(rawToken, 'NewPassword@123');

  expect(mockUserFindFirst).toHaveBeenCalledWith({
    where: expect.objectContaining({
      passwordResetToken: tokenHash,
      passwordResetTokenExpiresAt: { gt: expect.any(Date) },
      password: { not: null },
      status: 'active',
    }),
    select: { id: true },
  });
  expect(mockTxUserUpdateMany).toHaveBeenCalledWith({
    where: expect.objectContaining({ id: activeUser.id, passwordResetToken: tokenHash }),
    data: expect.objectContaining({
      password: expect.stringMatching(/^\$2[aby]\$12\$/),
      passwordResetToken: null,
      passwordResetTokenExpiresAt: null,
    }),
  });
  expect(mockTxRefreshUpdateMany).toHaveBeenCalledWith({
    where: { userId: activeUser.id, isRevoked: false },
    data: { isRevoked: true, revokedAt: expect.any(Date) },
  });
});

test.each(['missing', 'expired', 'already-used'])(
  'returns the same generic error for an invalid token state: %s',
  async () => {
    mockUserFindFirst.mockResolvedValue(null);
    await expect(resetPassword('invalid-token', 'NewPassword@123')).rejects.toMatchObject({
      statusCode: 401,
      message: 'This password reset link is invalid or has expired. Please request a new one.',
    });
  }
);

test('is single-use', async () => {
  mockUserFindFirst
    .mockResolvedValueOnce({ id: activeUser.id })
    .mockResolvedValueOnce(null);
  await resetPassword('one-time-token', 'NewPassword@123');
  await expect(resetPassword('one-time-token', 'NewPassword@123')).rejects.toMatchObject({
    statusCode: 401,
  });
  expect(mockTxRefreshUpdateMany).toHaveBeenCalledTimes(1);
});

test('allows only one winner during concurrent reuse', async () => {
  mockUserFindFirst.mockResolvedValue({ id: activeUser.id });
  mockTxUserUpdateMany
    .mockResolvedValueOnce({ count: 1 })
    .mockResolvedValueOnce({ count: 0 });

  const results = await Promise.allSettled([
    resetPassword('racing-token', 'NewPassword@123'),
    resetPassword('racing-token', 'NewPassword@123'),
  ]);
  expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
  expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(1);
  expect(mockTxRefreshUpdateMany).toHaveBeenCalledTimes(1);
});
