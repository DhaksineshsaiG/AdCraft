import {
  uploadImage,
  uploadBuffer,
  deleteImage,
  deleteFolder,
  getSignedUrl,
  getDeliveryUrl,
  getPreviewUrl,
  getAssetMetadata,
  assetExists,
  checkHealth,
  UploadOptions,
  CloudinaryAsset,
  AssetMetadata,
  SignedUrlOptions,
} from './cloudinary.service';
import {
  StorageProvider,
  IStorageMetadata,
  PosterFormat,
} from '../models/Poster';
import { ValidationError } from '../middleware/errorMiddleware';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type AssetCategory = 'poster' | 'product-image' | 'source' | 'export';

export interface AssetPath {
  folder: string;
  publicId: string;
}

export interface UploadImagePayload {
  /**
   * Source: HTTPS URL, base64 data URI, or local path.
   */
  source: string;
  category: AssetCategory;
  /**
   * Owner (User) ID â€” forms the top-level folder segment.
   */
  ownerId: string;
  /**
   * Optional sub-scope (store or product ID).
   */
  scopeId?: string;
  /**
   * Optional explicit filename (without extension).
   */
  filename?: string;
  tags?: string[];
  overwrite?: boolean;
  format?: string;
  quality?: number | 'auto';
  transformation?: object[];
}

export interface UploadBufferPayload {
  buffer: Buffer;
  mimeType: string;
  category: AssetCategory;
  ownerId: string;
  scopeId?: string;
  filename?: string;
  tags?: string[];
  format?: string;
  quality?: number | 'auto';
}

export interface UploadResult {
  storageMetadata: IStorageMetadata;
  publicUrl: string;
  previewUrl: string;
  width?: number;
  height?: number;
  bytes: number;
}

export interface DeleteResult {
  deleted: boolean;
  publicId: string;
}

export interface SignedDownloadUrl {
  url: string;
  expiresAt: Date;
  format: string;
  publicId: string;
}

export interface StorageHealthStatus {
  provider: 'cloudinary';
  connected: boolean;
  cloudName: string;
  message: string;
  checkedAt: Date;
}

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Maximum file size allowed for upload: 10 MB.
 * Cloudinary free tier limit is 10 MB per asset.
 */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * MIME types accepted for image upload.
 */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

/**
 * Mapping from PosterFormat enum to Cloudinary format string.
 */
const FORMAT_MAP: Record<PosterFormat, string> = {
  [PosterFormat.JPEG]: 'jpg',
  [PosterFormat.PNG]:  'png',
  [PosterFormat.WEBP]: 'webp',
  [PosterFormat.PDF]:  'pdf',
};

// â”€â”€â”€ Path Builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Build a deterministic Cloudinary folder path and public_id for an asset.
 *
 * Folder convention:
 *   ai-posters/{ownerId}/{category}
 *   ai-posters/{ownerId}/{scopeId}/{category}   â† when scopeId is provided
 *
 * This keeps each user's assets isolated under their owner ID, sub-organised
 * by scope (store or product), and categorised by type.
 */
