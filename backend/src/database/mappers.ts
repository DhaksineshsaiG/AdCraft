import type {
  OAuthProviderAccount,
  Poster as PosterRecord,
  PosterExport,
  Prisma,
  Product as ProductRecord,
  RefreshToken,
  Store as StoreRecord,
  User as UserRecord,
} from '@prisma/client';
import {
  AIModel,
  ContentLanguage,
  ContentStatus,
  ContentType,
  IContentVariant,
  IGeneratedContentDocument,
  IGenerationMetrics as IContentGenerationMetrics,
} from '../models/GeneratedContent';
import {
  GenerationStatus,
  IExportRecord,
  IGenerationMetrics as IPosterGenerationMetrics,
  IPosterDocument,
  StorageProvider,
  PosterFormat,
  PosterSize,
} from '../models/Poster';
import {
  IProductDocument,
  IProductImage,
  IProductVariant,
  ProductProcessingStatus,
  ProductSource,
  ProductStatus,
} from '../models/Product';
import {
  IStoreDocument,
  StoreStatus,
  StoreType,
  SyncStatus,
} from '../models/Store';
import {
  AuthProvider,
  IUserDocument,
  SafeUser,
  UserRole,
  UserStatus,
} from '../models/User';

type UserWithRelations = UserRecord & {
  refreshTokens?: RefreshToken[];
  oauthProviders?: OAuthProviderAccount[];
  stores?: Array<{ id: string }>;
};

type ProductWithStore = ProductRecord & { store?: StoreRecord };

type ContentRecord = Prisma.GeneratedContentGetPayload<{
  include: {
    product: true;
    posters: { select: { id: true } };
  };
}>;

type ContentLike = Omit<ContentRecord, 'product' | 'posters'> & {
  product?: ProductRecord | ProductWithStore;
  posters?: Array<{ id: string }>;
};

type PosterLike = PosterRecord & {
  exports?: PosterExport[];
  product?: ProductRecord | ProductWithStore;
  generatedContent?: ContentLike;
  store?: StoreRecord;
};

function optional<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

function posterEditableUntil(record: PosterLike): Date {
  return record.editableUntil ?? new Date(record.createdAt.getTime() + 5 * 24 * 60 * 60 * 1000);
}

function jsonArray<T>(value: Prisma.JsonValue): T[] {
  return Array.isArray(value) ? (value as unknown as T[]) : [];
}

function cleanContentText(text: string): string {
  return text
    .replace(/^\s*(?:variant\s*\d+[:.)-]?|---\s*variant(?:\s*\d+)?\s*---)\s*/i, '')
    .trim();
}

function normalizeContentVariants(value: Prisma.JsonValue): IContentVariant[] {
  const variants = jsonArray<IContentVariant>(value);
  const normalized: IContentVariant[] = [];

  variants.forEach((variant) => {
    const rawText = variant.text ?? '';
    const parts = rawText
      .split(/---\s*VARIANT(?:\s*\d+)?\s*---/i)
      .map(cleanContentText)
      .filter(Boolean);

    if (parts.length > 1) {
      parts.forEach((text) => {
        normalized.push({
          ...variant,
          text,
          variantIndex: normalized.length,
          index: normalized.length,
          isSelected: normalized.length === (variant.variantIndex ?? variant.index ?? 0),
        });
      });
      return;
    }

    normalized.push({
      ...variant,
      text: cleanContentText(rawText),
      variantIndex: normalized.length,
      index: normalized.length,
    });
  });

  return normalized;
}

function mapAiModel(model: string): AIModel {
  const mapped = model.replace(/_/g, '-');
  return mapped as AIModel;
}

