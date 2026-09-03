import {
  Prisma,
  ProductProcessingStatus as PrismaProcessingStatus,
  ProductSource as PrismaProductSource,
  ProductStatus as PrismaProductStatus,
  StoreStatus as PrismaStoreStatus,
} from '@prisma/client';
import { mapProduct } from '../database/mappers';
import prisma from '../database/prisma';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../middleware/errorMiddleware';
import {
  IProductDocument,
  ProductProcessingStatus,
  ProductSource,
  ProductStatus,
} from '../models/Product';
import { isValidId } from '../utils/id';

export type SortField =
  | 'name'
  | 'price'
  | 'createdAt'
  | 'updatedAt'
  | 'lastSyncedAt'
  | 'status';
export type SortDirection = 'asc' | 'desc';

export interface ProductQuery {
  ownerId: string;
  storeId?: string;
  status?: ProductStatus;
  source?: ProductSource;
  processingStatus?: ProductProcessingStatus;
  category?: string;
  tag?: string;
  vendor?: string;
  hasVariants?: boolean;
  readyForGeneration?: boolean;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: SortField;
  sortDir?: SortDirection;
}

export interface PaginatedProducts {
  products: IProductDocument[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  appliedFilters: Record<string, unknown>;
}

export interface ProcessingStatusBreakdown {
  pending: number;
  processing: number;
  ready: number;
  failed: number;
  stale: number;
}

export interface ProductAnalytics {
  storeId?: string;
  totalProducts: number;
  byStatus: Record<ProductStatus, number>;
  bySource: Record<ProductSource, number>;
  byProcessingStatus: ProcessingStatusBreakdown;
  readyForGeneration: number;
  withImages: number;
  withVariants: number;
  priceRange: { min: number; max: number; avg: number };
  topCategories: Array<{ name: string; count: number }>;
  topTags: Array<{ name: string; count: number }>;
  recentlySynced: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const VALID_SORT_FIELDS: SortField[] = [
  'name',
  'price',
  'createdAt',
  'updatedAt',
  'lastSyncedAt',
  'status',
];

async function assertStoreOwnership(storeId: string, ownerId: string): Promise<void> {
  if (!isValidId(storeId)) throw new ValidationError('Invalid store ID format.');
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { ownerId: true, isArchived: true },
  });
  if (!store || store.isArchived) throw new NotFoundError('Store');
  if (store.ownerId !== ownerId) {
    throw new ForbiddenError('You do not have permission to access products in this store.');
  }
}

function buildWhere(query: ProductQuery): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { ownerId: query.ownerId };
  if (query.storeId) where.storeId = query.storeId;
  if (query.status) {
    where.status = query.status as unknown as PrismaProductStatus;
  } else {
    where.status = { not: PrismaProductStatus.archived };
  }
  if (query.source) where.source = query.source as unknown as PrismaProductSource;
  if (query.readyForGeneration) {
    where.processingStatus = PrismaProcessingStatus.ready;
    where.status = PrismaProductStatus.active;
    where.NOT = { images: { equals: [] } };
  } else if (query.processingStatus) {
    where.processingStatus =
      query.processingStatus as unknown as PrismaProcessingStatus;
  }
  if (query.category) where.categories = { has: query.category };
  if (query.tag) where.tags = { has: query.tag };
  if (query.vendor) {
    where.vendor = { contains: query.vendor, mode: 'insensitive' };
  }
  if (query.hasVariants !== undefined) where.hasVariants = query.hasVariants;
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.price = {
      gte: query.minPrice,
      lte: query.maxPrice,
    };
  }
  if (query.search?.trim()) {
    const search = query.search.trim();
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { tags: { has: search } },
    ];
  }
  return where;
}

export async function listProducts(query: ProductQuery): Promise<PaginatedProducts> {
  if (query.storeId) await assertStoreOwnership(query.storeId, query.ownerId);
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(query.limit ?? DEFAULT_LIMIT)));
  const sortBy = VALID_SORT_FIELDS.includes(query.sortBy ?? 'createdAt')
    ? query.sortBy ?? 'createdAt'
    : 'createdAt';
  const sortDir: SortDirection = query.sortDir === 'asc' ? 'asc' : 'desc';
  const where = buildWhere(query);

  const [total, records] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { store: true },
      orderBy: [{ [sortBy]: sortDir }, ...(sortBy === 'createdAt' ? [] : [{ createdAt: 'desc' as const }])],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  const totalPages = Math.ceil(total / limit);

  const appliedFilters: Record<string, unknown> = {};
  for (const key of [
    'storeId',
    'status',
    'source',
    'processingStatus',
    'category',
    'tag',
    'vendor',
    'hasVariants',
    'readyForGeneration',
    'minPrice',
    'maxPrice',
    'search',
  ] as const) {
    if (query[key] !== undefined && query[key] !== false) {
      appliedFilters[key] = query[key];
    }
  }
  if (sortBy !== 'createdAt' || sortDir !== 'desc') {
    appliedFilters['sort'] = `${sortBy}:${sortDir}`;
  }

  return {
    products: records.map(mapProduct),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    appliedFilters,
  };
}

export async function getProductById(
  productId: string,
  ownerId: string
): Promise<IProductDocument> {
  if (!isValidId(productId)) throw new ValidationError('Invalid product ID format.');
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { store: true },
  });
  if (!product) throw new NotFoundError('Product');
  if (product.ownerId !== ownerId) {
    throw new ForbiddenError('You do not have permission to view this product.');
  }
  return mapProduct(product);
}

