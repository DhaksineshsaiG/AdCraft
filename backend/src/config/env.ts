import dotenv from 'dotenv';
import path from 'path';

// Load .env file relative to project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeEnv = 'development' | 'production' | 'test';

interface EnvConfig {
  // Server
  NODE_ENV: NodeEnv;
  PORT: number;
  API_VERSION: string;
  ALLOWED_ORIGINS: string[];

  // Database
  DATABASE_URL: string;

  // Auth / JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
  GOOGLE_CLIENT_ID: string;

  // Transactional email / password reset
  BREVO_API_KEY: string;
  EMAIL_FROM_NAME: string;
  EMAIL_FROM_ADDRESS: string;
  EMAIL_REPLY_TO: string;
  FRONTEND_URL: string;
  PASSWORD_RESET_TOKEN_TTL_MINUTES: number;

  // OpenAI
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
  OPENAI_IMAGE_MODEL: string;

  // Ollama
  OLLAMA_BASE_URL: string;
  OLLAMA_MODEL: string;

  // Content Generation
  CONTENT_PROVIDER: 'ollama' | 'marketing';

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;

  // AWS S3 (optional alternative to Cloudinary)
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  AWS_S3_BUCKET: string;

  // Storage Provider
  STORAGE_PROVIDER: 'cloudinary' | 's3' | 'local';

  // Shopify
  SHOPIFY_API_KEY: string;
  SHOPIFY_API_SECRET: string;
  SHOPIFY_SCOPES: string;

  // WooCommerce
  WOOCOMMERCE_CONSUMER_KEY: string;
  WOOCOMMERCE_CONSUMER_SECRET: string;

  // Razorpay (Test Mode)
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  CAMPAIGN_EXECUTION_AMOUNT: number;

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;

  // Poster Renderer
  POSTER_RENDERER_VERSION: 'v1' | 'v2';

  // Logging
  LOG_LEVEL: string;
  LOG_DIR: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`[ENV] Missing required environment variable: ${key}`);
  }
  return value.trim();
}

function optionalEnv(key: string, defaultValue: string): string {
  const value = process.env[key];
  return value && value.trim() !== '' ? value.trim() : defaultValue;
}

function requireNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`[ENV] Missing required numeric environment variable: ${key}`);
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`[ENV] Environment variable ${key} must be a valid number, got: "${value}"`);
  }
  return parsed;
}

function parseNodeEnv(value: string): NodeEnv {
  const valid: NodeEnv[] = ['development', 'production', 'test'];
  if (valid.includes(value as NodeEnv)) return value as NodeEnv;
  console.warn(`[ENV] NODE_ENV="${value}" is not recognized. Defaulting to "development".`);
  return 'development';
}

function parseStorageProvider(value: string): 'cloudinary' | 's3' | 'local' {
  if (value === 'cloudinary' || value === 's3' || value === 'local') return value;
  console.warn(`[ENV] STORAGE_PROVIDER="${value}" is not recognized. Defaulting to "cloudinary".`);
  return 'cloudinary';
}

function parseContentProvider(value: string): 'ollama' | 'marketing' {
  if (value === 'ollama' || value === 'marketing') return value;
  console.warn(`[ENV] CONTENT_PROVIDER="${value}" is not recognized. Defaulting to "ollama".`);
  return 'ollama';
}

function parsePosterRendererVersion(value: string): 'v1' | 'v2' {
  if (value === 'v1' || value === 'v2') return value;
  console.warn(`[ENV] POSTER_RENDERER_VERSION="${value}" is not recognized. Defaulting to "v1".`);
  return 'v1';
}

// ─── Build & Validate Config ──────────────────────────────────────────────────

