import {
  AIModel as PrismaAIModel,
  ContentStatus as PrismaContentStatus,
  ContentType as PrismaContentType,
  Prisma,
} from '@prisma/client';
import { mapGeneratedContent } from '../database/mappers';
import prisma from '../database/prisma';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../middleware/errorMiddleware';
import {
  ContentLanguage,
  ContentStatus,
  ContentType,
  IContentVariant,
  IGeneratedContentDocument,
  IGenerationMetrics,
  IPromptConfig,
} from '../models/GeneratedContent';
import { IProductDocument } from '../models/Product';
import { isValidId } from '../utils/id';
import ContentProviderFactory from './content/ContentProviderFactory';
import type { ChatCompletionResult } from './openai.service';
import {
  buildPrompt,
  ContentTone,
  parseVariants,
  PosterStyle,
  PromptBuildOptions,
} from './promptBuilder.service';
import { getProductById } from './product.service';

export interface GenerateContentPayload {
  contentType: ContentType;
  style: PosterStyle;
  tone: ContentTone;
  language: ContentLanguage;
  variantCount: number;
  customInstructions?: string;
  discountPercent?: number;
  callToActionText?: string;
}

export interface GenerateAllPayload {
  style: PosterStyle;
  tone: ContentTone;
  language: ContentLanguage;
  variantCount: number;
  customInstructions?: string;
  discountPercent?: number;
  callToActionText?: string;
}

export interface ContentHistoryQuery {
  ownerId: string;
  productId?: string;
  storeId?: string;
  contentType?: ContentType;
  status?: ContentStatus;
  page?: number;
  limit?: number;
}

