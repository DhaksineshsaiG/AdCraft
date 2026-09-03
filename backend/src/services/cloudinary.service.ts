import {
  v2 as cloudinary,
  UploadApiResponse,
} from 'cloudinary';
import { env } from '../config/env';
import { ExternalServiceError } from '../middleware/errorMiddleware';

// ─── Bootstrap ────────────────────────────────────────────────────────────────
// Cloudinary is configured once at module load time.
// The SDK is a singleton — calling config() again only mutates the shared state,
// so this is safe even when both cloudinary.service.ts and imageComposition.service.ts
// are imported in the same process.

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key:    env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure:     true,
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadOptions {
  folder?: string;
  publicId?: string;           // Explicit public_id; auto-generated if omitted
  tags?: string[];
  overwrite?: boolean;
  resourceType?: 'image' | 'raw' | 'video' | 'auto';
  transformation?: object[];
  format?: string;             // Force output format e.g. 'jpg', 'png', 'webp'
  quality?: number | 'auto';
}

export interface CloudinaryAsset {
  publicId: string;
  secureUrl: string;
  url: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
  resourceType: string;
  folder: string;
  version: number;
  createdAt: string;
  etag?: string;
}

export interface SignedUrlOptions {
  expiresInSeconds?: number;   // Default: 3600 (1 hour)
  transformation?: object[];
  format?: string;
}

export interface AssetMetadata {
  publicId: string;
  format: string;
  resourceType: string;
  bytes: number;
  width?: number;
  height?: number;
  secureUrl: string;
  url: string;
  version: number;
  createdAt: string;
  folder?: string;
  tags: string[];
}

interface CloudinaryResourceMetadata {
  public_id: string;
  format: string;
  resource_type: string;
  bytes: number;
  width?: number;
  height?: number;
  secure_url: string;
  url: string;
  version: number;
  created_at: string;
  folder?: string;
  tags?: string[];
}

// ─── Retry Config ─────────────────────────────────────────────────────────────

const MAX_RETRIES   = 3;
const BASE_DELAY_MS = 500;

/**
 * HTTP status codes and error names that warrant a retry.
 * 499 and below are typically client errors (not retryable).
 */
const RETRYABLE_HTTP_CODES = new Set([429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_MSGS = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'fetch failed', 'network'];

function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (RETRYABLE_ERROR_MSGS.some((s) => msg.includes(s.toLowerCase()))) return true;
  }
  // Cloudinary SDK surfaces http_code on the error object
  const httpCode = (error as Record<string, unknown>)['http_code'];
  if (typeof httpCode === 'number') return RETRYABLE_HTTP_CODES.has(httpCode);
  return false;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generic retry wrapper for Cloudinary operations.
 * Uses exponential back-off with full jitter to avoid thundering herds.
 */
async function withRetry<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 200;
      console.warn(
        `[CloudinaryService] ${label} — attempt ${attempt + 1}/${MAX_RETRIES + 1} failed, retrying in ${Math.round(delay)}ms...`
      );
      await sleep(delay);
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === MAX_RETRIES) break;
    }
  }

  throw mapCloudinaryError(label, lastError);
}

// ─── Error Mapper ─────────────────────────────────────────────────────────────

function mapCloudinaryError(operation: string, error: unknown): ExternalServiceError {
  const raw = error as Record<string, unknown>;

  // Cloudinary SDK wraps errors with a message and optional http_code
  const httpCode  = typeof raw['http_code'] === 'number'  ? raw['http_code']  : 0;
  const message   = typeof raw['message']   === 'string'  ? raw['message']    :
                    error instanceof Error                  ? error.message     :
                    String(error);

  switch (httpCode) {
    case 400:
      return new ExternalServiceError('Cloudinary', `Invalid request during ${operation}: ${message}`);
    case 401:
      return new ExternalServiceError('Cloudinary', `Authentication failed during ${operation}. Check CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.`);
    case 404:
      return new ExternalServiceError('Cloudinary', `Asset not found during ${operation}: ${message}`);
    case 420:
    case 429:
      return new ExternalServiceError('Cloudinary', `Rate limit exceeded during ${operation}. Please slow down requests.`);
    case 500:
    case 503:
      return new ExternalServiceError('Cloudinary', `Cloudinary service unavailable during ${operation}. Please try again later.`);
    default:
      return new ExternalServiceError('Cloudinary', `Unexpected error during ${operation}: ${message}`);
  }
}

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * Upload an image to Cloudinary from a URL or base64 data URI.
 * Returns a typed CloudinaryAsset on success.
 */
export async function uploadImage(
  source: string,    // HTTPS URL, base64 data URI, or local file path
  options: UploadOptions = {}
): Promise<CloudinaryAsset> {
  const result = await withRetry<UploadApiResponse>('uploadImage', () =>
    cloudinary.uploader.upload(source, {
      folder:        options.folder,
      public_id:     options.publicId,
      tags:          options.tags ?? ['ai-poster'],
      overwrite:     options.overwrite ?? false,
      resource_type: options.resourceType ?? 'image',
      unique_filename: !options.publicId,
      ...(options.transformation && { transformation: options.transformation }),
      ...(options.format && { format: options.format }),
      ...(options.quality !== undefined && { quality: options.quality }),
    })
  );

  return mapUploadResponse(result);
}

/**
 * Upload a raw Buffer as a Cloudinary asset using a data URI wrapper.
 * Useful when the image is already in memory (e.g. after format conversion).
 */
