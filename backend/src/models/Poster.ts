import type { IGeneratedContentDocument } from './GeneratedContent';
import type { IProductDocument } from './Product';
import type { IStoreDocument } from './Store';

export enum GenerationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum PosterFormat {
  JPEG = 'jpeg',
  PNG = 'png',
  WEBP = 'webp',
  PDF = 'pdf',
}

export enum PosterSize {
  SQUARE = 'square',
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape',
  A4_PORTRAIT = 'a4_portrait',
  STORY = 'story',
  CUSTOM = 'custom',
}

export enum StorageProvider {
  CLOUDINARY = 'cloudinary',
  S3 = 's3',
  LOCAL = 'local',
}

export interface IPosterDimensions {
  width: number;
  height: number;
  unit: 'px' | 'mm' | 'in';
}

export interface IStorageMetadata {
  provider: StorageProvider;
  publicId: string;
  bucket?: string;
  folder?: string;
  version?: number;
  etag?: string;
  bytes?: number;
  resourceType?: string;
}

export interface IGenerationMetrics {
  generationDurationMs?: number;
  dalleRequestDurationMs?: number;
  uploadDurationMs?: number;
  retryCount: number;
  dalleModel?: string;
  dalleQuality?: 'standard' | 'hd';
  dalleStyle?: 'vivid' | 'natural';
  estimatedCostUsd?: number;
}

export interface IExportRecord {
  exportedAt: Date;
  format: PosterFormat;
  downloadUrl: string;
  expiresAt?: Date;
  ipAddress?: string;
}

export interface IPoster {
  _id: string;
  id: string;
  product: string | IProductDocument;
  generatedContent: string | IGeneratedContentDocument;
  store: string | IStoreDocument;
  owner: string;
  generationStatus: GenerationStatus;
  generationStartedAt?: Date;
  generationCompletedAt?: Date;
  failureReason?: string;
  failedAt?: Date;
  posterUrl?: string;
  thumbnailUrl?: string;
  storageMetadata?: IStorageMetadata;
  dimensions: IPosterDimensions;
  format: PosterFormat;
  size: PosterSize;
  generationMetrics?: IGenerationMetrics;
  exports: IExportRecord[];
  totalDownloads: number;
  promptSnapshot?: string;
  isPublic: boolean;
  isFavourited: boolean;
  tags: string[];
  title?: string;
  version: number;
  parentPosterId?: string;
  createdAt: Date;
  editableUntil: Date;
  updatedAt: Date;
  isEditable: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  isPending: boolean;
}

export type IPosterDocument = IPoster;
