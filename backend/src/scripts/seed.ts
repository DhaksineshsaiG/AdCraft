import { Prisma, StoreStatus as PrismaStoreStatus, StoreType as PrismaStoreType, SyncStatus as PrismaSyncStatus } from '@prisma/client';
import { connectDB, disconnectDB } from '../config/db';
import prisma from '../database/prisma';
import {
  ProductProcessingStatus,
  ProductSource,
  ProductStatus,
} from '../models/Product';

const SEED_USER_EMAIL = 'dhak@test.com';

function buildDemoProducts(
  storeId: string,
  ownerId: string,
  source: ProductSource
) {
  const now = new Date();
  const productUrlBase =
    source === ProductSource.SHOPIFY
      ? 'https://demo-shopify-store.myshopify.com/products'
      : 'https://demo-woocommerce-store.test/products';

  return [
    {
      sourceId: 'seed-nike-air-max-shoes',
      source,
      externalUrl: `${productUrlBase}/nike-air-max-shoes`,
      name: 'Nike Air Max Shoes',
      description:
        'Lightweight running shoes with responsive cushioning, breathable mesh, and a durable rubber outsole for everyday comfort.',
      shortDescription: 'Responsive everyday sneakers with breathable comfort.',
      sku: 'NIKE-AIR-MAX-DEMO',
      price: 129.99,
      compareAtPrice: 159.99,
      currency: 'USD',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
          altText: 'Nike Air Max Shoes',
          width: 1200,
          height: 900,
          position: 0,
          sourceId: 'seed-nike-air-max-shoes-image-1',
        },
      ],
      categories: ['Footwear', 'Sneakers'],
      tags: ['nike', 'air max', 'running', 'shoes'],
      vendor: 'Nike',
      productType: 'Shoes',
      variants: [
        {
          sourceId: 'seed-nike-air-max-shoes-variant-1',
          title: 'Black / Size 10',
          sku: 'NIKE-AIR-MAX-BLK-10',
          price: 129.99,
          compareAtPrice: 159.99,
          currency: 'USD',
          inventory: 25,
          weight: 0.85,
          weightUnit: 'kg',
          attributes: {
            color: 'Black',
            size: '10',
          },
          isAvailable: true,
        },
      ],
      hasVariants: false,
      dimensions: {
        weight: 0.85,
        weightUnit: 'kg',
        length: 34,
        width: 22,
        height: 12,
        dimensionUnit: 'cm',
      },
      status: ProductStatus.ACTIVE,
      processingMetadata: {
        status: ProductProcessingStatus.READY,
        processedAt: now,
        aiSummary: 'Premium athletic sneakers built for comfort, cushioning, and casual daily style.',
        keywords: ['sneakers', 'athletic', 'comfort', 'running'],
        processingDurationMs: 1200,
      },
      store: storeId,
      owner: ownerId,
      sourceCreatedAt: now,
      sourceUpdatedAt: now,
      lastSyncedAt: now,
    },
    {
      sourceId: 'seed-apple-iphone-16-pro',
      source,
      externalUrl: `${productUrlBase}/apple-iphone-16-pro`,
      name: 'Apple iPhone 16 Pro',
      description:
        'A premium smartphone with a titanium design, advanced camera system, bright display, and fast performance for creators and professionals.',
      shortDescription: 'Premium smartphone with pro cameras and fast performance.',
      sku: 'APPLE-IP16PRO-256-DEMO',
      barcode: '194253000000',
      price: 999,
      compareAtPrice: 1099,
      currency: 'USD',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab',
          altText: 'Apple iPhone 16 Pro',
          width: 1200,
          height: 900,
          position: 0,
          sourceId: 'seed-apple-iphone-16-pro-image-1',
        },
      ],
      categories: ['Electronics', 'Smartphones'],
      tags: ['apple', 'iphone', 'smartphone', 'pro'],
      vendor: 'Apple',
      productType: 'Smartphone',
      variants: [
        {
          sourceId: 'seed-apple-iphone-16-pro-variant-1',
          title: 'Natural Titanium / 256GB',
          sku: 'APPLE-IP16PRO-NT-256',
          price: 999,
          compareAtPrice: 1099,
          currency: 'USD',
          inventory: 12,
          barcode: '194253000000',
          weight: 199,
          weightUnit: 'g',
          attributes: {
            color: 'Natural Titanium',
            storage: '256GB',
          },
          isAvailable: true,
        },
      ],
      hasVariants: false,
      dimensions: {
        weight: 199,
        weightUnit: 'g',
        length: 14.9,
        width: 7.1,
        height: 0.8,
        dimensionUnit: 'cm',
      },
      status: ProductStatus.ACTIVE,
      processingMetadata: {
        status: ProductProcessingStatus.READY,
        processedAt: now,
        aiSummary: 'Flagship smartphone positioned around speed, camera quality, and premium build.',
        keywords: ['smartphone', 'camera', 'titanium', 'premium'],
        processingDurationMs: 1400,
      },
      store: storeId,
      owner: ownerId,
      sourceCreatedAt: now,
      sourceUpdatedAt: now,
      lastSyncedAt: now,
    },
    {
      sourceId: 'seed-ceramic-coffee-mug',
      source,
      externalUrl: `${productUrlBase}/ceramic-coffee-mug`,
      name: 'Ceramic Coffee Mug',
      description:
        'A minimalist ceramic mug with a smooth glazed finish, comfortable handle, and generous 12-ounce capacity for coffee or tea.',
      shortDescription: 'Minimal ceramic mug for coffee, tea, and daily rituals.',
      sku: 'CERAMIC-MUG-WHT-12OZ',
      price: 18.5,
      compareAtPrice: 24,
      currency: 'USD',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d',
          altText: 'Ceramic Coffee Mug',
          width: 1200,
          height: 900,
          position: 0,
          sourceId: 'seed-ceramic-coffee-mug-image-1',
        },
      ],
      categories: ['Home', 'Kitchen'],
      tags: ['ceramic', 'coffee', 'mug', 'kitchen'],
      vendor: 'Demo Home Goods',
      productType: 'Drinkware',
      variants: [
        {
          sourceId: 'seed-ceramic-coffee-mug-variant-1',
          title: 'White / 12 oz',
          sku: 'CERAMIC-MUG-WHT-12OZ',
          price: 18.5,
          compareAtPrice: 24,
          currency: 'USD',
          inventory: 80,
          weight: 420,
          weightUnit: 'g',
          attributes: {
            color: 'White',
            capacity: '12 oz',
          },
          isAvailable: true,
        },
      ],
      hasVariants: false,
      dimensions: {
        weight: 420,
        weightUnit: 'g',
        length: 12,
        width: 9,
        height: 10,
        dimensionUnit: 'cm',
      },
      status: ProductStatus.ACTIVE,
      processingMetadata: {
        status: ProductProcessingStatus.READY,
        processedAt: now,
        aiSummary: 'Simple glazed ceramic mug for warm drinks, gifting, and home kitchen merchandising.',
        keywords: ['ceramic', 'coffee', 'mug', 'home'],
        processingDurationMs: 900,
      },
      store: storeId,
      owner: ownerId,
      sourceCreatedAt: now,
      sourceUpdatedAt: now,
      lastSyncedAt: now,
    },
  ];
}

