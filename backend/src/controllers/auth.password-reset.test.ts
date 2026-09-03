import express from 'express';
import request from 'supertest';

const mockForgotPassword = jest.fn();
const mockResetPassword = jest.fn();
jest.mock('../services/auth.service', () => ({
  forgotPassword: mockForgotPassword,
  resetPassword: mockResetPassword,
}));

import authRoutes from '../routes/auth.routes';
import { errorHandler } from '../middleware/errorMiddleware';

function testApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockForgotPassword.mockResolvedValue(undefined);
  mockResetPassword.mockResolvedValue(undefined);
});

test('returns the identical generic response for existing and missing emails', async () => {
  const app = testApp();
  const existing = await request(app)
    .post('/api/v1/auth/forgot-password')
    .send({ email: 'existing@example.com' });
  const missing = await request(app)
    .post('/api/v1/auth/forgot-password')
    .send({ email: 'missing@example.com' });

  expect(existing.status).toBe(200);
  expect(missing.status).toBe(200);
  expect(existing.body).toEqual(missing.body);
  expect(existing.body.message).toBe(
    'If an eligible account exists, password reset instructions have been sent.'
  );
});

test('masks Brevo failure with the same generic success response', async () => {
  mockForgotPassword.mockRejectedValue(new Error('Brevo unavailable'));
  const response = await request(testApp())
    .post('/api/v1/auth/forgot-password')
    .send({ email: 'existing@example.com' });
  expect(response.status).toBe(200);
  expect(response.body.message).toBe(
    'If an eligible account exists, password reset instructions have been sent.'
  );
});

test.each([
  [{ token: 'token', password: 'short', confirmPassword: 'short' }, 'password'],
  [{ token: 'token', password: 'lowercase1!', confirmPassword: 'lowercase1!' }, 'password'],
  [{ token: 'token', password: 'UPPERCASE1!', confirmPassword: 'UPPERCASE1!' }, 'password'],
  [{ token: 'token', password: 'NoNumber!', confirmPassword: 'NoNumber!' }, 'password'],
  [{ token: 'token', password: 'NoSpecial1', confirmPassword: 'NoSpecial1' }, 'password'],
  [{ token: 'token', password: 'ValidPassword1!', confirmPassword: 'Different1!' }, 'confirmPassword'],
])('rejects invalid reset-password input', async (payload, field) => {
  const response = await request(testApp())
    .post('/api/v1/auth/reset-password')
    .send(payload);
  expect(response.status).toBe(422);
  expect(response.body.error.details).toEqual(
    expect.arrayContaining([expect.objectContaining({ field })])
  );
  expect(mockResetPassword).not.toHaveBeenCalled();
});

test('returns reset success without login tokens', async () => {
  const response = await request(testApp())
    .post('/api/v1/auth/reset-password')
    .send({
      token: 'valid-token',
      password: 'NewPassword@123',
      confirmPassword: 'NewPassword@123',
    });
  expect(response.status).toBe(200);
  expect(response.body).toEqual({
    success: true,
    message: 'Password reset successfully. Please log in with your new password.',
  });
});