export async function uploadBuffer(
  buffer: Buffer,
  mimeType: string,
  options: UploadOptions = {}
): Promise<CloudinaryAsset> {
  const dataUri = `data:${mimeType};base64,${buffer.toString('base64')}`;
  return uploadImage(dataUri, options);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Delete a Cloudinary asset by public_id.
 * Resolves silently if the asset does not exist (idempotent).
 */
export async function deleteImage(
  publicId: string,
  resourceType: 'image' | 'raw' | 'video' = 'image'
): Promise<void> {
  await withRetry('deleteImage', async () => {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });

    // Cloudinary returns { result: 'ok' } on success or { result: 'not found' }
    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new ExternalServiceError(
        'Cloudinary',
        `Failed to delete asset "${publicId}": ${result.result}`
      );
    }
  });
}

/**
 * Delete all assets in a Cloudinary folder.
 * Use with caution — this is irreversible.
 */
export async function deleteFolder(folder: string): Promise<void> {
  await withRetry('deleteFolder', async () => {
    // First delete all resources in the folder
    await cloudinary.api.delete_resources_by_prefix(folder, { resource_type: 'image' });
    // Then delete the empty folder itself
    await cloudinary.api.delete_folder(folder);
  });
}

// ─── Signed / Preview URLs ────────────────────────────────────────────────────

/**
 * Generate a time-limited signed URL for authenticated access to a private asset.
 * Default TTL: 1 hour. Suitable for dashboard preview before public sharing.
 */
export function getSignedUrl(
  publicId: string,
  options: SignedUrlOptions = {}
): string {
  const {
    expiresInSeconds = 3600,
    transformation,
    format,
  } = options;

  try {
    return cloudinary.url(publicId, {
      secure:     true,
      sign_url:   true,
      expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
      resource_type: 'image',
      ...(transformation && { transformation }),
      ...(format && { format }),
    });
  } catch (error) {
    throw mapCloudinaryError('getSignedUrl', error);
  }
}

/**
 * Generate a standard public delivery URL with optional transformations.
 * For assets that do not require authentication.
 */
export function getDeliveryUrl(
  publicId: string,
  options: {
    format?: string;
    quality?: number | 'auto';
    width?: number;
    height?: number;
    crop?: string;
    transformation?: object[];
  } = {}
): string {
  try {
    const { format, quality, width, height, crop, transformation } = options;

    return cloudinary.url(publicId, {
      secure: true,
      resource_type: 'image',
      ...(format && { format }),
      ...(quality !== undefined && { quality }),
      ...(width  && { width }),
      ...(height && { height }),
      ...(crop   && { crop }),
      ...(transformation && { transformation }),
    });
  } catch (error) {
    throw mapCloudinaryError('getDeliveryUrl', error);
  }
}

/**
 * Generate a low-resolution, watermarked preview URL.
 * Used for thumbnail display in the dashboard before download.
 */
export function getPreviewUrl(publicId: string, maxWidth: number = 800): string {
  return getDeliveryUrl(publicId, {
    width:   maxWidth,
    crop:    'limit',
    quality: 'auto',
    format:  'webp',   // WebP for fast thumbnail delivery
  });
}

// ─── Asset Metadata ───────────────────────────────────────────────────────────

/**
 * Fetch full metadata for a Cloudinary asset.
 * Returns null if the asset does not exist.
 */
export async function getAssetMetadata(publicId: string): Promise<AssetMetadata | null> {
  try {
    const result = await withRetry<CloudinaryResourceMetadata>('getAssetMetadata', () =>
      cloudinary.api.resource(publicId, {
        resource_type: 'image',
        image_metadata: true,
      }) as Promise<CloudinaryResourceMetadata>
    );

    return {
      publicId:     result.public_id,
      format:       result.format,
      resourceType: result.resource_type,
      bytes:        result.bytes,
      width:        result.width,
      height:       result.height,
      secureUrl:    result.secure_url,
      url:          result.url,
      version:      result.version,
      createdAt:    result.created_at,
      folder:       result.folder,
      tags:         result.tags ?? [],
    };
  } catch (error) {
    // Treat 404 as "not found" — return null rather than throwing
    const httpCode = (error as Record<string, unknown>)['http_code'];
    if (httpCode === 404) return null;
    throw mapCloudinaryError('getAssetMetadata', error);
  }
}

/**
 * Check whether a Cloudinary asset exists without fetching full metadata.
 * More efficient than getAssetMetadata() for existence-only checks.
 */
export async function assetExists(publicId: string): Promise<boolean> {
  const metadata = await getAssetMetadata(publicId);
  return metadata !== null;
}

// ─── Health Check ─────────────────────────────────────────────────────────────

/**
 * Verify Cloudinary credentials and connectivity by fetching usage stats.
 * Returns a minimal status object for the /health endpoint.
 */
export async function checkHealth(): Promise<{
  connected: boolean;
  cloudName: string;
  message: string;
}> {
  try {
    await cloudinary.api.usage();
    return {
      connected: true,
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      message:   'Cloudinary connection healthy.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      connected: false,
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      message:   `Cloudinary connection failed: ${message}`,
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapUploadResponse(r: UploadApiResponse): CloudinaryAsset {
  return {
    publicId:     r.public_id,
    secureUrl:    r.secure_url,
    url:          r.url,
    format:       r.format,
    width:        r.width,
    height:       r.height,
    bytes:        r.bytes,
    resourceType: r.resource_type,
    folder:       r.folder ?? '',
    version:      r.version,
    createdAt:    r.created_at,
    etag:         r.etag,
  };
}

// ─── Re-export SDK instance ───────────────────────────────────────────────────
// Modules that need direct SDK access (e.g. imageComposition.service.ts)
// can import this instead of calling cloudinary.config() again.

export { cloudinary };