export interface PaginatedContentHistory {
  records: IGeneratedContentDocument[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface GenerationSummary {
  contentId: string;
  contentType: ContentType;
  status: ContentStatus;
  variantCount: number;
  selectedText: string | null;
  version: number;
  metrics?: IGenerationMetrics;
  createdAt: Date;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const ALL_CONTENT_TYPES: ContentType[] = [
  ContentType.HEADLINE,
  ContentType.TAGLINE,
  ContentType.CALL_TO_ACTION,
  ContentType.PRODUCT_DESCRIPTION,
  ContentType.MARKETING_COPY,
  ContentType.IMAGE_PROMPT,
];

const contentInclude = {
  product: true,
  posters: { select: { id: true } },
} as const;

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toPrismaModel(model: string): PrismaAIModel {
  return model.replace(/-/g, '_') as PrismaAIModel;
}

function getStoreId(product: IProductDocument): string {
  return typeof product.store === 'string' ? product.store : product.store._id;
}

async function generateWithSelectedProvider(
  product: IProductDocument,
  options: PromptBuildOptions,
  promptConfig: IPromptConfig
): Promise<ChatCompletionResult> {
  return ContentProviderFactory.getProvider().generateContent({
    product,
    options,
    promptConfig,
  });
}

async function loadOwnedProduct(
  productId: string,
  ownerId: string
): Promise<IProductDocument> {
  return getProductById(productId, ownerId);
}

async function loadOwnedContent(
  contentId: string,
  ownerId: string
): Promise<IGeneratedContentDocument> {
  if (!isValidId(contentId)) throw new ValidationError('Invalid content ID format.');
  const content = await prisma.generatedContent.findUnique({
    where: { id: contentId },
    include: contentInclude,
  });
  if (!content) throw new NotFoundError('GeneratedContent');
  if (content.ownerId !== ownerId) {
    throw new ForbiddenError('You do not have permission to access this content.');
  }
  return mapGeneratedContent(content);
}

async function getNextVersion(
  productId: string,
  contentType: ContentType
): Promise<number> {
  const result = await prisma.generatedContent.aggregate({
    where: {
      productId,
      contentType: contentType as unknown as PrismaContentType,
    },
    _max: { version: true },
  });
  return (result._max.version ?? 0) + 1;
}

async function runGeneration(
  product: IProductDocument,
  options: PromptBuildOptions,
  version: number
): Promise<IGeneratedContentDocument> {
  const { promptConfig, contextKeywords } = buildPrompt(product, options);
  const pending = await prisma.generatedContent.create({
    data: {
      contentType: options.contentType as unknown as PrismaContentType,
      status: PrismaContentStatus.pending,
      language: options.language,
      productName: product.name,
      productDescription: product.description,
      productPrice: product.price,
      productCurrency: product.currency,
      contextKeywords,
      systemPrompt: promptConfig.systemPrompt,
      userPrompt: promptConfig.userPrompt,
      temperature: promptConfig.temperature,
      maxTokens: promptConfig.maxTokens,
      topP: promptConfig.topP,
      frequencyPenalty: promptConfig.frequencyPenalty,
      presencePenalty: promptConfig.presencePenalty,
      model: toPrismaModel(promptConfig.model),
      variants: [],
      productId: product._id,
      storeId: getStoreId(product),
      ownerId: product.owner,
      version,
    },
  });
  await prisma.generatedContent.update({
    where: { id: pending.id },
    data: { status: PrismaContentStatus.generating, errorMessage: null },
  });

  try {
    const result = await generateWithSelectedProvider(product, options, promptConfig);
    const variants: IContentVariant[] = parseVariants(
      result.texts,
      options.variantCount
    ).map((text, variantIndex) => ({
      variantIndex,
      index: variantIndex,
      text,
      isSelected: variantIndex === 0,
    }));
    const metrics: IGenerationMetrics = { ...result.metrics, retryCount: 0 };

    const completed = await prisma.generatedContent.update({
      where: { id: pending.id },
      data: {
        status: PrismaContentStatus.completed,
        variants: asJson(variants),
        selectedVariantIndex: variants.length > 0 ? 0 : null,
        promptTokens: metrics.promptTokens,
        completionTokens: metrics.completionTokens,
        totalTokens: metrics.totalTokens,
        generationDurationMs: metrics.generationDurationMs,
        estimatedCostUsd: metrics.estimatedCostUsd,
        retryCount: metrics.retryCount,
        errorMessage: null,
        failedAt: null,
      },
      include: contentInclude,
    });
    return mapGeneratedContent(completed);
  } catch (error) {
    await prisma.generatedContent.update({
      where: { id: pending.id },
      data: {
        status: PrismaContentStatus.failed,
        errorMessage: error instanceof Error ? error.message : String(error),
        failedAt: new Date(),
      },
    });
    throw error;
  }
}

export async function generateContent(
  productId: string,
  ownerId: string,
  payload: GenerateContentPayload
): Promise<IGeneratedContentDocument> {
  const product = await loadOwnedProduct(productId, ownerId);
  if (
    payload.contentType === ContentType.PROMOTIONAL_TEXT &&
    !payload.discountPercent
  ) {
    throw new ValidationError(
      'discountPercent is required when generating promotional_text content.'
    );
  }
  return runGeneration(
    product,
    {
      ...payload,
      variantCount: Math.max(1, Math.min(payload.variantCount, 5)),
    },
    await getNextVersion(product._id, payload.contentType)
  );
}

export async function generateAllContent(
  productId: string,
  ownerId: string,
  payload: GenerateAllPayload
): Promise<GenerationSummary[]> {
  const product = await loadOwnedProduct(productId, ownerId);
  const results: GenerationSummary[] = [];

  for (const contentType of ALL_CONTENT_TYPES) {
    const version = await getNextVersion(product._id, contentType);
    try {
      const record = await runGeneration(
        product,
        {
          ...payload,
          contentType,
          variantCount: Math.max(1, Math.min(payload.variantCount, 5)),
        },
        version
      );
      results.push({
        contentId: record._id,
        contentType: record.contentType,
        status: record.status,
        variantCount: record.variants.length,
        selectedText: record.selectedText,
        version: record.version,
        metrics: record.metrics,
        createdAt: record.createdAt,
      });
    } catch (error) {
      console.error(
        `[GeneratedContentService] Failed to generate ${contentType}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      results.push({
        contentId: '',
        contentType,
        status: ContentStatus.FAILED,
        variantCount: 0,
        selectedText: null,
        version,
        createdAt: new Date(),
      });
    }
  }
  return results;
}

export async function regenerateContent(
  generatedContentId: string,
  ownerId: string,
  payload: Omit<GenerateContentPayload, 'contentType'>
): Promise<IGeneratedContentDocument> {
  if (!isValidId(generatedContentId)) {
    throw new ValidationError('Invalid content ID format.');
  }

  const existing = await prisma.generatedContent.findUnique({
    where: { id: generatedContentId },
    include: contentInclude,
  });
  if (!existing) throw new NotFoundError('GeneratedContent');
  if (existing.ownerId !== ownerId) {
    throw new ForbiddenError('You do not have permission to regenerate this content.');
  }

  const contentType = existing.contentType as unknown as ContentType;
  if (contentType === ContentType.PROMOTIONAL_TEXT && !payload.discountPercent) {
    throw new ValidationError(
      'discountPercent is required when regenerating promotional_text content.'
    );
  }

  const product = await loadOwnedProduct(existing.productId, ownerId);
  const options: PromptBuildOptions = {
    ...payload,
    contentType,
    variantCount: Math.max(1, Math.min(payload.variantCount, 5)),
  };
  const { promptConfig, contextKeywords } = buildPrompt(product, options);

  await prisma.generatedContent.update({
    where: { id: generatedContentId },
    data: {
      status: PrismaContentStatus.generating,
      language: options.language,
      productName: product.name,
      productDescription: product.description,
      productPrice: product.price,
      productCurrency: product.currency,
      contextKeywords,
      systemPrompt: promptConfig.systemPrompt,
      userPrompt: promptConfig.userPrompt,
      temperature: promptConfig.temperature,
      maxTokens: promptConfig.maxTokens,
      topP: promptConfig.topP,
      frequencyPenalty: promptConfig.frequencyPenalty,
      presencePenalty: promptConfig.presencePenalty,
      model: toPrismaModel(promptConfig.model),
      variants: [],
      selectedVariantIndex: null,
      rawOutput: null,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      generationDurationMs: null,
      estimatedCostUsd: null,
      retryCount: null,
      errorMessage: null,
      failedAt: null,
    },
  });

  try {
    const result = await generateWithSelectedProvider(product, options, promptConfig);
    const variants: IContentVariant[] = parseVariants(
      result.texts,
      options.variantCount
    ).map((text, variantIndex) => ({
      variantIndex,
      index: variantIndex,
      text,
      isSelected: variantIndex === 0,
    }));
    const metrics: IGenerationMetrics = { ...result.metrics, retryCount: 0 };

    const updated = await prisma.generatedContent.update({
      where: { id: generatedContentId },
      data: {
        status: PrismaContentStatus.completed,
        variants: asJson(variants),
        selectedVariantIndex: variants.length > 0 ? 0 : null,
        promptTokens: metrics.promptTokens,
        completionTokens: metrics.completionTokens,
        totalTokens: metrics.totalTokens,
        generationDurationMs: metrics.generationDurationMs,
        estimatedCostUsd: metrics.estimatedCostUsd,
        retryCount: metrics.retryCount,
        errorMessage: null,
        failedAt: null,
      },
      include: contentInclude,
    });
    return mapGeneratedContent(updated);
  } catch (error) {
    await prisma.generatedContent.update({
      where: { id: generatedContentId },
      data: {
        status: PrismaContentStatus.failed,
        errorMessage: error instanceof Error ? error.message : String(error),
        failedAt: new Date(),
      },
    });
    throw error;
  }
}

export async function selectVariant(
  contentId: string,
  ownerId: string,
  variantIndex: number
): Promise<IGeneratedContentDocument> {
  const content = await loadOwnedContent(contentId, ownerId);
  if (content.status === ContentStatus.GENERATING) {
    throw new ValidationError('Cannot select a variant while generation is in progress.');
  }
  if (
    content.status !== ContentStatus.COMPLETED &&
    content.status !== ContentStatus.APPROVED
  ) {
    throw new ValidationError(
      `Cannot select a variant on a record with status "${content.status}".`
    );
  }
  if (variantIndex < 0 || variantIndex >= content.variants.length) {
    throw new ValidationError(`Variant index ${variantIndex} is out of range.`);
  }

  const variants = content.variants.map((variant, index) => ({
    ...variant,
    variantIndex: index,
    index,
    isSelected: index === variantIndex,
  }));
  const updated = await prisma.generatedContent.update({
    where: { id: contentId },
    data: {
      variants: asJson(variants),
      selectedVariantIndex: variantIndex,
      status: PrismaContentStatus.approved,
    },
    include: contentInclude,
  });
  return mapGeneratedContent(updated);
}

export async function getContentById(
  contentId: string,
  ownerId: string
): Promise<IGeneratedContentDocument> {
  return loadOwnedContent(contentId, ownerId);
}

export async function getContentByProduct(
  productId: string,
  ownerId: string,
  contentType?: ContentType
): Promise<IGeneratedContentDocument[]> {
  if (!isValidId(productId)) throw new ValidationError('Invalid product ID format.');
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { ownerId: true },
  });
  if (!product) throw new NotFoundError('Product');
  if (product.ownerId !== ownerId) {
    throw new ForbiddenError('You do not have permission to view content for this product.');
  }

  const records = await prisma.generatedContent.findMany({
    where: {
      productId,
      ownerId,
      ...(contentType && {
        contentType: contentType as unknown as PrismaContentType,
      }),
    },
    include: contentInclude,
    orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
  });
  return records.map(mapGeneratedContent);
}

export async function getLatestContentByProduct(
  productId: string,
  ownerId: string
): Promise<Record<ContentType, IGeneratedContentDocument | null>> {
  const records = await getContentByProduct(productId, ownerId);
  return Object.values(ContentType).reduce(
    (result, type) => {
      result[type] = records.find((record) => record.contentType === type) ?? null;
      return result;
    },
    {} as Record<ContentType, IGeneratedContentDocument | null>
  );
}

export async function getContentHistory(
  query: ContentHistoryQuery
): Promise<PaginatedContentHistory> {
  if (query.productId && !isValidId(query.productId)) {
    throw new ValidationError('Invalid product ID format.');
  }
  if (query.storeId && !isValidId(query.storeId)) {
    throw new ValidationError('Invalid store ID format.');
  }
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));
  const where: Prisma.GeneratedContentWhereInput = {
    ownerId: query.ownerId,
    ...(query.productId && { productId: query.productId }),
    ...(query.storeId && { storeId: query.storeId }),
    ...(query.contentType && {
      contentType: query.contentType as unknown as PrismaContentType,
    }),
    ...(query.status && {
      status: query.status as unknown as PrismaContentStatus,
    }),
  };
  const [total, records] = await prisma.$transaction([
    prisma.generatedContent.count({ where }),
    prisma.generatedContent.findMany({
      where,
      include: contentInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  const totalPages = Math.ceil(total / limit);
  return {
    records: records.map(mapGeneratedContent),
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

export async function getUsageStats(
  ownerId: string,
  storeId?: string
): Promise<{ totalTokens: number; totalCostUsd: number; totalGenerations: number }> {
  if (storeId && !isValidId(storeId)) {
    throw new ValidationError('Invalid store ID format.');
  }
  const where: Prisma.GeneratedContentWhereInput = {
    ownerId,
    status: PrismaContentStatus.completed,
    ...(storeId && { storeId }),
  };
  const [stats, totalGenerations] = await Promise.all([
    prisma.generatedContent.aggregate({
      where,
      _sum: { totalTokens: true, estimatedCostUsd: true },
    }),
    prisma.generatedContent.count({ where }),
  ]);
  return {
    totalTokens: stats._sum.totalTokens ?? 0,
    totalCostUsd: stats._sum.estimatedCostUsd ?? 0,
    totalGenerations,
  };
}

export async function deleteContent(
  contentId: string,
  ownerId: string
): Promise<void> {
  const content = await loadOwnedContent(contentId, ownerId);
  if (
    content.status !== ContentStatus.FAILED &&
    content.status !== ContentStatus.REJECTED
  ) {
    throw new ValidationError(
      `Only failed or rejected content may be deleted. Current status: "${content.status}".`
    );
  }
  await prisma.generatedContent.delete({ where: { id: contentId } });
}
