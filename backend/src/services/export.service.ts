import {
  readFile,
  stat,
} from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';
import {
  GenerationStatus as PrismaGenerationStatus,
  PosterFormat as PrismaPosterFormat,
  Prisma,
} from '@prisma/client';
import { env } from '../config/env';
import { mapPoster } from '../database/mappers';
import prisma from '../database/prisma';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../middleware/errorMiddleware';
import {
  GenerationStatus,
  IPosterDocument,
  PosterFormat,
} from '../models/Poster';
import { getPosterOutputStorage } from '../poster-engine/orchestration';
import { isValidId } from '../utils/id';
import { createZipArchive, type ZipEntry } from '../utils/zip';

export interface ExportRequest {
  posterId: string;
  ownerId: string;
  format: PosterFormat;
  ip?: string;
  expiresInSeconds?: number;
}

export interface ExportResult {
  exportId: string;
  posterId: string;
  downloadUrl: string;
  format: PosterFormat;
  expiresAt: Date;
  filename: string;
  bytes?: number;
  totalDownloads: number;
}

interface InternalExportResult extends ExportResult {
  sourceDownloadUrl: string;
}

export interface BulkExportRequest {
  posterIds: string[];
  ownerId: string;
  format: PosterFormat;
  ip?: string;
}

export interface BulkExportResult {
  requested: number;
  succeeded: number;
  failed: number;
  downloadUrl?: string;
  filename?: string;
  results: Array<{ posterId: string; downloadUrl?: string; filename?: string; error?: string }>;
}

export interface ExportHistoryQuery {
  ownerId: string;
  posterId?: string;
  storeId?: string;
  format?: PosterFormat;
  page?: number;
  limit?: number;
  fromDate?: Date;
  toDate?: Date;
}

export interface ExportHistoryRecord {
  posterId: string;
  posterTitle: string | undefined;
  posterUrl: string | undefined;
  thumbnailUrl: string;
  exportedAt: Date;
  format: PosterFormat;
  downloadUrl: string;
  expiresAt: Date | undefined;
  ipAddress: string | undefined;
}