function buildEnvConfig(): EnvConfig {
  const nodeEnv = parseNodeEnv(optionalEnv('NODE_ENV', 'development'));
  const productionEmailValue = (key: string, developmentDefault = ''): string =>
    nodeEnv === 'production' ? requireEnv(key) : optionalEnv(key, developmentDefault);
  const passwordResetTtl = requireNumber(
    'PASSWORD_RESET_TOKEN_TTL_MINUTES',
    nodeEnv === 'production' ? undefined : 60
  );
  if (passwordResetTtl <= 0) {
    throw new Error('[ENV] PASSWORD_RESET_TOKEN_TTL_MINUTES must be greater than zero.');
  }

  return {
    // Server
    NODE_ENV: nodeEnv,
    PORT: requireNumber('PORT', 5000),
    API_VERSION: optionalEnv('API_VERSION', 'v1'),
    ALLOWED_ORIGINS: optionalEnv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',').map((o) => o.trim()),

    // Database
    DATABASE_URL: requireEnv('DATABASE_URL'),

    // Auth / JWT
    JWT_SECRET: requireEnv('JWT_SECRET'),
    JWT_EXPIRES_IN: optionalEnv('JWT_EXPIRES_IN', '15m'),
    JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET'),
    JWT_REFRESH_EXPIRES_IN: optionalEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
    GOOGLE_CLIENT_ID: requireEnv('GOOGLE_CLIENT_ID'),

    // Transactional email / password reset
    BREVO_API_KEY: productionEmailValue('BREVO_API_KEY'),
    EMAIL_FROM_NAME: productionEmailValue('EMAIL_FROM_NAME', 'PosterAI'),
    EMAIL_FROM_ADDRESS: productionEmailValue('EMAIL_FROM_ADDRESS'),
    EMAIL_REPLY_TO: productionEmailValue('EMAIL_REPLY_TO'),
    FRONTEND_URL: productionEmailValue('FRONTEND_URL', 'http://localhost:3000').replace(/\/+$/, ''),
    PASSWORD_RESET_TOKEN_TTL_MINUTES: passwordResetTtl,

    // OpenAI
    OPENAI_API_KEY: optionalEnv('OPENAI_API_KEY', ''),
    OPENAI_MODEL: optionalEnv('OPENAI_MODEL', 'gpt-4o'),
    OPENAI_IMAGE_MODEL: optionalEnv('OPENAI_IMAGE_MODEL', 'dall-e-3'),

    // Ollama
    OLLAMA_BASE_URL: optionalEnv('OLLAMA_BASE_URL', 'http://localhost:11434'),
    OLLAMA_MODEL: optionalEnv('OLLAMA_MODEL', 'llama3.2'),

    // Content Generation
    CONTENT_PROVIDER: parseContentProvider(optionalEnv('CONTENT_PROVIDER', 'ollama')),

    // Cloudinary
    CLOUDINARY_CLOUD_NAME: optionalEnv('CLOUDINARY_CLOUD_NAME', ''),
    CLOUDINARY_API_KEY: optionalEnv('CLOUDINARY_API_KEY', ''),
    CLOUDINARY_API_SECRET: optionalEnv('CLOUDINARY_API_SECRET', ''),

    // AWS S3
    AWS_ACCESS_KEY_ID: optionalEnv('AWS_ACCESS_KEY_ID', ''),
    AWS_SECRET_ACCESS_KEY: optionalEnv('AWS_SECRET_ACCESS_KEY', ''),
    AWS_REGION: optionalEnv('AWS_REGION', 'us-east-1'),
    AWS_S3_BUCKET: optionalEnv('AWS_S3_BUCKET', ''),

    // Storage Provider
    STORAGE_PROVIDER: parseStorageProvider(optionalEnv('STORAGE_PROVIDER', 'cloudinary')),

    // Shopify
    SHOPIFY_API_KEY: optionalEnv('SHOPIFY_API_KEY', ''),
    SHOPIFY_API_SECRET: optionalEnv('SHOPIFY_API_SECRET', ''),
    SHOPIFY_SCOPES: optionalEnv('SHOPIFY_SCOPES', 'read_products'),

    // WooCommerce
    WOOCOMMERCE_CONSUMER_KEY: optionalEnv('WOOCOMMERCE_CONSUMER_KEY', ''),
    WOOCOMMERCE_CONSUMER_SECRET: optionalEnv('WOOCOMMERCE_CONSUMER_SECRET', ''),

    // Razorpay (Test Mode)
    RAZORPAY_KEY_ID: optionalEnv('RAZORPAY_KEY_ID', ''),
    RAZORPAY_KEY_SECRET: optionalEnv('RAZORPAY_KEY_SECRET', ''),
    CAMPAIGN_EXECUTION_AMOUNT: requireNumber('CAMPAIGN_EXECUTION_AMOUNT', 499),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: requireNumber('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: requireNumber('RATE_LIMIT_MAX_REQUESTS', 100),

    // Poster Renderer
    POSTER_RENDERER_VERSION: parsePosterRendererVersion(optionalEnv('POSTER_RENDERER_VERSION', 'v1')),

    // Logging
    LOG_LEVEL: optionalEnv('LOG_LEVEL', nodeEnv === 'production' ? 'warn' : 'debug'),
    LOG_DIR: optionalEnv('LOG_DIR', 'logs'),
  };
}

// ─── Export ───────────────────────────────────────────────────────────────────

let _env: EnvConfig;

export function getEnv(): EnvConfig {
  if (!_env) {
    _env = buildEnvConfig();
  }
  return _env;
}

// Default singleton export for convenience
export const env = getEnv();

export default env;
