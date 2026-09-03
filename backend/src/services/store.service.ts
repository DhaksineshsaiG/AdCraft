import {
  Prisma,
  ProductProcessingStatus as PrismaProcessingStatus,
  ProductSource as PrismaProductSource,
  ProductStatus as PrismaProductStatus,
  StoreStatus as PrismaStoreStatus,
  StoreType as PrismaStoreType,
  SyncStatus as PrismaSyncStatus,
} from '@prisma/client';
import { mapStore } from '../database/mappers';
import prisma from '../database/prisma';
import {
  ConflictError,
  ExternalServiceError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../middleware/errorMiddleware';
import {
  IStoreDocument,
  StoreStatus,
  StoreType,
  SyncStatus,
} from '../models/Store';
import { ProductStatus } from '../models/Product';
import ShopifyService, {
  NormalizedProduct as ShopifyProduct,
} from './shopify.service';
import WooCommerceService, {
  NormalizedProduct as WooProduct,
} from './woocommerce.service';

export interface ConnectShopifyPayload {
  name: string;
  shopDomain: string;
  accessToken: string;
  description?: string;
}

export interface ConnectWooCommercePayload {
  name: string;
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  description?: string;
}

export interface SyncResult {
  storeId: string;
  totalFetched: number;
  created: number;
  updated: number;
  failed: number;
  durationMs: number;
  errors: string[];
}

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

function normaliseShopDomain(domain: string): string {
  return domain.toLowerCase().trim().replace(/\/$/, '');
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function disconnectedArchiveSlug(storeId: string): string {
  return `disconnected-${storeId}`;
}

function isProductReadyForPoster(product: ShopifyProduct | WooProduct): boolean {
  return product.status === ProductStatus.ACTIVE && product.images.length > 0;
}

export async function connectShopify(
  ownerId: string,
  payload: ConnectShopifyPayload
): Promise<IStoreDocument> {
  const normalisedDomain = normaliseShopDomain(payload.shopDomain);
  const existing = await prisma.store.findFirst({
    where: { shopifyShopDomain: normalisedDomain },
  });
  if (existing && !existing.isArchived) {
    throw new ConflictError(
      `A store for "${normalisedDomain}" is already connected${
        existing.ownerId === ownerId ? ' to your account' : ''
      }.`
    );
  }

  const shopInfo = await new ShopifyService(
    normalisedDomain,
    payload.accessToken
  ).validateCredentials();
  const name = payload.name.trim() || shopInfo.shopName;
  if (existing?.isArchived) {
    await prisma.store.update({
      where: { id: existing.id },
      data: {
        shopifyShopDomain: null,
        shopifyAccessToken: null,
        shopifyWebhookSecret: null,
        shopifyApiVersion: null,
        shopifyScopes: [],
      },
    });
  }
  const store = await prisma.store.create({
    data: {
      name,
      slug: generateSlug(name),
      description: payload.description?.trim(),
      type: PrismaStoreType.shopify,
      status: PrismaStoreStatus.active,
      shopifyShopDomain: normalisedDomain,
      shopifyAccessToken: payload.accessToken,
      shopifyApiVersion: '2024-07',
      shopifyScopes: ['read_products'],
      currency: shopInfo.currency,
      ownerId,
    },
  });
  return mapStore(store);
}

export async function connectWooCommerce(
  ownerId: string,
  payload: ConnectWooCommercePayload
): Promise<IStoreDocument> {
  const normalisedUrl = normaliseShopDomain(payload.storeUrl);
  const existing = await prisma.store.findFirst({
    where: { wooStoreUrl: normalisedUrl, isArchived: false },
  });
  if (existing) {
    throw new ConflictError(
      `A store for "${normalisedUrl}" is already connected${
        existing.ownerId === ownerId ? ' to your account' : ''
      }.`
    );
  }

  const storeInfo = await new WooCommerceService(
    normalisedUrl,
    payload.consumerKey,
    payload.consumerSecret
  ).validateCredentials();
  const name = payload.name.trim() || storeInfo.storeName;
  const store = await prisma.store.create({
    data: {
      name,
      slug: generateSlug(name),
      description: payload.description?.trim(),
      type: PrismaStoreType.woocommerce,
      status: PrismaStoreStatus.active,
      wooStoreUrl: normalisedUrl,
      wooConsumerKey: payload.consumerKey,
      wooConsumerSecret: payload.consumerSecret,
      wooApiVersion: 'wc/v3',
      currency: storeInfo.currency,
      ownerId,
    },
  });
  return mapStore(store);
}

export async function disconnectStore(
  storeId: string,
  requestingUserId: string
): Promise<void> {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new NotFoundError('Store');
  if (store.ownerId !== requestingUserId) {
    throw new ForbiddenError('You do not have permission to disconnect this store.');
  }
  if (store.isArchived) throw new ValidationError('This store is already disconnected.');

  await prisma.$transaction(async (tx) => {
    const retainedProducts = await tx.product.findMany({
      where: {
        storeId,
        ownerId: requestingUserId,
        posters: { some: {} },
      },
      select: { id: true },
    });
    const retainedProductIds = retainedProducts.map((product) => product.id);

    if (retainedProductIds.length > 0) {
      const archivedAt = new Date();
      const archiveStore = await tx.store.create({
        data: {
          name: `${store.name} (disconnected archive)`.slice(0, 150),
          slug: disconnectedArchiveSlug(store.id),
          description: store.description,
          logoUrl: store.logoUrl,
          type: store.type,
          status: PrismaStoreStatus.disconnected,
          syncStatus: PrismaSyncStatus.idle,
          currency: store.currency,
          isArchived: true,
          archivedAt,
          ownerId: store.ownerId,
        },
      });

      await tx.poster.updateMany({
        where: { storeId },
        data: { storeId: archiveStore.id },
      });
      await tx.generatedContent.updateMany({
        where: {
          storeId,
          posters: { some: {} },
        },
        data: { storeId: archiveStore.id },
      });
      await tx.product.updateMany({
        where: { id: { in: retainedProductIds } },
        data: {
          storeId: archiveStore.id,
          status: PrismaProductStatus.archived,
        },
      });
    }

    await tx.generatedContent.deleteMany({ where: { storeId } });
    await tx.product.deleteMany({ where: { storeId } });
    await tx.store.delete({ where: { id: storeId } });
  });
}

export async function syncProducts(
  storeId: string,
  requestingUserId: string
): Promise<SyncResult> {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new NotFoundError('Store');
  if (store.ownerId !== requestingUserId) {
    throw new ForbiddenError('You do not have permission to sync this store.');
  }
  if (store.isArchived || store.status === PrismaStoreStatus.disconnected) {
    throw new ValidationError('Cannot sync a disconnected store.');
  }
  if (store.syncStatus === PrismaSyncStatus.syncing) {
    throw new ValidationError('A sync is already in progress for this store.');
  }

  await prisma.store.update({
    where: { id: store.id },
    data: { syncStatus: PrismaSyncStatus.syncing, lastSyncError: null },
  });

  const startedAt = Date.now();
  let normalizedProducts: Array<ShopifyProduct | WooProduct>;
  try {
    if (
      store.type === PrismaStoreType.shopify &&
      store.shopifyShopDomain &&
      store.shopifyAccessToken
    ) {
      normalizedProducts = await new ShopifyService(
        store.shopifyShopDomain,
        store.shopifyAccessToken,
        store.shopifyApiVersion ?? '2024-07'
      ).fetchAllProducts();
      
      
      
    } else if (
      store.type === PrismaStoreType.woocommerce &&
      store.wooStoreUrl &&
      store.wooConsumerKey &&
      store.wooConsumerSecret
    ) {
      normalizedProducts = await new WooCommerceService(
        store.wooStoreUrl,
        store.wooConsumerKey,
        store.wooConsumerSecret
      ).fetchAllProducts();
    } else {
      throw new ExternalServiceError('Store', 'Store credentials are incomplete.');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.store.update({
      where: { id: store.id },
      data: { syncStatus: PrismaSyncStatus.failed, lastSyncError: message },
    });
    throw error;
  }

  let created = 0;
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];
  const syncCompletedAt = new Date();

  if (store.type === PrismaStoreType.shopify) {
    const sourceIds = normalizedProducts.map((product) => product.sourceId);
    await prisma.product.updateMany({
      where: {
        storeId: store.id,
        source: PrismaProductSource.shopify,
        ...(sourceIds.length > 0 ? { sourceId: { notIn: sourceIds } } : {}),
        status: { not: PrismaProductStatus.archived },
      },
      data: {
        status: PrismaProductStatus.archived,
        lastSyncedAt: syncCompletedAt,
      },
    });
  }

  for (const product of normalizedProducts) {
    try {
      const existing = await prisma.product.findUnique({
        where: {
          sourceId_storeId: { sourceId: product.sourceId, storeId: store.id },
        },
        select: { id: true },
      });
      const commonData = {
        source:
          store.type === PrismaStoreType.shopify
            ? PrismaProductSource.shopify
            : PrismaProductSource.woocommerce,
        externalUrl: product.externalUrl,
        name: product.name,
        description: product.description,
        shortDescription:
          'shortDescription' in product ? product.shortDescription : undefined,
        sku: 'sku' in product ? product.sku : undefined,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        currency: product.currency,
        images: asJson(product.images),
        categories: 'categories' in product ? product.categories : [],
        tags: product.tags,
        vendor: product.vendor,
        productType: product.productType,
        variants: asJson(product.variants),
        hasVariants: product.variants.length > 1,
        status: product.status as unknown as Prisma.ProductCreateInput['status'],
        sourceCreatedAt: product.sourceCreatedAt,
        sourceUpdatedAt: product.sourceUpdatedAt,
        lastSyncedAt: syncCompletedAt,
      };
      const processingStatus = isProductReadyForPoster(product)
        ? PrismaProcessingStatus.ready
        : PrismaProcessingStatus.pending;

      await prisma.product.upsert({
        where: {
          sourceId_storeId: { sourceId: product.sourceId, storeId: store.id },
        },
        create: {
          ...commonData,
          sourceId: product.sourceId,
          storeId: store.id,
          ownerId: store.ownerId,
          processingStatus,
        },
        update: {
          ...commonData,
          processingStatus,
          processingError: null,
        },
      });
      if (existing) updated += 1;
      else created += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Product ${product.sourceId} (${product.name}): ${message}`);
    }
  }

  const durationMs = Date.now() - startedAt;
  const totalSynced = created + updated;
  await prisma.store.update({
    where: { id: store.id },
    data:
      failed > 0 && totalSynced === 0
        ? {
            syncStatus: PrismaSyncStatus.failed,
            lastSyncError: `All ${failed} products failed to sync.`,
          }
        : {
            status: PrismaStoreStatus.active,
            syncStatus: PrismaSyncStatus.success,
            lastSyncAt: syncCompletedAt,
            totalProductsSynced: totalSynced,
            syncDurationMs: durationMs,
            lastSyncError: null,
            totalProductsImported: totalSynced,
            lastActivityAt: syncCompletedAt,
          },
  });

  return {
    storeId,
    totalFetched: normalizedProducts.length,
    created,
    updated,
    failed,
    durationMs,
    errors,
  };
}

export async function getStoresByOwner(ownerId: string): Promise<IStoreDocument[]> {
  const stores = await prisma.store.findMany({
    where: { ownerId, isArchived: false },
    orderBy: { createdAt: 'desc' },
  });
  return stores.map(mapStore);
}

export async function getStoreById(
  storeId: string,
  requestingUserId: string
): Promise<IStoreDocument> {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store || store.isArchived) throw new NotFoundError('Store');
  if (store.ownerId !== requestingUserId) {
    throw new ForbiddenError('You do not have permission to view this store.');
  }
  return mapStore(store);
}

export async function testStoreConnection(
  storeId: string,
  requestingUserId: string
): Promise<{ success: boolean; message: string }> {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new NotFoundError('Store');
  if (store.ownerId !== requestingUserId) {
    throw new ForbiddenError('You do not have permission to test this store connection.');
  }

  try {
    if (
      store.type === PrismaStoreType.shopify &&
      store.shopifyShopDomain &&
      store.shopifyAccessToken
    ) {
      const info = await new ShopifyService(
        store.shopifyShopDomain,
        store.shopifyAccessToken,
        store.shopifyApiVersion ?? '2024-07'
      ).validateCredentials();
      return { success: true, message: `Connected to Shopify store: ${info.shopName}` };
    }
    if (store.wooStoreUrl && store.wooConsumerKey && store.wooConsumerSecret) {
      const info = await new WooCommerceService(
        store.wooStoreUrl,
        store.wooConsumerKey,
        store.wooConsumerSecret
      ).validateCredentials();
      return {
        success: true,
        message: `Connected to WooCommerce store: ${info.storeName} (v${info.version})`,
      };
    }
    throw new Error('Store credentials are incomplete.');
  } catch (error) {
    await prisma.store.update({
      where: { id: storeId },
      data: { status: PrismaStoreStatus.error },
    });
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection test failed.',
    };
  }
}

export { StoreStatus, StoreType, SyncStatus };
