import type { IStoreDocument } from './Store';

export enum ProductStatus {
  ACTIVE = 'active',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
  OUT_OF_STOCK = 'out_of_stock',
}

export enum ProductSource {
  SHOPIFY = 'shopify',
  WOOCOMMERCE = 'woocommerce',
  MANUAL = 'manual',
}

export enum ProductProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
  STALE = 'stale',
}

export interface IProductImage {
  url: string;
  altText?: string;
  width?: number;
  height?: number;
  position: number;
  sourceId?: string;
}

export interface IProductVariant {
  sourceId?: string;
  title: string;
  sku?: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  inventory?: number;
  barcode?: string;
  weight?: number;
  weightUnit?: string;
  attributes: Record<string, string>;
  isAvailable: boolean;
}

export interface IProductDimensions {
  weight?: number;
  weightUnit?: string;
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: string;
}

export interface IProcessingMetadata {
  status: ProductProcessingStatus;
  processedAt?: Date;
  processingError?: string;
  aiSummary?: string;
  keywords?: string[];
  processingDurationMs?: number;
}

export interface IProduct {
  _id: string;
  id: string;
  sourceId: string;
  source: ProductSource;
  externalUrl?: string;
  name: string;
  description?: string;
  shortDescription?: string;
  sku?: string;
  barcode?: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  images: IProductImage[];
  categories: string[];
  tags: string[];
  vendor?: string;
  productType?: string;
  variants: IProductVariant[];
  hasVariants: boolean;
  dimensions: IProductDimensions;
  status: ProductStatus;
  processingMetadata: IProcessingMetadata;
  store: string | IStoreDocument;
  owner: string;
  sourceCreatedAt?: Date;
  sourceUpdatedAt?: Date;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  primaryImage: IProductImage | null;
  cheapestVariant: IProductVariant | null;
}

export type IProductDocument = IProduct;