async function runSeed(): Promise<void> {
  await connectDB();
  console.info('[seed] Connected to PostgreSQL via Prisma.');

  const user = await prisma.user.findUnique({ where: { email: SEED_USER_EMAIL } });
  if (!user) {
    throw new Error(`[seed] User not found for email: ${SEED_USER_EMAIL}`);
  }

  console.info(`[seed] User ID: ${user.id}`);

  let store = await prisma.store.findFirst({ where: { ownerId: user.id } });

  if (!store) {
    const userSuffix = user.id.replace(/-/g, '').slice(-8);

    store = await prisma.store.create({
      data: {
        name: 'Demo Shopify Store',
        slug: `demo-shopify-store-${userSuffix}`,
        description: 'Development demo Shopify store for seeded products.',
        logoUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc',
        type: PrismaStoreType.shopify,
        status: PrismaStoreStatus.active,
        shopifyShopDomain: `demo-shopify-store-${userSuffix}.myshopify.com`,
        shopifyAccessToken: 'dev-demo-shopify-access-token',
        shopifyWebhookSecret: 'dev-demo-shopify-webhook-secret',
        shopifyApiVersion: '2024-07',
        shopifyScopes: ['read_products'],
        ownerId: user.id,
        syncStatus: PrismaSyncStatus.success,
        lastSyncAt: new Date(),
        lastActivityAt: new Date(),
        brandColor: '#111827',
        defaultLogoUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc',
        fontFamily: 'Inter',
        currency: 'USD',
      },
    });

    console.info('[seed] Created Demo Shopify Store.');
  } else {
    console.info('[seed] Existing store found. Skipping store creation.');
  }

  console.info(`[seed] Store ID: ${store.id}`);

  const productCount = await prisma.product.count({ where: { storeId: store.id } });
  let products = await prisma.product.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: 'asc' },
  });

  if (productCount === 0) {
    const productSource =
      store.type === PrismaStoreType.shopify
        ? ProductSource.SHOPIFY
        : ProductSource.WOOCOMMERCE;

    const demoProducts = buildDemoProducts(store.id, user.id, productSource);
    products = [];
    for (const product of demoProducts) {
      const created = await prisma.product.create({
        data: {
          sourceId: product.sourceId,
          source: product.source,
          externalUrl: product.externalUrl,
          name: product.name,
          description: product.description,
          shortDescription: product.shortDescription,
          sku: product.sku,
          barcode: 'barcode' in product ? product.barcode : undefined,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          currency: product.currency,
          images: JSON.parse(JSON.stringify(product.images)) as Prisma.InputJsonValue,
          categories: product.categories,
          tags: product.tags,
          vendor: product.vendor,
          productType: product.productType,
          variants: JSON.parse(JSON.stringify(product.variants)) as Prisma.InputJsonValue,
          hasVariants: product.hasVariants,
          weight: product.dimensions.weight,
          weightUnit: product.dimensions.weightUnit,
          length: product.dimensions.length,
          width: product.dimensions.width,
          height: product.dimensions.height,
          dimensionUnit: product.dimensions.dimensionUnit,
          status: product.status,
          processingStatus: product.processingMetadata.status,
          processedAt: product.processingMetadata.processedAt,
          aiSummary: product.processingMetadata.aiSummary,
          keywords: product.processingMetadata.keywords,
          processingDurationMs: product.processingMetadata.processingDurationMs,
          storeId: store.id,
          ownerId: user.id,
          sourceCreatedAt: product.sourceCreatedAt,
          sourceUpdatedAt: product.sourceUpdatedAt,
          lastSyncedAt: product.lastSyncedAt,
        },
      });
      products.push(created);
    }

    await prisma.store.update({
      where: { id: store.id },
      data: {
        syncStatus: PrismaSyncStatus.success,
        lastSyncAt: new Date(),
        totalProductsSynced: products.length,
        totalProductsImported: products.length,
        lastActivityAt: new Date(),
      },
    });

    console.info('[seed] Created 3 demo products.');
  } else {
    console.info(`[seed] Existing products found (${productCount}). Skipping product creation.`);
  }

  console.info(`[seed] Product IDs: ${products.map((product) => product.id).join(', ')}`);
  console.info('[seed] Development seed completed successfully.');
}

runSeed()
  .then(async () => {
    await disconnectDB();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[seed] Seed failed:', message);
    await disconnectDB();
    process.exit(1);
  });
