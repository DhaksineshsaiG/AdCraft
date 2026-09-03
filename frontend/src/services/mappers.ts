import type { Store } from '@components/stores/StoreCard';
import type { Product } from '@components/products/ProductCard';
import type {
  Poster,
  PosterFormat,
  PosterSize,
  PosterStatus,
  PosterStyle,
} from '@components/posters/PosterCard';
import type { ContentBlock, ContentType } from '@components/posters/AIContentPanel';
import type { ExportRecord } from '@components/exports/ExportCard';
import { getId } from './api.types';

export interface BackendStore {
  _id: string;
  name: string;
  slug?: string;
  type?: 'shopify' | 'woocommerce';
  status?: 'active' | 'inactive' | 'error' | 'disconnected';
  syncState?: {
    status?: 'idle' | 'syncing' | 'success' | 'error';
    lastSyncAt?: string;
    lastError?: string;
  };
  usageStats?: {
    totalProductsImported?: number;
  };
  posterDefaults?: {
    currency?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface BackendProduct {
  _id: string;
  name: string;
  status?: 'active' | 'draft' | 'archived' | 'out_of_stock';
  price?: number;
  currency?: string;
  images?: Array<{ url?: string; position?: number }>;
  categories?: string[];
  vendor?: string;
  processingMetadata?: {
    status?: Product['syncStatus'];
  };
  store?: string | BackendStore;
  hasVariants?: boolean;
  variants?: Array<{
    title?: string;
    attributes?: Record<string, string>;
    sku?: string;
  }>;
}

export interface BackendContent {
  _id: string;
  contentType: BackendContentType;
  status: string;
  selectedText?: string | null;
  selectedVariantIndex?: number;
  variants?: Array<{ index?: number; text?: string; isSelected?: boolean }>;
  version?: number;
  product?: string | BackendProduct;
  createdAt?: string;
}

export type BackendContentType =
  | 'headline'
  | 'tagline'
  | 'call_to_action'
  | 'product_description'
  | 'marketing_copy';

export interface BackendPoster {
  _id: string;
  product?: string | BackendProduct;
  store?: string | BackendStore;
  posterUrl?: string;
  thumbnailUrl?: string;
  generationStatus?: PosterStatus;
  format?: PosterFormat;
  size?: PosterSize | 'custom';
  isFavourited?: boolean;
  totalDownloads?: number;
  version?: number;
  title?: string;
  promptSnapshot?: string;
  tags?: string[];
  createdAt?: string;
  editableUntil?: string;
  isEditable?: boolean;
}

export interface BackendExportRecord {
  posterId: string;
  posterTitle?: string;
  posterUrl?: string;
  exportedAt?: string;
  format?: PosterFormat;
  downloadUrl?: string;
  expiresAt?: string;
}

const CONTENT_LABELS: Record<ContentType, string> = {
  headline: 'Headline',
  tagline: 'Tagline',
  cta: 'Call to Action',
  description: 'Description',
  marketing_copy: 'Marketing Copy',
};

export function toStore(store: BackendStore): Store {
  const isSyncing = store.syncState?.status === 'syncing';
  const hasError = store.status === 'error' || store.syncState?.status === 'error';

  return {
    id: store._id,
    name: store.name,
    platform: store.type ?? 'shopify',
    status: isSyncing ? 'syncing' : hasError ? 'error' : store.status === 'disconnected' ? 'disconnected' : 'active',
    url: store.slug ? `#${store.slug}` : '#',
    totalProducts: store.usageStats?.totalProductsImported ?? 0,
    lastSyncAt: store.syncState?.lastSyncAt ? new Date(store.syncState.lastSyncAt) : null,
    currency: store.posterDefaults?.currency ?? 'USD',
    createdAt: store.createdAt ? new Date(store.createdAt) : new Date(),
    updatedAt: store.updatedAt ? new Date(store.updatedAt) : new Date(),
  };
}

export function toProduct(product: BackendProduct): Product {
  const store = typeof product.store === 'object' ? product.store : undefined;
  const image = (product.images ?? [])
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .find((img) => img.url)?.url;
  const hasImage = Boolean(image);
  const variantSummary = summarizeVariants(product.variants ?? []);

  return {
    id: product._id,
    name: product.name,
    price: product.price ?? 0,
    currency: product.currency ?? 'USD',
    imageUrl: image,
    category: product.categories?.[0],
    vendor: product.vendor,
    syncStatus: product.processingMetadata?.status ?? 'pending',
    storeId: getId(product.store),
    storeName: store?.name ?? 'Store',
    hasVariants: product.hasVariants ?? (product.variants?.length ?? 0) > 1,
    variantCount: Math.max(product.variants?.length ?? 1, 1),
    variantSummary,
    canGeneratePoster:
      product.status !== 'draft' &&
      product.status !== 'archived' &&
      hasImage,
  };
}

function summarizeVariants(variants: NonNullable<BackendProduct['variants']>): string | undefined {
  const labels = variants
    .map((variant) => {
      const attributes = Object.entries(variant.attributes ?? {})
        .filter(([name, value]) =>
          !(name.toLowerCase() === 'title' && value.toLowerCase() === 'default title')
        )
        .map(([name, value]) => `${name}: ${value}`);

      if (attributes.length > 0) return attributes.join(', ');
      const title = variant.title?.trim();
      if (!title || title.toLowerCase() === 'default title' || title.toLowerCase() === 'default') {
        return undefined;
      }
      return title;
    })
    .filter((label): label is string => Boolean(label));

  if (labels.length === 0) return undefined;

  const unique = [...new Set(labels)];
  return unique.length <= 2
    ? unique.join(' · ')
    : `${unique.slice(0, 2).join(' · ')} +${unique.length - 2} more`;
}

export function toUiContentType(type: BackendContentType): ContentType {
  if (type === 'call_to_action') return 'cta';
  if (type === 'product_description') return 'description';
  return type;
}

export function toBackendContentType(type: ContentType): BackendContentType {
  if (type === 'cta') return 'call_to_action';
  if (type === 'description') return 'product_description';
  return type;
}

export function contentRecordsToBlocks(
  records: BackendContent[],
  loading?: { contentId?: string; contentType?: ContentType }
): ContentBlock[] {
  const latest = new Map<ContentType, BackendContent>();
  records.forEach((record) => {
    const type = toUiContentType(record.contentType);
    if (!latest.has(type)) latest.set(type, record);
  });

  return (['headline', 'tagline', 'cta', 'description', 'marketing_copy'] as ContentType[])
    .map((type) => {
      const record = latest.get(type);
      const variants = (record?.variants ?? []).map((variant, index) => ({
        index: variant.index ?? index,
        text: variant.text ?? '',
        isSelected: Boolean(variant.isSelected) || variant.index === record?.selectedVariantIndex,
      })).filter((variant) => variant.text.trim().length > 0);

      if (record?.selectedText && variants.length === 0) {
        variants.push({ index: 0, text: record.selectedText, isSelected: true });
      }

      return {
        id: record?._id,
        type,
        label: CONTENT_LABELS[type],
        variants,
        isLoading:
          (record ? loading?.contentId === record._id : false) ||
          loading?.contentType === type,
      };
    });
}

function inferPosterStyle(poster: BackendPoster): PosterStyle {
  const text = [poster.title, poster.promptSnapshot, ...(poster.tags ?? [])].join(' ').toLowerCase();
  const styles: PosterStyle[] = ['modern', 'bold', 'elegant', 'playful', 'minimalist', 'vintage', 'professional'];
  return styles.find((style) => text.includes(style)) ?? 'modern';
}

function parsePosterSnapshot(poster: BackendPoster): {
  editableSvg?: string;
  editState?: unknown;
  editHistory?: unknown[];
} {
  if (!poster.promptSnapshot) return {};
  try {
    const snapshot = JSON.parse(poster.promptSnapshot) as {
      editableSvg?: unknown;
      editState?: unknown;
      editHistory?: unknown;
    };
    return {
      editableSvg: typeof snapshot.editableSvg === 'string' ? snapshot.editableSvg : undefined,
      editState: snapshot.editState,
      editHistory: Array.isArray(snapshot.editHistory) ? snapshot.editHistory : undefined,
    };
  } catch {
    return {};
  }
}

export function toPoster(poster: BackendPoster): Poster {
  const product = typeof poster.product === 'object' ? poster.product : undefined;
  const store = typeof poster.store === 'object' ? poster.store : undefined;
  const createdAt = poster.createdAt ? new Date(poster.createdAt) : new Date();
  const editableUntil = poster.editableUntil
    ? new Date(poster.editableUntil)
    : new Date(createdAt.getTime() + 5 * 24 * 60 * 60 * 1000);
  const snapshot = parsePosterSnapshot(poster);

  return {
    id: poster._id,
    productName: poster.title ?? product?.name ?? 'Product poster',
    storeName: store?.name ?? 'Store',
    posterUrl: poster.posterUrl,
    thumbnailUrl: poster.thumbnailUrl ?? poster.posterUrl,
    generationStatus: poster.generationStatus ?? 'pending',
    format: poster.format ?? 'jpeg',
    size: poster.size === 'custom' ? 'square' : poster.size ?? 'square',
    style: inferPosterStyle(poster),
    version: poster.version ?? 1,
    isFavourited: Boolean(poster.isFavourited),
    totalDownloads: poster.totalDownloads ?? 0,
    createdAt,
    editableUntil,
    isEditable: poster.isEditable ?? editableUntil.getTime() > Date.now(),
    editableSvg: snapshot.editableSvg,
    editState: snapshot.editState,
    editHistory: snapshot.editHistory,
  };
}

export function toExportRecord(record: BackendExportRecord, index: number): ExportRecord {
  return {
    id: `${record.posterId}-${record.exportedAt ?? index}`,
    posterId: record.posterId,
    posterName: record.posterTitle ?? `Poster ${record.posterId.slice(-6)}`,
    storeName: 'Store',
    format: record.format ?? 'jpeg',
    status: 'completed',
    downloadUrl: record.downloadUrl,
    exportedAt: record.exportedAt ? new Date(record.exportedAt) : new Date(),
    completedAt: record.exportedAt ? new Date(record.exportedAt) : new Date(),
  };
}
