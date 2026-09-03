process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-access-secret';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID || 'test-client.apps.googleusercontent.com';
process.env.BREVO_API_KEY = process.env.BREVO_API_KEY || 'test-brevo-key';
process.env.EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'PosterAI Test';
process.env.EMAIL_FROM_ADDRESS =
  process.env.EMAIL_FROM_ADDRESS || 'no-reply@example.com';
process.env.EMAIL_REPLY_TO =
  process.env.EMAIL_REPLY_TO || 'support@example.com';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES =
  process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || '60';
