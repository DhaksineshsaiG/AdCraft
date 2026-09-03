import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import {
  IStorageMetadata,
  PosterFormat,
  StorageProvider,
} from '../../models/Poster';
import { env } from '../../config/env';
import {
  deleteAsset,
  generatePreviewUrl,
  generateSignedDownloadUrl,
  uploadBufferAsset,
} from '../../services/storage.service';
import {
  deletePoster,
  uploadPoster,
} from '../../services/s3.service';

export interface StorePosterOutputInput {
  buffer: Buffer;
  ownerId: string;
  productId: string;
  posterId: string;
  filename?: string;
}

export interface StoredPosterOutput {
  publicUrl: string;
  previewUrl: string;
  storageMetadata: IStorageMetadata;
  width?: number;
  height?: number;
  bytes: number;
}

export interface PosterAssetInput {
  publicId: string;
  publicUrl?: string;
}

export interface PosterDownloadInput extends PosterAssetInput {
  format: PosterFormat;
  expiresInSeconds?: number;
}

export interface PosterDownload {
  url: string;
  format: PosterFormat;
  expiresAt?: Date;
}

export interface PosterOutputStorage {
  storePng(input: StorePosterOutputInput): Promise<StoredPosterOutput>;
  getPreviewUrl(input: PosterAssetInput): string;
  getDownload(input: PosterDownloadInput): Promise<PosterDownload>;
  delete(input: PosterAssetInput): Promise<void>;
}

export class CloudinaryPosterOutputStorage implements PosterOutputStorage {
  public async storePng(input: StorePosterOutputInput): Promise<StoredPosterOutput> {
    return uploadBufferAsset({
      buffer: input.buffer,
      mimeType: 'image/png',
      category: 'poster',
      ownerId: input.ownerId,
      scopeId: input.productId,
      filename: input.filename ?? `poster_${input.posterId}`,
      tags: ['ai-poster', 'poster-engine', `poster:${input.posterId}`],
      format: 'png',
      quality: 'auto',
    });
  }

  public getPreviewUrl(input: PosterAssetInput): string {
    return generatePreviewUrl(input.publicId);
  }

  public async getDownload(input: PosterDownloadInput): Promise<PosterDownload> {
    const result = await generateSignedDownloadUrl(
      input.publicId,
      input.format,
      input.expiresInSeconds
    );

    return {
      url: result.url,
      format: input.format,
      expiresAt: result.expiresAt,
    };
  }

  public async delete(input: PosterAssetInput): Promise<void> {
    await deleteAsset(input.publicId);
  }
}

export class LocalPosterOutputStorage implements PosterOutputStorage {
  public async storePng(input: StorePosterOutputInput): Promise<StoredPosterOutput> {
    const filename = sanitizeFilename(input.filename ?? `poster_${input.posterId}`);
    const relativeDirectory = path.join(input.ownerId, input.productId);
    const outputDirectory = path.resolve(process.cwd(), 'uploads', 'posters', relativeDirectory);
    const outputPath = path.join(outputDirectory, `${filename}.png`);

    await mkdir(outputDirectory, { recursive: true });
    await writeFile(outputPath, input.buffer);

    const publicPath = [
      'uploads',
      'posters',
      input.ownerId,
      input.productId,
      `${filename}.png`,
    ].join('/');
    const publicUrl = `http://localhost:${env.PORT}/${publicPath}`;

    return {
      publicUrl,
      previewUrl: publicUrl,
      storageMetadata: {
        provider: StorageProvider.LOCAL,
        publicId: publicPath,
        folder: path.posix.dirname(publicPath),
        bytes: input.buffer.length,
        resourceType: 'image',
      },
      bytes: input.buffer.length,
    };
  }

  public getPreviewUrl(input: PosterAssetInput): string {
    return input.publicUrl ?? buildLocalPublicUrl(input.publicId);
  }

  public async getDownload(input: PosterDownloadInput): Promise<PosterDownload> {
    const relativePath = stripUploadsPrefix(input.publicId);

    return {
      url: `http://localhost:${env.PORT}/downloads/${relativePath}`,
      format: PosterFormat.PNG,
    };
  }

  public async delete(input: PosterAssetInput): Promise<void> {
    const outputPath = resolveLocalAssetPath(input.publicId);

    try {
      await unlink(outputPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}

export class S3PosterOutputStorage implements PosterOutputStorage {
  public async storePng(input: StorePosterOutputInput): Promise<StoredPosterOutput> {
    const filename = sanitizeFilename(input.filename ?? `poster_${input.posterId}`);
    const key = [
      'posters',
      input.ownerId,
      input.productId,
      `${filename}.png`,
    ].join('/');
    const uploaded = await uploadPoster(input.buffer, key, 'image/png');

    return {
      publicUrl: uploaded.url,
      previewUrl: uploaded.url,
      storageMetadata: {
        provider: StorageProvider.S3,
        publicId: uploaded.key,
        bucket: env.AWS_S3_BUCKET,
        folder: path.posix.dirname(uploaded.key),
        bytes: input.buffer.length,
        resourceType: 'image',
      },
      bytes: input.buffer.length,
    };
  }

  public getPreviewUrl(input: PosterAssetInput): string {
    return input.publicUrl ?? buildS3PublicUrl(input.publicId);
  }

  public async getDownload(input: PosterDownloadInput): Promise<PosterDownload> {
    return {
      url: input.publicUrl ?? buildS3PublicUrl(input.publicId),
      format: PosterFormat.PNG,
    };
  }

  public async delete(input: PosterAssetInput): Promise<void> {
    await deletePoster(input.publicId);
  }
}

export function createPosterOutputStorage(): PosterOutputStorage {
  const cloudinaryConfigured = Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET
  );

  if (env.STORAGE_PROVIDER === 'local') {
    return new LocalPosterOutputStorage();
  }

  if (env.STORAGE_PROVIDER === 's3') {
    return new S3PosterOutputStorage();
  }

  if (env.NODE_ENV === 'development' && !cloudinaryConfigured) {
    return new LocalPosterOutputStorage();
  }

  return new CloudinaryPosterOutputStorage();
}

export function getPosterOutputStorage(provider: StorageProvider): PosterOutputStorage {
  if (provider === StorageProvider.LOCAL) {
    return new LocalPosterOutputStorage();
  }

  if (provider === StorageProvider.S3) {
    return new S3PosterOutputStorage();
  }

  return new CloudinaryPosterOutputStorage();
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
}

function stripUploadsPrefix(publicId: string): string {
  return publicId.replace(/\\/g, '/').replace(/^uploads\//, '');
}

function buildLocalPublicUrl(publicId: string): string {
  return `http://localhost:${env.PORT}/uploads/${stripUploadsPrefix(publicId)}`;
}

function buildS3PublicUrl(publicId: string): string {
  const encodedKey = publicId
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${encodedKey}`;
}

function resolveLocalAssetPath(publicId: string): string {
  const uploadsRoot = path.resolve(process.cwd(), 'uploads');
  const outputPath = path.resolve(uploadsRoot, stripUploadsPrefix(publicId));

  if (outputPath !== uploadsRoot && !outputPath.startsWith(`${uploadsRoot}${path.sep}`)) {
    throw new Error('Local poster asset path resolves outside the uploads directory.');
  }

  return outputPath;
}
