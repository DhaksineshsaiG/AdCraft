import {
  GenerationStatus as PrismaGenerationStatus,
  PosterFormat as PrismaPosterFormat,
  PosterSize as PrismaPosterSize,
} from '@prisma/client';
import { mapPoster } from '../../database/mappers';
import prisma from '../../database/prisma';
import { IGeneratedContentDocument } from '../../models/GeneratedContent';
import {
  IGenerationMetrics,
  IPosterDimensions,
  IPosterDocument,
  IStorageMetadata,
  PosterFormat,
  PosterSize,
} from '../../models/Poster';
import { IProductDocument } from '../../models/Product';

export interface CreatePendingPosterInput {
  product: IProductDocument;
  content: IGeneratedContentDocument;
  ownerId: string;
  dimensions: IPosterDimensions;
  title?: string;
  tags?: string[];
  size?: PosterSize;
  format?: PosterFormat;
}

export interface CompletePosterInput {
  poster: IPosterDocument;
  posterUrl: string;
  storageMetadata: IStorageMetadata;
  metrics: IGenerationMetrics;
  promptSnapshot: string;
}

export interface PosterGenerationPersistence {
  createPending(input: CreatePendingPosterInput): Promise<IPosterDocument>;
  markProcessing(poster: IPosterDocument): Promise<IPosterDocument>;
  markCompleted(input: CompletePosterInput): Promise<IPosterDocument>;
  markFailed(poster: IPosterDocument, reason: string): Promise<IPosterDocument>;
  recordContentUsage(
    content: IGeneratedContentDocument,
    poster: IPosterDocument
  ): Promise<void>;
}

const posterInclude = {
  exports: true,
  product: { include: { store: true } },
  generatedContent: {
    include: { product: true, posters: { select: { id: true } } },
  },
  store: true,
} as const;

const EDIT_WINDOW_DAYS = 5;

function editableUntilFrom(date: Date): Date {
  return new Date(date.getTime() + EDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

export class PrismaPosterGenerationPersistence
  implements PosterGenerationPersistence
{
  public async createPending(
    input: CreatePendingPosterInput
  ): Promise<IPosterDocument> {
    const latest = await prisma.poster.aggregate({
      where: { productId: input.product._id },
      _max: { version: true },
    });
    const storeId =
      typeof input.product.store === 'string'
        ? input.product.store
        : input.product.store._id;
    const createdAt = new Date();
    const poster = await prisma.poster.create({
      data: {
        productId: input.product._id,
        generatedContentId: input.content._id,
        storeId,
        ownerId: input.ownerId,
        generationStatus: PrismaGenerationStatus.pending,
        width: input.dimensions.width,
        height: input.dimensions.height,
        dimensionUnit: input.dimensions.unit,
        format: (input.format ?? PosterFormat.PNG) as unknown as PrismaPosterFormat,
        size: (input.size ?? PosterSize.CUSTOM) as unknown as PrismaPosterSize,
        version: (latest._max.version ?? 0) + 1,
        title: input.title?.trim(),
        tags: input.tags ?? [],
        createdAt,
        editableUntil: editableUntilFrom(createdAt),
      },
      include: posterInclude,
    });
    return mapPoster(poster);
  }

  public async markProcessing(
    poster: IPosterDocument
  ): Promise<IPosterDocument> {
    const updated = await prisma.poster.update({
      where: { id: poster._id },
      data: {
        generationStatus: PrismaGenerationStatus.processing,
        generationStartedAt: new Date(),
        failureReason: null,
        failedAt: null,
      },
      include: posterInclude,
    });
    return mapPoster(updated);
  }

  public async markCompleted(
    input: CompletePosterInput
  ): Promise<IPosterDocument> {
    const metadata = input.storageMetadata;
    const metrics = input.metrics;
    const updated = await prisma.poster.update({
      where: { id: input.poster._id },
      data: {
        generationStatus: PrismaGenerationStatus.completed,
        generationCompletedAt: new Date(),
        posterUrl: input.posterUrl,
        storageProvider: metadata.provider,
        storagePublicId: metadata.publicId,
        storageBucket: metadata.bucket,
        storageFolder: metadata.folder,
        storageVersion: metadata.version,
        storageEtag: metadata.etag,
        storageBytes: metadata.bytes,
        storageResourceType: metadata.resourceType,
        generationDurationMs: metrics.generationDurationMs,
        dalleRequestDurationMs: metrics.dalleRequestDurationMs,
        uploadDurationMs: metrics.uploadDurationMs,
        generationRetryCount: metrics.retryCount,
        dalleModel: metrics.dalleModel,
        dalleQuality: metrics.dalleQuality,
        dalleStyle: metrics.dalleStyle,
        generationEstimatedCostUsd: metrics.estimatedCostUsd,
        promptSnapshot: input.promptSnapshot,
        failureReason: null,
        failedAt: null,
      },
      include: posterInclude,
    });
    return mapPoster(updated);
  }

  public async markFailed(
    poster: IPosterDocument,
    reason: string
  ): Promise<IPosterDocument> {
    const updated = await prisma.poster.update({
      where: { id: poster._id },
      data: {
        generationStatus: PrismaGenerationStatus.failed,
        failureReason: reason,
        failedAt: new Date(),
      },
      include: posterInclude,
    });
    return mapPoster(updated);
  }

  public async recordContentUsage(
    content: IGeneratedContentDocument,
    _poster: IPosterDocument
  ): Promise<void> {
    await prisma.generatedContent.update({
      where: { id: content._id },
      data: { useCount: { increment: 1 } },
    });
  }
}