function buildAssetPath(
  category: AssetCategory,
  ownerId: string,
  scopeId?: string,
  filename?: string
): AssetPath {
  const owner = ownerId.toString();
  const scope = scopeId ? scopeId.toString() : null;

  const folder = scope
    ? `ai-posters/${owner}/${scope}/${category}`
    : `ai-posters/${owner}/${category}`;

  const name = filename
    ? filename.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100)
    : `${category}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  return {
    folder,
    publicId: `${folder}/${name}`,
  };
}

// â”€â”€â”€ Validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Validate a Buffer upload payload before hitting the Cloudinary API.
 */
function validateBufferPayload(payload: UploadBufferPayload): void {
  if (!payload.buffer || payload.buffer.length === 0) {
    throw new ValidationError('Upload buffer is empty.');
  }

  if (payload.buffer.length > MAX_UPLOAD_BYTES) {
    const mb = (payload.buffer.length / (1024 * 1024)).toFixed(1);
    throw new ValidationError(
      `Upload size ${mb} MB exceeds the maximum allowed size of ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`
    );
  }

  if (!ALLOWED_MIME_TYPES.has(payload.mimeType.toLowerCase())) {
    throw new ValidationError(
      `Unsupported MIME type "${payload.mimeType}". Allowed: ${Array.from(ALLOWED_MIME_TYPES).join(', ')}.`
    );
  }
}

/**
 * Validate a URL upload payload.
 */
function validateUrlPayload(source: string): void {
  if (!source || source.trim() === '') {
    throw new ValidationError('Upload source URL is empty.');
  }

  // Accept HTTPS URLs and data URIs; reject bare HTTP in production
  const isDataUri  = source.startsWith('data:');
  const isHttps    = source.startsWith('https://');
  const isLocalDev = source.startsWith('http://localhost');

  if (!isDataUri && !isHttps && !isLocalDev) {
    throw new ValidationError(
      'Upload source must be an HTTPS URL or base64 data URI.'
    );
  }
}

// â”€â”€â”€ Core Upload Methods â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Upload an image from a URL or data URI to Cloudinary.
 * Returns structured UploadResult with storageMetadata ready for Poster model.
 */
export async function uploadImageAsset(
  payload: UploadImagePayload
): Promise<UploadResult> {
  validateUrlPayload(payload.source);

  const { folder, publicId } = buildAssetPath(
    payload.category,
    payload.ownerId,
    payload.scopeId,
    payload.filename
  );

  const options: UploadOptions = {
    folder,
    publicId,
    tags:           payload.tags ?? [`category:${payload.category}`],
    overwrite:      payload.overwrite ?? false,
    resourceType:   'image',
    format:         payload.format,
    quality:        payload.quality,
    transformation: payload.transformation,
  };

  const asset = await uploadImage(payload.source, options);
  return buildUploadResult(asset);
}

/**
 * Upload an image Buffer to Cloudinary.
 * Validates size and MIME type before upload.
 */
export async function uploadBufferAsset(
  payload: UploadBufferPayload
): Promise<UploadResult> {
  validateBufferPayload(payload);

  const { folder, publicId } = buildAssetPath(
    payload.category,
    payload.ownerId,
    payload.scopeId,
    payload.filename
  );

  const options: UploadOptions = {
    folder,
    publicId,
    tags:         payload.tags ?? [`category:${payload.category}`],
    resourceType: 'image',
    format:       payload.format,
    quality:      payload.quality,
  };

  const asset = await uploadBuffer(payload.buffer, payload.mimeType, options);
  return buildUploadResult(asset);
}

// â”€â”€â”€ Delete Methods â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Delete a single asset from Cloudinary by its public_id.
 * Resolves silently if the asset does not exist (idempotent).
 */
export async function deleteAsset(publicId: string): Promise<DeleteResult> {
  await deleteImage(publicId, 'image');
  return { deleted: true, publicId };
}

/**
 * Delete all assets for a given owner (user).
 * Used when a user account is permanently deleted.
 */
export async function deleteOwnerAssets(ownerId: string): Promise<void> {
  const folder = `ai-posters/${ownerId.toString()}`;
  await deleteFolder(folder);
}

// â”€â”€â”€ URL Generation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Generate a signed, time-limited download URL for a poster asset.
 * Format is converted via Cloudinary transformation (no local processing).
 */
export async function generateSignedDownloadUrl(
  publicId: string,
  format: PosterFormat,
  expiresInSeconds: number = 3600
): Promise<SignedDownloadUrl> {
  const cloudinaryFormat = FORMAT_MAP[format];
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  const options: SignedUrlOptions = {
    expiresInSeconds,
    format: cloudinaryFormat,
  };

  options.transformation = [{ flags: 'attachment' }];

  const url = getSignedUrl(publicId, options);

  return {
    url,
    expiresAt,
    format: cloudinaryFormat,
    publicId,
  };
}

/**
 * Generate a public CDN delivery URL for a poster in a specific format.
 * No expiry â€” suitable for publicly shared posters.
 */
export function generatePublicUrl(
  publicId: string,
  format: PosterFormat,
  quality: number | 'auto' = 'auto'
): string {
  return getDeliveryUrl(publicId, {
    format:  FORMAT_MAP[format],
    quality,
  });
}

/**
 * Generate a low-resolution preview URL (WebP, max 800px wide).
 * Used for dashboard thumbnails.
 */
export function generateThumbnailUrl(publicId: string, maxWidth: number = 400): string {
  return getPreviewUrl(publicId, maxWidth);
}

/**
 * Generate a medium-resolution preview URL for the poster preview panel.
 */
export function generatePreviewUrl(publicId: string): string {
  return getPreviewUrl(publicId, 1080);
}

// â”€â”€â”€ Asset Queries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Retrieve full metadata for an asset from Cloudinary.
 * Returns null if the asset does not exist.
 */
export async function getAssetInfo(publicId: string): Promise<AssetMetadata | null> {
  return getAssetMetadata(publicId);
}

/**
 * Check whether an asset exists in Cloudinary storage.
 */
export async function checkAssetExists(publicId: string): Promise<boolean> {
  return assetExists(publicId);
}

// â”€â”€â”€ Health Check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Verify storage layer connectivity and credential validity.
 * Used by the application /health endpoint.
 */
export async function getStorageHealth(): Promise<StorageHealthStatus> {
  const result = await checkHealth();
  return {
    provider:  'cloudinary',
    connected: result.connected,
    cloudName: result.cloudName,
    message:   result.message,
    checkedAt: new Date(),
  };
}

// â”€â”€â”€ Metadata Builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Build an IStorageMetadata object from a CloudinaryAsset.
 * This is the shape stored on Poster.storageMetadata in PostgreSQL.
 */
export function buildStorageMetadata(asset: CloudinaryAsset): IStorageMetadata {
  return {
    provider:     StorageProvider.CLOUDINARY,
    publicId:     asset.publicId,
    folder:       asset.folder,
    version:      asset.version,
    bytes:        asset.bytes,
    etag:         asset.etag,
    resourceType: asset.resourceType,
  };
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function buildUploadResult(asset: CloudinaryAsset): UploadResult {
  return {
    storageMetadata: buildStorageMetadata(asset),
    publicUrl:       asset.secureUrl,
    previewUrl:      getPreviewUrl(asset.publicId, 800),
    width:           asset.width,
    height:          asset.height,
    bytes:           asset.bytes,
  };
}