export function mapUser(record: UserWithRelations): IUserDocument {
  return {
    _id: record.id,
    id: record.id,
    name: record.name,
    email: record.email,
    password: optional(record.password),
    role: record.role as UserRole,
    status: record.status as UserStatus,
    avatarUrl: optional(record.avatarUrl),
    isEmailVerified: record.isEmailVerified,
    emailVerificationToken: optional(record.emailVerificationToken),
    emailVerificationTokenExpiresAt: optional(record.emailVerificationTokenExpiresAt),
    passwordResetToken: optional(record.passwordResetToken),
    passwordResetTokenExpiresAt: optional(record.passwordResetTokenExpiresAt),
    refreshTokens: (record.refreshTokens ?? []).map((token) => ({
      token: token.token,
      expiresAt: token.expiresAt,
      createdByIp: token.createdByIp,
      isRevoked: token.isRevoked,
      revokedAt: optional(token.revokedAt),
    })),
    oauthProviders: (record.oauthProviders ?? []).map((provider) => ({
      provider: provider.provider as AuthProvider,
      providerId: provider.providerId,
      accessToken: optional(provider.accessToken),
      refreshToken: optional(provider.refreshToken),
      tokenExpiresAt: optional(provider.tokenExpiresAt),
    })),
    notificationPreferences: {
      emailOnPosterGenerated: record.emailOnPosterGenerated,
      emailOnExportReady: record.emailOnExportReady,
      emailOnStoreConnected: record.emailOnStoreConnected,
      emailMarketing: record.emailMarketing,
    },
    lastLoginAt: optional(record.lastLoginAt),
    lastLoginIp: optional(record.lastLoginIp),
    loginCount: record.loginCount,
    stores: (record.stores ?? []).map((store) => store.id),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function toSafeUser(user: IUserDocument): SafeUser {
  const {
    password: _password,
    refreshTokens: _refreshTokens,
    emailVerificationToken: _emailVerificationToken,
    emailVerificationTokenExpiresAt: _emailVerificationTokenExpiresAt,
    passwordResetToken: _passwordResetToken,
    passwordResetTokenExpiresAt: _passwordResetTokenExpiresAt,
    ...safe
  } = user;
  return safe;
}

export function mapStore(record: StoreRecord): IStoreDocument {
  const shopifyConfig = record.shopifyShopDomain && record.shopifyAccessToken
    ? {
        shopDomain: record.shopifyShopDomain,
        accessToken: record.shopifyAccessToken,
        webhookSecret: optional(record.shopifyWebhookSecret),
        apiVersion: record.shopifyApiVersion ?? '2024-07',
        scopes: record.shopifyScopes,
      }
    : undefined;

  const wooCommerceConfig =
    record.wooStoreUrl && record.wooConsumerKey && record.wooConsumerSecret
      ? {
          storeUrl: record.wooStoreUrl,
          consumerKey: record.wooConsumerKey,
          consumerSecret: record.wooConsumerSecret,
          apiVersion: record.wooApiVersion ?? 'wc/v3',
        }
      : undefined;

  return {
    _id: record.id,
    id: record.id,
    name: record.name,
    slug: record.slug,
    description: optional(record.description),
    logoUrl: optional(record.logoUrl),
    type: record.type as StoreType,
    status: record.status as StoreStatus,
    shopifyConfig,
    wooCommerceConfig,
    owner: record.ownerId,
    syncState: {
      status: record.syncStatus as SyncStatus,
      lastSyncAt: optional(record.lastSyncAt),
      nextSyncAt: optional(record.nextSyncAt),
      totalProductsSynced: record.totalProductsSynced,
      lastError: optional(record.lastSyncError),
      syncDurationMs: optional(record.syncDurationMs),
    },
    usageStats: {
      totalProductsImported: record.totalProductsImported,
      totalPostersGenerated: record.totalPostersGenerated,
      totalExports: record.totalExports,
      lastActivityAt: optional(record.lastActivityAt),
    },
    posterDefaults: {
      templateId: optional(record.defaultTemplateId),
      brandColor: optional(record.brandColor),
      logoUrl: optional(record.defaultLogoUrl),
      fontFamily: optional(record.fontFamily),
      watermarkEnabled: record.watermarkEnabled,
      defaultLocale: record.defaultLocale,
      currency: record.currency,
    },
    isArchived: record.isArchived,
    archivedAt: optional(record.archivedAt),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function mapProduct(record: ProductRecord | ProductWithStore): IProductDocument {
  const images = jsonArray<IProductImage>(record.images);
  const variants = jsonArray<IProductVariant>(record.variants);
  const primaryImage =
    [...images].sort((a, b) => a.position - b.position)[0] ?? null;
  const cheapestVariant =
    variants.length > 0
      ? variants.reduce((lowest, variant) =>
          variant.price < lowest.price ? variant : lowest
        )
      : null;
  const withStore = record as ProductWithStore;

  return {
    _id: record.id,
    id: record.id,
    sourceId: record.sourceId,
    source: record.source as ProductSource,
    externalUrl: optional(record.externalUrl),
    name: record.name,
    description: optional(record.description),
    shortDescription: optional(record.shortDescription),
    sku: optional(record.sku),
    barcode: optional(record.barcode),
    price: record.price,
    compareAtPrice: optional(record.compareAtPrice),
    currency: record.currency,
    images,
    categories: record.categories,
    tags: record.tags,
    vendor: optional(record.vendor),
    productType: optional(record.productType),
    variants,
    hasVariants: record.hasVariants,
    dimensions: {
      weight: optional(record.weight),
      weightUnit: optional(record.weightUnit),
      length: optional(record.length),
      width: optional(record.width),
      height: optional(record.height),
      dimensionUnit: optional(record.dimensionUnit),
    },
    status: record.status as ProductStatus,
    processingMetadata: {
      status: record.processingStatus as ProductProcessingStatus,
      processedAt: optional(record.processedAt),
      processingError: optional(record.processingError),
      aiSummary: optional(record.aiSummary),
      keywords: record.keywords,
      processingDurationMs: optional(record.processingDurationMs),
    },
    store: withStore.store ? mapStore(withStore.store) : record.storeId,
    owner: record.ownerId,
    sourceCreatedAt: optional(record.sourceCreatedAt),
    sourceUpdatedAt: optional(record.sourceUpdatedAt),
    lastSyncedAt: record.lastSyncedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    primaryImage,
    cheapestVariant,
  };
}

export function mapGeneratedContent(record: ContentLike): IGeneratedContentDocument {
  const variants = normalizeContentVariants(record.variants);
  const selectedText =
    record.selectedVariantIndex === null
      ? optional(record.rawOutput) ? cleanContentText(record.rawOutput!) : record.rawOutput
      : variants[record.selectedVariantIndex ?? -1]?.text ??
        (record.rawOutput ? cleanContentText(record.rawOutput) : record.rawOutput);

  const metrics: IContentGenerationMetrics | undefined =
    record.promptTokens !== null &&
    record.completionTokens !== null &&
    record.totalTokens !== null &&
    record.generationDurationMs !== null &&
    record.estimatedCostUsd !== null
      ? {
          promptTokens: record.promptTokens,
          completionTokens: record.completionTokens,
          totalTokens: record.totalTokens,
          generationDurationMs: record.generationDurationMs,
          estimatedCostUsd: record.estimatedCostUsd,
          retryCount: record.retryCount ?? 0,
        }
      : undefined;

  return {
    _id: record.id,
    id: record.id,
    contentType: record.contentType as ContentType,
    status: record.status as ContentStatus,
    language: record.language as ContentLanguage,
    productName: record.productName,
    productDescription: optional(record.productDescription),
    productPrice: optional(record.productPrice),
    productCurrency: optional(record.productCurrency),
    contextKeywords: record.contextKeywords,
    promptConfig: {
      systemPrompt: record.systemPrompt,
      userPrompt: record.userPrompt,
      temperature: record.temperature,
      maxTokens: record.maxTokens,
      topP: optional(record.topP),
      frequencyPenalty: optional(record.frequencyPenalty),
      presencePenalty: optional(record.presencePenalty),
      model: mapAiModel(record.model),
    },
    variants,
    selectedVariantIndex: optional(record.selectedVariantIndex),
    selectedText: selectedText ?? null,
    rawOutput: optional(record.rawOutput),
    errorMessage: optional(record.errorMessage),
    failedAt: optional(record.failedAt),
    metrics,
    product: record.product ? mapProduct(record.product) : record.productId,
    store: record.storeId,
    owner: record.ownerId,
    usage: {
      posterIds: (record.posters ?? []).map((poster) => poster.id),
      useCount: record.useCount,
    },
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function mapPoster(record: PosterLike): IPosterDocument {
  const editableUntil = posterEditableUntil(record);
  const storageMetadata =
    record.storageProvider && record.storagePublicId
      ? {
          provider: record.storageProvider as StorageProvider,
          publicId: record.storagePublicId,
          bucket: optional(record.storageBucket),
          folder: optional(record.storageFolder),
          version: optional(record.storageVersion),
          etag: optional(record.storageEtag),
          bytes: optional(record.storageBytes),
          resourceType: optional(record.storageResourceType),
        }
      : undefined;

  const generationMetrics: IPosterGenerationMetrics | undefined =
    record.generationDurationMs !== null ||
    record.dalleRequestDurationMs !== null ||
    record.uploadDurationMs !== null ||
    record.generationEstimatedCostUsd !== null
      ? {
          generationDurationMs: optional(record.generationDurationMs),
          dalleRequestDurationMs: optional(record.dalleRequestDurationMs),
          uploadDurationMs: optional(record.uploadDurationMs),
          retryCount: record.generationRetryCount,
          dalleModel: optional(record.dalleModel),
          dalleQuality: optional(record.dalleQuality) as 'standard' | 'hd' | undefined,
          dalleStyle: optional(record.dalleStyle) as 'vivid' | 'natural' | undefined,
          estimatedCostUsd: optional(record.generationEstimatedCostUsd),
        }
      : undefined;

  const exports: IExportRecord[] = (record.exports ?? []).map((exportRecord) => ({
    exportedAt: exportRecord.exportedAt,
    format: exportRecord.format as PosterFormat,
    downloadUrl: exportRecord.downloadUrl,
    expiresAt: optional(exportRecord.expiresAt),
    ipAddress: optional(exportRecord.ipAddress),
  }));

  return {
    _id: record.id,
    id: record.id,
    product: record.product ? mapProduct(record.product) : record.productId,
    generatedContent: record.generatedContent
      ? mapGeneratedContent(record.generatedContent)
      : record.generatedContentId,
    store: record.store ? mapStore(record.store) : record.storeId,
    owner: record.ownerId,
    generationStatus: record.generationStatus as GenerationStatus,
    generationStartedAt: optional(record.generationStartedAt),
    generationCompletedAt: optional(record.generationCompletedAt),
    failureReason: optional(record.failureReason),
    failedAt: optional(record.failedAt),
    posterUrl: optional(record.posterUrl),
    thumbnailUrl: optional(record.posterUrl),
    storageMetadata,
    dimensions: {
      width: record.width,
      height: record.height,
      unit: record.dimensionUnit as 'px' | 'mm' | 'in',
    },
    format: record.format as PosterFormat,
    size: record.size as PosterSize,
    generationMetrics,
    exports,
    totalDownloads: record.totalDownloads,
    promptSnapshot: optional(record.promptSnapshot),
    isPublic: record.isPublic,
    isFavourited: record.isFavourited,
    tags: record.tags,
    title: optional(record.title),
    version: record.version,
    parentPosterId: optional(record.parentPosterId),
    createdAt: record.createdAt,
    editableUntil,
    updatedAt: record.updatedAt,
    isEditable: editableUntil.getTime() > Date.now(),
    isCompleted: record.generationStatus === 'completed',
    isFailed: record.generationStatus === 'failed',
    isPending: record.generationStatus === 'pending',
  };
}
