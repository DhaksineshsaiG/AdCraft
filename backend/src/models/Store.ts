export enum StoreType {
  SHOPIFY = 'shopify',
  WOOCOMMERCE = 'woocommerce',
}

export enum StoreStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  ERROR = 'error',
  DISCONNECTED = 'disconnected',
}

export enum SyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export interface IShopifyConfig {
  shopDomain: string;
  accessToken: string;
  webhookSecret?: string;
  apiVersion: string;
  scopes: string[];
}

export interface IWooCommerceConfig {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  apiVersion: string;
}

export interface IStoreSyncState {
  status: SyncStatus;
  lastSyncAt?: Date;
  nextSyncAt?: Date;
  totalProductsSynced: number;
  lastError?: string;
  syncDurationMs?: number;
}

export interface IStoreUsageStats {
  totalProductsImported: number;
  totalPostersGenerated: number;
  totalExports: number;
  lastActivityAt?: Date;
}

export interface IPosterDefaults {
  templateId?: string;
  brandColor?: string;
  logoUrl?: string;
  fontFamily?: string;
  watermarkEnabled: boolean;
  defaultLocale: string;
  currency: string;
}

export interface IStore {
  _id: string;
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  type: StoreType;
  status: StoreStatus;
  shopifyConfig?: IShopifyConfig;
  wooCommerceConfig?: IWooCommerceConfig;
  owner: string;
  syncState: IStoreSyncState;
  usageStats: IStoreUsageStats;
  posterDefaults: IPosterDefaults;
  isArchived: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type IStoreDocument = IStore;
