import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { env } from '../config/env';
import {
  PosterFormat,
  PosterSize,
  IStorageMetadata,
  StorageProvider,
  IPosterDimensions,
} from '../models/Poster';
import { IProductDocument } from '../models/Product';
import { IGeneratedContentDocument, ContentType } from '../models/GeneratedContent';
import { PosterTemplate, resolveDimensions } from '../services/template.service';
import { ExternalServiceError } from '../middleware/errorMiddleware';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompositionInput {
  product: IProductDocument;
  content: IGeneratedContentDocument;
  template: PosterTemplate;
  size: PosterSize;
  format: PosterFormat;
  title?: string;
}

export interface CompositionResult {
  posterUrl: string;
  storageMetadata: IStorageMetadata;
  dimensions: IPosterDimensions;
  promptSnapshot: string;
  generationDurationMs: number;
  uploadDurationMs: number;
}

// Cloudinary transformation layer shape (subset we use)
interface CloudinaryLayer {
  overlay?: string | { font_family: string; font_size: number; font_weight?: string; text_align?: string };
  public_id?: string;
  width?: number;
  height?: number;
  crop?: string;
  gravity?: string;
  x?: number;
  y?: number;
  opacity?: number;
  effect?: string;
  color?: string;
  radius?: number;
}

// ─── Cloudinary Bootstrap ─────────────────────────────────────────────────────

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Sanitise text for use inside Cloudinary text overlay parameters.
 * Cloudinary requires specific characters to be escaped in the overlay string.
 */
function sanitiseOverlayText(text: string): string {
  return text
    .replace(/,/g, '%2C')
    .replace(/\//g, '%2F')
    .replace(/\$/g, '%24')
    .replace(/&/g, '%26')
    .replace(/\?/g, '%3F')
    .replace(/:/g, '%3A')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 200); // Cap at 200 chars for safe URL encoding
}

/**
 * Extract the Cloudinary public_id from a product image URL.
 * If the URL is not a Cloudinary asset, returns null and the image
 * is used directly via fetch URL overlay instead.
 */
function extractCloudinaryPublicId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('cloudinary.com')) return null;
    // URL format: .../upload/v123456/folder/public_id.ext
    const uploadIndex = parsed.pathname.indexOf('/upload/');
    if (uploadIndex === -1) return null;
    const afterUpload = parsed.pathname.slice(uploadIndex + 8);
    // Strip version prefix (v123456/)
    const withoutVersion = afterUpload.replace(/^v\d+\//, '');
    // Strip file extension
    return withoutVersion.replace(/\.[^.]+$/, '');
  } catch {
    return null;
  }
}

/**
 * Convert normalised (0–1) coordinates to absolute pixels for a given canvas size.
 */
function toAbsoluteX(normalised: number, canvasWidth: number): number {
  return Math.round(normalised * canvasWidth);
}

function toAbsoluteY(normalised: number, canvasHeight: number): number {
  return Math.round(normalised * canvasHeight);
}

/**
 * Look up the best text for a given layer role from the generated content.
 * Falls back through content types gracefully.
 */
function resolveTextForRole(
  role: string,
  content: IGeneratedContentDocument,
  product: IProductDocument
): string {
  // Use the selectedText virtual (returns approved variant text)
  const selected = content.selectedText;

  switch (role) {
    case 'headline':
      // If this content IS a headline record, use its selected text
      if (content.contentType === ContentType.HEADLINE && selected) return selected;
      // Otherwise derive a short headline from marketing copy
      if (content.contentType === ContentType.MARKETING_COPY && selected) {
        return selected.split(/[.\n]/)[0]?.trim().slice(0, 80) ?? product.name;
      }
      return product.name.slice(0, 60);

    case 'tagline':
      if (content.contentType === ContentType.TAGLINE && selected) return selected;
      if (product.vendor) return product.vendor;
      return product.categories[0] ?? '';

    case 'description':
      if (content.contentType === ContentType.PRODUCT_DESCRIPTION && selected) return selected;
      if (content.contentType === ContentType.MARKETING_COPY && selected) {
        // Use the second sentence as the description
        const sentences = selected.split(/(?<=[.!?])\s+/);
        return sentences[1]?.trim().slice(0, 120) ?? '';
      }
      return product.shortDescription?.slice(0, 120) ?? product.description?.slice(0, 120) ?? '';

    case 'price': {
      const currency = product.currency ?? 'USD';
      const price = product.price.toFixed(2);
      if (product.compareAtPrice && product.compareAtPrice > product.price) {
        return `${currency} ${price}`;
      }
      return `${currency} ${price}`;
    }

    case 'cta':
      if (content.contentType === ContentType.CALL_TO_ACTION && selected) return selected;
      return 'Shop Now';

    case 'brand':
      return product.vendor ?? '';

    default:
      return selected ?? product.name;
  }
}

