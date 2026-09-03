import {
  GenerationStatus as PrismaGenerationStatus,
  PosterFormat as PrismaPosterFormat,
  PosterSize as PrismaPosterSize,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { mapPoster } from '../database/mappers';
import prisma from '../database/prisma';
import { PosterStyle } from '../generated-content/promptBuilder.service';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../middleware/errorMiddleware';
import {
  ContentStatus,
  ContentType,
  IGeneratedContentDocument,
} from '../models/GeneratedContent';
import {
  GenerationStatus,
  IPosterDocument,
  PosterFormat,
  PosterSize,
} from '../models/Poster';
import { IProductDocument } from '../models/Product';
import {
  BackgroundComponent,
  CTAComponent,
  DescriptionComponent,
  DiscountBadgeComponent,
  HeadlineComponent,
  PriceComponent,
  ProductImageComponent,
} from '../poster-engine/components';
import {
  createDefaultPosterGenerationService,
  getPosterOutputStorage,
} from '../poster-engine/orchestration';
import { DefaultSharpRenderer } from '../poster-engine/renderers';
import { PosterTemplate as EnginePosterTemplate } from '../poster-engine/templates/PosterTemplate';
import { isValidId } from '../utils/id';
import {
  getContentById,
  getLatestContentByProduct,
} from './generatedContent.service';
import {
  getTemplateById,
  PosterTemplate as LegacyPosterTemplate,
  resolveDimensions,
  selectTemplate,
  validateTemplate,
} from './template.service';
import { getProductById } from './product.service';

export interface GeneratePosterPayload {
  style: PosterStyle;
  size: PosterSize;
  format: PosterFormat;
  templateId?: string;
  contentId?: string;
  title?: string;
  tags?: string[];
}

export interface RegeneratePosterPayload {
  style?: PosterStyle;
  size?: PosterSize;
  format?: PosterFormat;
  templateId?: string;
  contentId?: string;
  title?: string;
}

export interface SavePosterEditPayload {
  svg: string;
  editState?: unknown;
  saveAsNew?: boolean;
}

export interface PosterListQuery {
  ownerId: string;
  productId?: string;
  storeId?: string;
  generationStatus?: GenerationStatus;
  size?: PosterSize;
  format?: PosterFormat;
  isFavourited?: boolean;
  isPublic?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedPosters {
  posters: IPosterDocument[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface PreviewResult {
  posterId: string;
  previewUrl: string;
  expiresAt: Date;
  isCompleted: boolean;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const PREVIEW_TTL_SECONDS = 3600;
const EDIT_WINDOW_DAYS = 5;
const CONTENT_TYPE_PREFERENCE: ContentType[] = [
  ContentType.MARKETING_COPY,
  ContentType.HEADLINE,
  ContentType.PRODUCT_DESCRIPTION,
  ContentType.TAGLINE,
];
const posterGenerationService = createDefaultPosterGenerationService();
const editRenderer = new DefaultSharpRenderer();
const posterInclude = {
  exports: true,
  product: { include: { store: true } },
  generatedContent: {
    include: { product: true, posters: { select: { id: true } } },
  },
  store: true,
} as const;

function getEditableUntil(poster: Pick<IPosterDocument, 'createdAt' | 'editableUntil'>): Date {
  return poster.editableUntil ?? new Date(poster.createdAt.getTime() + EDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

function assertPosterEditable(poster: IPosterDocument): void {
  const editableUntil = getEditableUntil(poster);
  if (editableUntil.getTime() <= Date.now()) {
    throw new ValidationError(
      `This poster can no longer be edited. Editing expired on ${editableUntil.toISOString()}.`
    );
  }
}

function assertEditableSvg(svg: string): void {
  const trimmed = svg.trim();
  if (!trimmed.startsWith('<svg') || !trimmed.endsWith('</svg>')) {
    throw new ValidationError('Edited poster payload must be a complete SVG document.');
  }
  if (!trimmed.includes('data-editor-layer="true"')) {
    throw new ValidationError('Edited poster SVG does not contain renderer edit layers.');
  }
}

function parsePromptSnapshot(snapshot?: string): Record<string, unknown> {
  if (!snapshot) return {};
  try {
    const parsed = JSON.parse(snapshot);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function buildEditedSnapshot(input: {
  poster: IPosterDocument;
  svg: string;
  editState?: unknown;
  ownerId: string;
  saveAsNew: boolean;
}): string {
  const snapshot = parsePromptSnapshot(input.poster.promptSnapshot);
  const previousHistory = Array.isArray(snapshot['editHistory'])
    ? snapshot['editHistory']
    : [];
  const editHistory = [
    ...previousHistory.slice(-19),
    {
      editedAt: new Date().toISOString(),
      editedBy: input.ownerId,
      mode: input.saveAsNew ? 'save_as_new' : 'overwrite',
    },
  ];

  return JSON.stringify({
    ...snapshot,
    editableSvg: input.svg,
    editState: input.editState ?? snapshot['editState'],
    editHistory,
  });
}

async function loadOwnedProduct(
  productId: string,
  ownerId: string
): Promise<IProductDocument> {
  return getProductById(productId, ownerId);
}

async function loadOwnedPoster(
  posterId: string,
  ownerId: string
): Promise<IPosterDocument> {
  if (!isValidId(posterId)) throw new ValidationError('Invalid poster ID format.');
  const poster = await prisma.poster.findUnique({
    where: { id: posterId },
    include: posterInclude,
  });
  if (!poster) throw new NotFoundError('Poster');
  if (poster.ownerId !== ownerId) {
    throw new ForbiddenError('You do not have permission to access this poster.');
  }
  return mapPoster(poster);
}

async function resolveContent(
  product: IProductDocument,
  ownerId: string,
  contentId?: string
): Promise<IGeneratedContentDocument> {
  if (contentId) {
    const content = await getContentById(contentId, ownerId);
    const contentProductId =
      typeof content.product === 'string' ? content.product : content.product._id;
    if (contentProductId !== product._id) {
      throw new ValidationError('Generated content does not belong to the requested product.');
    }
    if (
      content.status !== ContentStatus.COMPLETED &&
      content.status !== ContentStatus.APPROVED
    ) {
      throw new ValidationError(
        `Content record must be completed or approved before use. Current status: "${content.status}".`
      );
    }
    return content;
  }

  const latest = await getLatestContentByProduct(product._id, ownerId);
  for (const status of [ContentStatus.APPROVED, ContentStatus.COMPLETED]) {
    for (const type of CONTENT_TYPE_PREFERENCE) {
      if (latest[type]?.status === status) return latest[type]!;
    }
  }
  const fallback = Object.values(latest).find(
    (content) =>
      content?.status === ContentStatus.COMPLETED ||
      content?.status === ContentStatus.APPROVED
  );
  if (!fallback) {
    throw new ValidationError(
      'No completed generated content found for this product. Please generate content before creating a poster.'
    );
  }
  return fallback;
}

function resolveTemplate(
  style: PosterStyle,
  size: PosterSize,
  templateId?: string
): LegacyPosterTemplate {
  if (!templateId) return selectTemplate(style, size);
  const template = getTemplateById(templateId);
  if (!template) throw new ValidationError(`Template "${templateId}" not found.`);
  const validation = validateTemplate(template, size);
  if (!validation.valid) {
    throw new ValidationError(
      `Template "${templateId}" is not compatible with size "${size}": ${validation.errors.join('; ')}`
    );
  }
  return template;
}

function toEngineTemplate(
  template: LegacyPosterTemplate,
  size: PosterSize
): EnginePosterTemplate {
  const dimensions = resolveDimensions(size);
  const components: Array<
    | BackgroundComponent
    | ProductImageComponent
    | HeadlineComponent
    | DescriptionComponent
    | DiscountBadgeComponent
    | PriceComponent
    | CTAComponent
  > = [
    new BackgroundComponent({
      id: `${template.id}-background`,
      bounds: { x: 0, y: 0, width: 1, height: 1, unit: 'percent' },
      zIndex: 0,
      required: true,
      props: {
        style: {
          backgroundColor: template.backgroundColor,
          borderColor: template.showBorder ? template.borderColor : undefined,
          borderWidth: template.showBorder ? template.borderWidthPx : undefined,
        },
      },
    }),
  ];

  template.imageLayers.forEach((layer, index) => {
    if (layer.role !== 'product_image') return;
    components.push(
      new ProductImageComponent({
        id: `${template.id}-product-${index}`,
        bounds: {
          x: layer.x,
          y: layer.y,
          width: layer.width,
          height: layer.height,
          unit: 'percent',
        },
        zIndex: 10 + index,
        required: true,
        props: {
          dataKey: 'product.image',
          style: {
            objectFit: 'contain',
            borderRadius: layer.borderRadius,
            opacity: layer.opacity === undefined ? undefined : layer.opacity / 100,
          },
        },
      })
    );
  });

  template.textLayers.forEach((layer, index) => {
    const baseConfig = {
      id: `${template.id}-${layer.role}-${index}`,
      bounds: {
        x: layer.x,
        y: layer.y,
        width: layer.width,
        height: layer.maxHeight,
        unit: 'percent' as const,
      },
      zIndex: 100 + index,
      alignment: { horizontal: layer.align, vertical: 'middle' as const },
    };
    const textStyle = {
      color: layer.color,
      fontFamily: layer.fontFamily,
      fontSize: layer.fontSize,
      fontWeight: layer.fontWeight,
      lineHeight: layer.fontSize * 1.2,
    };
    if (layer.role === 'headline') {
      components.push(
        new HeadlineComponent({
          ...baseConfig,
          props: { dataKey: 'headline', maxLines: 3, textStyle },
        })
      );
    } else if (layer.role === 'description') {
      components.push(
        new DescriptionComponent({
          ...baseConfig,
          props: { dataKey: 'description', maxLines: 4, textStyle },
        })
      );
    } else if (layer.role === 'price') {
      components.push(
        new PriceComponent({
          ...baseConfig,
          style: template.showPriceBadge
            ? { backgroundColor: template.priceBadgeColor, borderRadius: 8 }
            : undefined,
          props: { dataKey: 'price', showCompareAtPrice: true, textStyle },
        })
      );
    } else if (layer.role === 'cta') {
      components.push(
        new CTAComponent({
          ...baseConfig,
          style: { backgroundColor: template.accentColor, borderRadius: 8 },
          props: { dataKey: 'cta', defaultText: 'Shop Now', textStyle },
        })
      );
    }
  });

  components.push(
    new DiscountBadgeComponent({
      id: `${template.id}-discount-badge`,
      bounds: { x: 0.78, y: 0.08, width: 0.17, height: 0.09, unit: 'percent' },
      zIndex: 140,
      alignment: { horizontal: 'center', vertical: 'middle' },
      style: {
        backgroundColor: template.accentColor,
        borderColor: 'rgba(255,255,255,0.45)',
        borderWidth: 1.5,
        borderRadius: 999,
      },
      props: {
        dataKey: 'promotion.discountPercent',
        suffix: '% OFF',
        textStyle: {
          color: '#FFFFFF',
          fontFamily: 'Arial, sans-serif',
          fontSize: 20,
          fontWeight: 'bold',
        },
      },
    })
  );

  return {
    id: template.id,
    name: template.name,
    version: '1.0.0',
    description: template.description,
    dimensions: { ...dimensions, unit: 'px' },
    components: components as unknown as EnginePosterTemplate['components'],
    metadata: {
      style: template.style,
      supportedSizes: template.supportedSizes,
      source: 'template-service',
    },
  };
}

export async function generatePoster(
  productId: string,
  ownerId: string,
  payload: GeneratePosterPayload
): Promise<IPosterDocument> {
  const product = await loadOwnedProduct(productId, ownerId);
  if (product.images.length === 0) {
    throw new ValidationError(
      'Product has no images. Upload at least one product image before generating a poster.'
    );
  }
  const content = await resolveContent(product, ownerId, payload.contentId);
  const template = resolveTemplate(payload.style, payload.size, payload.templateId);
  const result = await posterGenerationService.generateFromTemplate({
    productId,
    ownerId,
    contentId: content._id,
    template: toEngineTemplate(template, payload.size),
    title: payload.title,
    tags: payload.tags,
    size: payload.size,
  });
  if (!result.poster) {
    throw new ValidationError('Poster generation completed without a persisted poster record.');
  }
  const updated = await prisma.poster.update({
    where: { id: result.poster._id },
    data: { format: payload.format as unknown as PrismaPosterFormat },
    include: posterInclude,
  });
  return mapPoster(updated);
}

export async function regeneratePoster(
  posterId: string,
  ownerId: string,
  payload: RegeneratePosterPayload
): Promise<IPosterDocument> {
  const original = await loadOwnedPoster(posterId, ownerId);
  assertPosterEditable(original);
  const productId =
    typeof original.product === 'string' ? original.product : original.product._id;
  const product = await loadOwnedProduct(productId, ownerId);
  const size = payload.size ?? original.size;
  const content = await resolveContent(product, ownerId, payload.contentId);
  const template = resolveTemplate(
    payload.style ?? PosterStyle.MODERN,
    size,
    payload.templateId
  );
  const result = await posterGenerationService.generateFromTemplate({
    productId,
    ownerId,
    contentId: content._id,
    template: toEngineTemplate(template, size),
    title: payload.title ?? original.title,
    tags: original.tags,
    size,
  });
  if (!result.poster) {
    throw new ValidationError('Poster regeneration completed without a persisted poster record.');
  }
  const updated = await prisma.poster.update({
    where: { id: result.poster._id },
    data: {
      format: (payload.format ?? original.format) as unknown as PrismaPosterFormat,
      parentPosterId: original._id,
    },
    include: posterInclude,
  });
  return mapPoster(updated);
}

export async function savePosterEdit(
  posterId: string,
  ownerId: string,
  payload: SavePosterEditPayload
): Promise<IPosterDocument> {
  const original = await loadOwnedPoster(posterId, ownerId);
  assertPosterEditable(original);
  assertEditableSvg(payload.svg);

  if (!original.storageMetadata) {
    throw new ValidationError('Poster storage metadata is missing. The poster may need to be regenerated.');
  }

  const pngBuffer = await editRenderer.renderPng(payload.svg);
  const storage = getPosterOutputStorage(original.storageMetadata.provider);
  const productId = typeof original.product === 'string' ? original.product : original.product._id;
  const generatedContentId =
    typeof original.generatedContent === 'string'
      ? original.generatedContent
      : original.generatedContent._id;
  const storeId = typeof original.store === 'string' ? original.store : original.store._id;
  const saveAsNew = Boolean(payload.saveAsNew);
  const targetPosterId = saveAsNew ? randomUUID() : original._id;
  const uploaded = await storage.storePng({
    buffer: pngBuffer,
    ownerId,
    productId,
    posterId: targetPosterId,
    filename: `poster_${targetPosterId}_edit_${Date.now()}`,
  });
  const snapshot = buildEditedSnapshot({
    poster: original,
    svg: payload.svg,
    editState: payload.editState,
    ownerId,
    saveAsNew,
  });

  if (saveAsNew) {
    const createdAt = new Date();
    const created = await prisma.poster.create({
      data: {
        id: targetPosterId,
        productId,
        generatedContentId,
        storeId,
        ownerId,
        generationStatus: PrismaGenerationStatus.completed,
        generationStartedAt: createdAt,
        generationCompletedAt: createdAt,
        posterUrl: uploaded.publicUrl,
        storageProvider: uploaded.storageMetadata.provider,
        storagePublicId: uploaded.storageMetadata.publicId,
        storageBucket: uploaded.storageMetadata.bucket,
        storageFolder: uploaded.storageMetadata.folder,
        storageVersion: uploaded.storageMetadata.version,
        storageEtag: uploaded.storageMetadata.etag,
        storageBytes: uploaded.storageMetadata.bytes,
        storageResourceType: uploaded.storageMetadata.resourceType,
        width: original.dimensions.width,
        height: original.dimensions.height,
        dimensionUnit: original.dimensions.unit,
        format: original.format as unknown as PrismaPosterFormat,
        size: original.size as unknown as PrismaPosterSize,
        generationDurationMs: 0,
        uploadDurationMs: 0,
        generationRetryCount: 0,
        generationEstimatedCostUsd: 0,
        promptSnapshot: snapshot,
        isPublic: original.isPublic,
        isFavourited: false,
        tags: original.tags,
        title: original.title,
        version: 1,
        parentPosterId: original._id,
        createdAt,
        editableUntil: new Date(createdAt.getTime() + EDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000),
      },
      include: posterInclude,
    });
    return mapPoster(created);
  }

  const updated = await prisma.poster.update({
    where: { id: original._id },
    data: {
      posterUrl: uploaded.publicUrl,
      storageProvider: uploaded.storageMetadata.provider,
      storagePublicId: uploaded.storageMetadata.publicId,
      storageBucket: uploaded.storageMetadata.bucket,
      storageFolder: uploaded.storageMetadata.folder,
      storageVersion: uploaded.storageMetadata.version,
      storageEtag: uploaded.storageMetadata.etag,
      storageBytes: uploaded.storageMetadata.bytes,
      storageResourceType: uploaded.storageMetadata.resourceType,
      promptSnapshot: snapshot,
    },
    include: posterInclude,
  });

  return mapPoster(updated);
}

export async function getPosterById(
  posterId: string,
  ownerId: string
): Promise<IPosterDocument> {
  return loadOwnedPoster(posterId, ownerId);
}

export async function getPostersByProduct(
  productId: string,
  ownerId: string
): Promise<IPosterDocument[]> {
  await loadOwnedProduct(productId, ownerId);
  const posters = await prisma.poster.findMany({
    where: { productId, ownerId },
    include: posterInclude,
    orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
  });
  return posters.map(mapPoster);
}

export async function listPosters(query: PosterListQuery): Promise<PaginatedPosters> {
  if (query.productId && !isValidId(query.productId)) {
    throw new ValidationError('Invalid product ID format.');
  }
  if (query.storeId && !isValidId(query.storeId)) {
    throw new ValidationError('Invalid store ID format.');
  }
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));
  const where: Prisma.PosterWhereInput = {
    ownerId: query.ownerId,
    ...(query.productId && { productId: query.productId }),
    ...(query.storeId && { storeId: query.storeId }),
    ...(query.generationStatus && {
      generationStatus:
        query.generationStatus as unknown as PrismaGenerationStatus,
    }),
    ...(query.size && { size: query.size as unknown as PrismaPosterSize }),
    ...(query.format && {
      format: query.format as unknown as PrismaPosterFormat,
    }),
    ...(query.isFavourited !== undefined && {
      isFavourited: query.isFavourited,
    }),
    ...(query.isPublic !== undefined && { isPublic: query.isPublic }),
  };
  const [total, posters] = await prisma.$transaction([
    prisma.poster.count({ where }),
    prisma.poster.findMany({
      where,
      include: posterInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  const totalPages = Math.ceil(total / limit);
  return {
    posters: posters.map(mapPoster),
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

export async function previewPoster(
  posterId: string,
  ownerId: string
): Promise<PreviewResult> {
  const poster = await loadOwnedPoster(posterId, ownerId);
  if (!poster.isCompleted || !poster.storageMetadata) {
    throw new ValidationError('Poster preview is only available for completed posters.');
  }
  return {
    posterId,
    previewUrl: getPosterOutputStorage(
      poster.storageMetadata.provider
    ).getPreviewUrl({
      publicId: poster.storageMetadata.publicId,
      publicUrl: poster.posterUrl,
    }),
    expiresAt: new Date(Date.now() + PREVIEW_TTL_SECONDS * 1000),
    isCompleted: true,
  };
}

export async function deletePoster(
  posterId: string,
  ownerId: string
): Promise<void> {
  const poster = await loadOwnedPoster(posterId, ownerId);
  if (poster.generationStatus === GenerationStatus.PROCESSING) {
    throw new ValidationError('Cannot delete a poster while generation is in progress.');
  }
  if (poster.storageMetadata) {
    await getPosterOutputStorage(poster.storageMetadata.provider).delete({
      publicId: poster.storageMetadata.publicId,
      publicUrl: poster.posterUrl,
    });
  }
  await prisma.poster.delete({ where: { id: posterId } });
}

export async function toggleFavourite(
  posterId: string,
  ownerId: string
): Promise<IPosterDocument> {
  const poster = await loadOwnedPoster(posterId, ownerId);
  const updated = await prisma.poster.update({
    where: { id: posterId },
    data: { isFavourited: !poster.isFavourited },
    include: posterInclude,
  });
  return mapPoster(updated);
}

export async function exportPoster(
  posterId: string,
  ownerId: string,
  format: PosterFormat,
  ip?: string
): Promise<{ downloadUrl: string; filename: string; format: PosterFormat }> {
  const { exportPoster: exportFromService } = await import('./export.service');
  const result = await exportFromService({ posterId, ownerId, format, ip });
  return {
    downloadUrl: result.downloadUrl,
    filename: result.filename,
    format: result.format,
  };
}