export interface PaginatedExportHistory {
  records: ExportHistoryRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ExportAnalytics {
  ownerId: string;
  storeId?: string;
  totalExports: number;
  totalDownloads: number;
  exportsByFormat: Record<PosterFormat, number>;
  topExportedPosters: Array<{
    posterId: string;
    title?: string;
    downloads: number;
  }>;
  exportsLast7Days: number;
  exportsLast30Days: number;
  mostRecentExportAt: Date | null;
}

export interface ExportDownload {
  filename: string;
  contentType: string;
  data: Buffer;
  bytes: number;
}

const DEFAULT_EXPIRES_SECONDS = 3600;
const BULK_ARCHIVE_TTL_MS = 15 * 60 * 1000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_BULK_SIZE = 25;
const MIME_BY_FORMAT: Record<PosterFormat, string> = {
  [PosterFormat.JPEG]: 'image/jpeg',
  [PosterFormat.PNG]: 'image/png',
  [PosterFormat.WEBP]: 'image/webp',
  [PosterFormat.PDF]: 'application/pdf',
};
const posterInclude = {
  exports: true,
  product: { include: { store: true } },
  generatedContent: {
    include: { product: true, posters: { select: { id: true } } },
  },
  store: true,
} as const;

interface BulkArchiveCacheEntry {
  ownerId: string;
  filename: string;
  data: Buffer;
  contentType: string;
  bytes: number;
  expiresAt: Date;
}

const bulkArchiveCache = new Map<string, BulkArchiveCacheEntry>();

function logExport(message: string, details: Record<string, unknown> = {}): void {
  console.info('[export]', message, details);
}

async function loadExportablePoster(
  posterId: string,
  ownerId: string
): Promise<IPosterDocument> {
  if (!isValidId(posterId)) throw new ValidationError('Invalid poster ID format.');
  const record = await prisma.poster.findUnique({
    where: { id: posterId },
    include: posterInclude,
  });
  if (!record) throw new NotFoundError('Poster');
  if (record.ownerId !== ownerId) {
    throw new ForbiddenError('You do not have permission to export this poster.');
  }
  if (record.generationStatus !== PrismaGenerationStatus.completed) {
    throw new ValidationError(
      `Poster cannot be exported because its status is "${record.generationStatus}". Only completed posters can be exported.`
    );
  }
  if (!record.storagePublicId || !record.storageProvider) {
    throw new ValidationError(
      'Poster storage metadata is missing. The poster may need to be regenerated.'
    );
  }
  logExport('Poster found', {
    posterId,
    ownerId,
    storageProvider: record.storageProvider,
    bytes: record.storageBytes ?? undefined,
  });
  return mapPoster(record);
}

function buildFilename(poster: IPosterDocument, format: PosterFormat): string {
  void poster;
  return `Poster.${format}`;
}

function buildExportDownloadUrl(exportId: string): string {
  return `/api/${env.API_VERSION}/export/downloads/${exportId}`;
}

function buildBulkArchiveDownloadUrl(archiveId: string): string {
  return `/api/${env.API_VERSION}/export/bulk-downloads/${archiveId}`;
}

async function createPosterExport(request: ExportRequest): Promise<InternalExportResult> {
  logExport('Export request received', {
    posterId: request.posterId,
    ownerId: request.ownerId,
    format: request.format,
  });
  const poster = await loadExportablePoster(request.posterId, request.ownerId);
  const metadata = poster.storageMetadata!;
  const expiresInSeconds = request.expiresInSeconds ?? DEFAULT_EXPIRES_SECONDS;
  const download = await getPosterOutputStorage(metadata.provider).getDownload({
    publicId: metadata.publicId,
    publicUrl: poster.posterUrl,
    format: request.format,
    expiresInSeconds,
  });
  const expiresAt =
    download.expiresAt ?? new Date(Date.now() + expiresInSeconds * 1000);
  logExport('Image generated', {
    posterId: poster._id,
    format: download.format,
    bytes: metadata.bytes,
    sourceUrl: download.url,
    expiresAt,
  });

  const [exportRecord, updatedPoster] = await prisma.$transaction([
    prisma.posterExport.create({
      data: {
        posterId: poster._id,
        format: download.format as unknown as PrismaPosterFormat,
        downloadUrl: download.url,
        expiresAt: download.expiresAt,
        ipAddress: request.ip,
      },
    }),
    prisma.poster.update({
      where: { id: poster._id },
      data: { totalDownloads: { increment: 1 } },
    }),
  ]);

  return {
    exportId: exportRecord.id,
    posterId: poster._id,
    downloadUrl: buildExportDownloadUrl(exportRecord.id),
    sourceDownloadUrl: download.url,
    format: download.format,
    expiresAt,
    filename: buildFilename(poster, download.format),
    bytes: metadata.bytes,
    totalDownloads: updatedPoster.totalDownloads,
  };
}

export async function exportPoster(request: ExportRequest): Promise<ExportResult> {
  const { sourceDownloadUrl, ...result } = await createPosterExport(request);
  void sourceDownloadUrl;
  return result;
}

export async function exportBulk(
  request: BulkExportRequest
): Promise<BulkExportResult> {
  if (request.posterIds.length === 0) {
    throw new ValidationError('At least one poster ID is required for bulk export.');
  }
  if (request.posterIds.length > MAX_BULK_SIZE) {
    throw new ValidationError(
      `Bulk export is limited to ${MAX_BULK_SIZE} posters per request. Received ${request.posterIds.length}.`
    );
  }
  const uniqueIds = [...new Set(request.posterIds)];
  const results: BulkExportResult['results'] = [];
  const zipEntries: ZipEntry[] = [];
  let succeeded = 0;

  for (const [index, posterId] of uniqueIds.entries()) {
    try {
      const result = await createPosterExport({ ...request, posterId });
      const filename = `Poster-${index + 1}.${result.format}`;
      const data = await readExportBuffer(result.sourceDownloadUrl);

      zipEntries.push({ filename, data, modifiedAt: new Date() });
      results.push({ posterId, downloadUrl: result.downloadUrl, filename });
      succeeded += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ValidationError(`Bulk export failed for poster ${posterId}: ${message}`);
    }
  }

  const archive =
    zipEntries.length > 0
      ? await writeBulkArchive({
          ownerId: request.ownerId,
          format: request.format,
          entries: zipEntries,
        })
      : undefined;

  return {
    requested: uniqueIds.length,
    succeeded,
    failed: 0,
    downloadUrl: archive?.downloadUrl,
    filename: archive?.filename,
    results,
  };
}

async function writeBulkArchive(input: {
  ownerId: string;
  format: PosterFormat;
  entries: ZipEntry[];
}): Promise<{ downloadUrl: string; filename: string }> {
  const filename = 'Poster-Exports.zip';
  const archiveId = randomUUID();
  const data = createZipArchive(input.entries);
  const expiresAt = new Date(Date.now() + BULK_ARCHIVE_TTL_MS);

  bulkArchiveCache.set(archiveId, {
    ownerId: input.ownerId,
    filename,
    data,
    contentType: 'application/zip',
    bytes: data.length,
    expiresAt,
  });
  scheduleBulkArchiveCleanup(archiveId, expiresAt);

  logExport('ZIP generated', {
    archiveId,
    ownerId: input.ownerId,
    format: input.format,
    entries: input.entries.length,
    bytes: data.length,
    expiresAt,
  });

  return {
    filename,
    downloadUrl: buildBulkArchiveDownloadUrl(archiveId),
  };
}

function scheduleBulkArchiveCleanup(archiveId: string, expiresAt: Date): void {
  const delay = Math.max(0, expiresAt.getTime() - Date.now());
  setTimeout(() => {
    const cached = bulkArchiveCache.get(archiveId);
    if (cached && cached.expiresAt.getTime() <= Date.now()) {
      bulkArchiveCache.delete(archiveId);
    }
  }, delay).unref?.();
}

async function readExportBuffer(downloadUrl: string): Promise<Buffer> {
  const localPath = resolveLocalDownloadPath(downloadUrl);
  if (localPath) return readFile(localPath);

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Could not download exported asset (${response.status}).`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function getExportDownload(
  exportId: string,
  ownerId: string
): Promise<ExportDownload> {
  if (!isValidId(exportId)) throw new ValidationError('Invalid export ID format.');

  const record = await prisma.posterExport.findUnique({
    where: { id: exportId },
    include: { poster: { include: posterInclude } },
  });
  if (!record) throw new NotFoundError('Export');
  if (record.poster.ownerId !== ownerId) {
    throw new ForbiddenError('You do not have permission to download this export.');
  }

  const poster = mapPoster(record.poster);
  const format = record.format as PosterFormat;
  const filename = buildFilename(poster, format);
  const localPath = resolveLocalDownloadPath(record.downloadUrl);

  if (localPath) {
    const [data, fileStat] = await Promise.all([readFile(localPath), stat(localPath)]);
    logExport('Image generated', {
      exportId,
      posterId: poster._id,
      format,
      bytes: fileStat.size,
      source: 'local',
    });
    return {
      filename,
      contentType: MIME_BY_FORMAT[format] ?? 'application/octet-stream',
      data,
      bytes: fileStat.size,
    };
  }

  const response = await fetch(record.downloadUrl);
  if (!response.ok) {
    throw new Error(`Could not download exported asset (${response.status}).`);
  }
  const data = Buffer.from(await response.arrayBuffer());
  logExport('Image generated', {
    exportId,
    posterId: poster._id,
    format,
    bytes: data.length,
    source: 'remote',
    contentType: response.headers.get('content-type') ?? MIME_BY_FORMAT[format],
  });
  return {
    filename,
    contentType: response.headers.get('content-type') ?? MIME_BY_FORMAT[format] ?? 'application/octet-stream',
    data,
    bytes: data.length,
  };
}

export function getBulkArchiveDownload(
  archiveId: string,
  ownerId: string
): ExportDownload {
  if (!isValidId(archiveId)) throw new ValidationError('Invalid archive ID format.');

  const cached = bulkArchiveCache.get(archiveId);
  if (!cached || cached.expiresAt.getTime() <= Date.now()) {
    bulkArchiveCache.delete(archiveId);
    throw new NotFoundError('Bulk export');
  }
  if (cached.ownerId !== ownerId) {
    throw new ForbiddenError('You do not have permission to download this export.');
  }

  logExport('ZIP generated', {
    archiveId,
    ownerId,
    bytes: cached.bytes,
    source: 'memory-cache',
  });

  return {
    filename: cached.filename,
    contentType: cached.contentType,
    data: cached.data,
    bytes: cached.bytes,
  };
}

function resolveLocalDownloadPath(downloadUrl: string): string | undefined {
  let pathname: string;
  try {
    pathname = new URL(downloadUrl).pathname;
  } catch {
    return undefined;
  }

  if (!pathname.startsWith('/downloads/')) return undefined;

  const uploadsRoot = path.resolve(process.cwd(), 'uploads');
  const relativePath = decodeURIComponent(pathname.replace(/^\/downloads\//, ''));
  const outputPath = path.resolve(uploadsRoot, relativePath);

  if (outputPath !== uploadsRoot && outputPath.startsWith(`${uploadsRoot}${path.sep}`)) {
    return outputPath;
  }

  throw new Error('Exported asset path resolves outside the uploads directory.');
}

export async function getExportHistory(
  query: ExportHistoryQuery
): Promise<PaginatedExportHistory> {
  if (query.posterId && !isValidId(query.posterId)) {
    throw new ValidationError('Invalid poster ID format.');
  }
  if (query.storeId && !isValidId(query.storeId)) {
    throw new ValidationError('Invalid store ID format.');
  }
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));
  const where: Prisma.PosterExportWhereInput = {
    poster: {
      ownerId: query.ownerId,
      generationStatus: PrismaGenerationStatus.completed,
      ...(query.storeId && { storeId: query.storeId }),
      ...(query.posterId && { id: query.posterId }),
    },
    ...(query.format && {
      format: query.format as unknown as PrismaPosterFormat,
    }),
    ...((query.fromDate || query.toDate) && {
      exportedAt: { gte: query.fromDate, lte: query.toDate },
    }),
  };
  const [total, records] = await prisma.$transaction([
    prisma.posterExport.count({ where }),
    prisma.posterExport.findMany({
      where,
      include: { poster: true },
      orderBy: { exportedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  const totalPages = Math.ceil(total / limit);

  return {
    records: records.map((record) => ({
      posterId: record.posterId,
      posterTitle: record.poster.title ?? undefined,
      posterUrl: record.poster.posterUrl ?? undefined,
      thumbnailUrl:
        record.poster.storageProvider && record.poster.storagePublicId
          ? getPosterOutputStorage(
              record.poster.storageProvider as unknown as import('../models/Poster').StorageProvider
            ).getPreviewUrl({
              publicId: record.poster.storagePublicId,
              publicUrl: record.poster.posterUrl ?? undefined,
            })
          : record.poster.posterUrl ?? '',
      exportedAt: record.exportedAt,
      format: record.format as PosterFormat,
      downloadUrl: buildExportDownloadUrl(record.id),
      expiresAt: record.expiresAt ?? undefined,
      ipAddress: record.ipAddress ?? undefined,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

export async function getExportAnalytics(
  ownerId: string,
  storeId?: string
): Promise<ExportAnalytics> {
  if (storeId && !isValidId(storeId)) {
    throw new ValidationError('Invalid store ID format.');
  }
  const posterWhere: Prisma.PosterWhereInput = {
    ownerId,
    generationStatus: PrismaGenerationStatus.completed,
    ...(storeId && { storeId }),
  };
  const exportWhere: Prisma.PosterExportWhereInput = { poster: posterWhere };
  const now = Date.now();
  const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [
    totalExports,
    downloadStats,
    formatGroups,
    topPosters,
    exportsLast7Days,
    exportsLast30Days,
    mostRecent,
  ] = await Promise.all([
    prisma.posterExport.count({ where: exportWhere }),
    prisma.poster.aggregate({ where: posterWhere, _sum: { totalDownloads: true } }),
    prisma.posterExport.groupBy({
      by: ['format'],
      where: exportWhere,
      _count: true,
    }),
    prisma.poster.findMany({
      where: { ...posterWhere, totalDownloads: { gt: 0 } },
      select: { id: true, title: true, totalDownloads: true },
      orderBy: { totalDownloads: 'desc' },
      take: 10,
    }),
    prisma.posterExport.count({
      where: { ...exportWhere, exportedAt: { gte: last7Days } },
    }),
    prisma.posterExport.count({
      where: { ...exportWhere, exportedAt: { gte: last30Days } },
    }),
    prisma.posterExport.findFirst({
      where: exportWhere,
      select: { exportedAt: true },
      orderBy: { exportedAt: 'desc' },
    }),
  ]);

  const exportsByFormat = Object.values(PosterFormat).reduce(
    (result, format) => ({ ...result, [format]: 0 }),
    {} as Record<PosterFormat, number>
  );
  formatGroups.forEach((group) => {
    exportsByFormat[group.format as PosterFormat] = group._count;
  });

  return {
    ownerId,
    storeId,
    totalExports,
    totalDownloads: downloadStats._sum.totalDownloads ?? 0,
    exportsByFormat,
    topExportedPosters: topPosters.map((poster) => ({
      posterId: poster.id,
      title: poster.title ?? undefined,
      downloads: poster.totalDownloads,
    })),
    exportsLast7Days,
    exportsLast30Days,
    mostRecentExportAt: mostRecent?.exportedAt ?? null,
  };
}

export { GenerationStatus };