// ─── Cloudinary Transformation Builder ───────────────────────────────────────

/**
 * Build the Cloudinary eager transformation array for a poster composition.
 *
 * Architecture:
 * 1. Base canvas — solid colour rectangle at poster dimensions
 * 2. Product image overlay — positioned per template imageZone
 * 3. Text overlays — one per textLayer in the template
 * 4. Optional border overlay
 * 5. Optional price badge
 *
 * All positions use absolute pixel values calculated from the normalised
 * template coordinates × canvas dimensions.
 */
function buildTransformations(
  input: CompositionInput,
  dimensions: IPosterDimensions
): object[] {
  const { product, content, template } = input;
  const { width: cw, height: ch } = dimensions;
  const transformations: object[] = [];

  // ── 1. Background colour fill ─────────────────────────────────────────────
  transformations.push({
    width: cw,
    height: ch,
    crop: 'fill',
    background: `rgb:${template.backgroundColor.replace('#', '')}`,
  });

  // ── 2. Product image overlay ──────────────────────────────────────────────
  const productImageUrl = product.images[0]?.url ?? null;

  if (productImageUrl) {
    const cloudinaryId = extractCloudinaryPublicId(productImageUrl);
    const imgZone = template.layout.imageZone;
    const imgW = Math.round(imgZone.width * cw);
    const imgH = Math.round(imgZone.height * ch);
    const imgX = toAbsoluteX(imgZone.x, cw);
    const imgY = toAbsoluteY(imgZone.y, ch);

    // Apply any image-layer effects from the template
    const productLayer = template.imageLayers.find((l) => l.role === 'product_image');
    const effect = productLayer?.effect;
    const borderRadius = productLayer?.borderRadius ?? 0;

    const imageTransform: CloudinaryLayer & Record<string, unknown> = {
      width: imgW,
      height: imgH,
      crop: productLayer?.crop ?? 'fill',
      gravity: productLayer?.gravity ?? 'center',
      x: imgX,
      y: imgY,
      ...(effect && { effect }),
      ...(borderRadius > 0 && { radius: borderRadius }),
    };

    if (cloudinaryId) {
      transformations.push({ overlay: cloudinaryId, ...imageTransform });
    } else {
      // Non-Cloudinary image — fetch and overlay via URL
      const encodedUrl = encodeURIComponent(productImageUrl);
      transformations.push({ overlay: `fetch:${encodedUrl}`, ...imageTransform });
    }
  }

  // ── 3. Background image effect (blur/dim) ─────────────────────────────────
  const bgLayer = template.imageLayers.find((l) => l.role === 'background');
  if (bgLayer && productImageUrl) {
    const cloudinaryId = extractCloudinaryPublicId(productImageUrl);
    if (cloudinaryId) {
      transformations.push({
        overlay: cloudinaryId,
        width: cw,
        height: ch,
        crop: 'fill',
        gravity: 'center',
        effect: bgLayer.effect ?? 'blur:800',
        opacity: bgLayer.opacity ?? 30,
      });
    }
  }

  // ── 4. Text overlays ──────────────────────────────────────────────────────
  for (const textLayer of template.textLayers) {
    const text = resolveTextForRole(textLayer.role, content, product);
    if (!text || text.trim() === '') continue;

    const sanitised = sanitiseOverlayText(text);
    if (!sanitised) continue;

    // Scale font size to canvas width (template values are calibrated at 1080px)
    const scaledFontSize = Math.round((textLayer.fontSize / 1080) * cw);
    const layerW = Math.round(textLayer.width * cw);
    const layerX = toAbsoluteX(textLayer.x, cw);
    const layerY = toAbsoluteY(textLayer.y, ch);

    transformations.push({
      overlay: {
        font_family: textLayer.fontFamily === 'serif' ? 'Georgia' : 'Arial',
        font_size: scaledFontSize,
        font_weight: textLayer.fontWeight === 'bold' ? 'bold' :
                     textLayer.fontWeight === 'semibold' ? 'bold' : 'normal',
        text_align: textLayer.align,
      },
      public_id: sanitised,
      color: textLayer.color,
      width: layerW,
      gravity: textLayer.gravity,
      x: layerX,
      y: layerY,
      crop: 'fit',
      opacity: Math.round(textLayer.opacity * 100),
    } as CloudinaryLayer);
  }

  // ── 5. Border overlay ─────────────────────────────────────────────────────
  if (template.showBorder && template.borderColor && template.borderWidthPx > 0) {
    const bw = template.borderWidthPx;
    transformations.push({
      width: cw - bw * 2,
      height: ch - bw * 2,
      crop: 'crop',
      gravity: 'center',
      effect: `outline:${bw}:${bw}`,
      color: template.borderColor.replace('#', ''),
    });
  }

  return transformations;
}

// ─── Upload to Cloudinary ─────────────────────────────────────────────────────