export async function searchProducts(
  ownerId: string,
  searchTerm: string,
  options: Omit<ProductQuery, 'ownerId' | 'search'> = {}
): Promise<PaginatedProducts> {
  if (searchTerm.trim().length < 2) {
    throw new ValidationError('Search term must be at least 2 characters.');
  }
  return listProducts({ ...options, ownerId, search: searchTerm.trim() });
}

export async function updateProcessingStatus(
  productId: string,
  ownerId: string,
  action: 'markProcessing' | 'markFailed' | 'markStale',
  errorMessage?: string
): Promise<IProductDocument> {
  const current = await prisma.product.findUnique({ where: { id: productId } });
  if (!current) throw new NotFoundError('Product');
  if (current.ownerId !== ownerId) {
    throw new ForbiddenError('You do not have permission to update this product.');
  }
  if (action === 'markFailed' && !errorMessage) {
    throw new ValidationError('Error message is required for markFailed.');
  }

  const status =
    action === 'markProcessing'
      ? PrismaProcessingStatus.processing
      : action === 'markFailed'
        ? PrismaProcessingStatus.failed
        : PrismaProcessingStatus.stale;
  const product = await prisma.product.update({
    where: { id: productId },
    data: {
      processingStatus: status,
      processingError: action === 'markFailed' ? errorMessage : null,
    },
    include: { store: true },
  });
  return mapProduct(product);
}

function countStrings(values: string[][]): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  values.flat().forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
}

export async function getProductAnalytics(
  ownerId: string,
  storeId?: string
): Promise<ProductAnalytics> {
  if (storeId) await assertStoreOwnership(storeId, ownerId);
  const where: Prisma.ProductWhereInput = {
    ownerId,
    status: { not: PrismaProductStatus.archived },
    ...(storeId
      ? { storeId }
      : {
          store: {
            isArchived: false,
            status: { not: PrismaStoreStatus.disconnected },
          },
        }),
  };
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [products, statusGroups, sourceGroups, processingGroups, price] =
    await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          categories: true,
          tags: true,
          images: true,
          hasVariants: true,
          status: true,
          processingStatus: true,
          lastSyncedAt: true,
        },
      }),
      prisma.product.groupBy({ by: ['status'], where, _count: true }),
      prisma.product.groupBy({ by: ['source'], where, _count: true }),
      prisma.product.groupBy({ by: ['processingStatus'], where, _count: true }),
      prisma.product.aggregate({
        where,
        _min: { price: true },
        _max: { price: true },
        _avg: { price: true },
      }),
    ]);

  const byStatus = Object.values(ProductStatus).reduce(
    (result, status) => ({ ...result, [status]: 0 }),
    {} as Record<ProductStatus, number>
  );
  statusGroups.forEach((group) => {
    byStatus[group.status as ProductStatus] = group._count;
  });
  const bySource = Object.values(ProductSource).reduce(
    (result, source) => ({ ...result, [source]: 0 }),
    {} as Record<ProductSource, number>
  );
  sourceGroups.forEach((group) => {
    bySource[group.source as ProductSource] = group._count;
  });
  const byProcessingStatus: ProcessingStatusBreakdown = {
    pending: 0,
    processing: 0,
    ready: 0,
    failed: 0,
    stale: 0,
  };
  processingGroups.forEach((group) => {
    byProcessingStatus[group.processingStatus] = group._count;
  });

  const hasImages = (value: Prisma.JsonValue): boolean =>
    Array.isArray(value) && value.length > 0;

  return {
    storeId,
    totalProducts: products.length,
    byStatus,
    bySource,
    byProcessingStatus,
    readyForGeneration: products.filter(
      (product) =>
        product.processingStatus === PrismaProcessingStatus.ready &&
        product.status === PrismaProductStatus.active &&
        hasImages(product.images)
    ).length,
    withImages: products.filter((product) => hasImages(product.images)).length,
    withVariants: products.filter((product) => product.hasVariants).length,
    priceRange: {
      min: price._min.price ?? 0,
      max: price._max.price ?? 0,
      avg: Math.round((price._avg.price ?? 0) * 100) / 100,
    },
    topCategories: countStrings(products.map((product) => product.categories)),
    topTags: countStrings(products.map((product) => product.tags)),
    recentlySynced: products.filter((product) => product.lastSyncedAt >= oneDayAgo).length,
  };
}

export async function getDistinctCategories(
  ownerId: string,
  storeId?: string
): Promise<string[]> {
  if (storeId) await assertStoreOwnership(storeId, ownerId);
  const products = await prisma.product.findMany({
    where: {
      ownerId,
      status: { not: PrismaProductStatus.archived },
      ...(storeId
        ? { storeId }
        : {
            store: {
              isArchived: false,
              status: { not: PrismaStoreStatus.disconnected },
            },
          }),
    },
    select: { categories: true },
  });
  return [...new Set(products.flatMap((product) => product.categories))].sort();
}

export async function getDistinctVendors(
  ownerId: string,
  storeId?: string
): Promise<string[]> {
  if (storeId) await assertStoreOwnership(storeId, ownerId);
  const products = await prisma.product.findMany({
    where: {
      ownerId,
      status: { not: PrismaProductStatus.archived },
      ...(storeId
        ? { storeId }
        : {
            store: {
              isArchived: false,
              status: { not: PrismaStoreStatus.disconnected },
            },
          }),
      vendor: { not: null },
    },
    select: { vendor: true },
    distinct: ['vendor'],
    orderBy: { vendor: 'asc' },
  });
  return products.flatMap((product) => (product.vendor ? [product.vendor] : []));
}