async function uploadToCloudinary(
  sourcePublicId: string,
  transformations: object[],
  folder: string,
  format: PosterFormat
): Promise<UploadApiResponse> {
  const cloudinaryFormat = format === PosterFormat.JPEG ? 'jpg' :
                            format === PosterFormat.WEBP ? 'webp' : 'png';

  try {
    const result = await cloudinary.uploader.upload(
      `cloudinary://${env.CLOUDINARY_CLOUD_NAME}/${sourcePublicId}`,
      {
        folder,
        format: cloudinaryFormat,
        transformation: transformations,
        resource_type: 'image',
        overwrite: false,
        unique_filename: true,
        tags: ['ai-poster', 'generated'],
      }
    );
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ExternalServiceError('Cloudinary', `Upload failed: ${message}`);
  }
}

/**
 * Upload an external product image to Cloudinary first (if not already there),
 * then use it as the source for the poster composition.
 */
async function ensureCloudinaryAsset(imageUrl: string, folder: string): Promise<string> {
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: `${folder}/source`,
      resource_type: 'image',
      unique_filename: true,
      overwrite: false,
    });
    return result.public_id;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ExternalServiceError('Cloudinary', `Failed to upload source image: ${message}`);
  }
}

// ─── Main Composition Function ────────────────────────────────────────────────

/**
 * Compose a poster by layering product image and AI-generated text
 * over a template canvas using Cloudinary's transformation pipeline.
 *
 * Returns the public URL, storage metadata, and performance metrics.
 */
export async function composePoster(input: CompositionInput): Promise<CompositionResult> {
  const { product, content, template, size, format } = input;

  const compositionStart = Date.now();
  const dimensions = resolveDimensions(size);

  // ── Validate template compatibility ──────────────────────────────────────
  const primaryImage = product.images[0];
  if (!primaryImage) {
    throw new ExternalServiceError(
      'ImageComposition',
      'Product has no images. A product image is required for poster generation.'
    );
  }

  // ── Ensure source image is in Cloudinary ─────────────────────────────────
  const folder = `ai-posters/${product.owner.toString()}`;
  const sourcePublicId = extractCloudinaryPublicId(primaryImage.url)
    ?? await ensureCloudinaryAsset(primaryImage.url, folder);

  // ── Build transformation pipeline ────────────────────────────────────────
  const transformations = buildTransformations(input, dimensions);

  // ── Upload composed poster to Cloudinary ─────────────────────────────────
  const uploadStart = Date.now();
  const uploadResult = await uploadToCloudinary(sourcePublicId, transformations, folder, format);
  const uploadDurationMs = Date.now() - uploadStart;

  const generationDurationMs = Date.now() - compositionStart;

  // ── Build prompt snapshot for reproducibility ─────────────────────────────
  const promptSnapshot = JSON.stringify({
    templateId: template.id,
    style: template.style,
    size,
    format,
    textContent: template.textLayers.map((l) => ({
      role: l.role,
      text: resolveTextForRole(l.role, content, product).slice(0, 100),
    })),
  });

  return {
    posterUrl: uploadResult.secure_url,
    storageMetadata: {
      provider: StorageProvider.CLOUDINARY,
      publicId: uploadResult.public_id,
      folder: uploadResult.folder,
      version: uploadResult.version,
      bytes: uploadResult.bytes,
      resourceType: uploadResult.resource_type,
    },
    dimensions,
    promptSnapshot,
    generationDurationMs,
    uploadDurationMs,
  };
}

/**
 * Generate a time-limited signed URL for previewing a poster (no public exposure).
 * Useful for the dashboard preview before a poster is made public.
 */
export function generatePreviewUrl(publicId: string, expiresInSeconds: number = 3600): string {
  try {
    return cloudinary.url(publicId, {
      secure: true,
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
      resource_type: 'image',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ExternalServiceError('Cloudinary', `Failed to generate preview URL: ${message}`);
  }
}

/**
 * Delete a poster asset from Cloudinary storage.
 * Called when a poster record is deleted.
 */
export async function deleteStorageAsset(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (error) {
    // Log but don't throw — the DB record should still be deleted
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ImageComposition] Failed to delete Cloudinary asset "${publicId}": ${message}`);
  }
}

/**
 * Get the delivery URL for a specific format/quality variant.
 * Used by the export endpoint to generate direct download URLs.
 */
export function buildDeliveryUrl(
  publicId: string,
  format: PosterFormat,
  quality: 'auto' | 'best' | number = 'auto'
): string {
  const cloudinaryFormat = format === PosterFormat.JPEG ? 'jpg'
    : format === PosterFormat.WEBP ? 'webp'
    : format === PosterFormat.PDF  ? 'pdf'
    : 'png';

  return cloudinary.url(publicId, {
    secure: true,
    format: cloudinaryFormat,
    quality,
    resource_type: 'image',
  });
}
