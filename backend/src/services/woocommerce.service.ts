import { IProductImage, IProductVariant, ProductStatus } from '../models/Product';
import { ExternalServiceError } from '../middleware/errorMiddleware';

// ─── WooCommerce API Types ────────────────────────────────────────────────────
// Minimal shapes for the WooCommerce REST API v3 responses we consume.

interface WooImage {
  id: number;
  src: string;
  name: string;
  alt: string;
}

interface WooDimensions {
  length: string;
  width: string;
  height: string;
}

interface WooCategory {
  id: number;
  name: string;
  slug: string;
}

interface WooTag {
  id: number;
  name: string;
  slug: string;
}

interface WooAttribute {
  id: number;
  name: string;
  options: string[];
  variation: boolean;
}

interface WooVariation {
  id: number;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  stock_quantity: number | null;
  stock_status: string;       // 'instock' | 'outofstock' | 'onbackorder'
  weight: string;
  dimensions: WooDimensions;
  attributes: Array<{ name: string; option: string }>;
  image: WooImage | null;
}

interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  status: string;            // 'publish' | 'draft' | 'pending' | 'private'
  catalog_visibility: string;
  type: string;              // 'simple' | 'variable' | 'grouped' | 'external'
  stock_quantity: number | null;
  stock_status: string;
  categories: WooCategory[];
  tags: WooTag[];
  images: WooImage[];
  attributes: WooAttribute[];
  variations: number[];       // IDs of variations — fetched separately for variable products
  weight: string;
  dimensions: WooDimensions;
  date_created: string;
  date_modified: string;
}

// ─── Normalized Output Types ──────────────────────────────────────────────────
// Re-use the same NormalizedProduct shape from shopify.service.ts

export interface NormalizedProduct {
  sourceId: string;
  name: string;
  description: string;
  shortDescription: string;
  vendor: string;
  productType: string;
  externalUrl: string;
  status: ProductStatus;
  tags: string[];
  categories: string[];
  sku: string;
  price: number;
  compareAtPrice: number | undefined;
  currency: string;
  images: IProductImage[];
  variants: IProductVariant[];
  sourceCreatedAt: Date;
  sourceUpdatedAt: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsePrice(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

function mapWooStatus(status: string, stockStatus: string): ProductStatus {
  if (status === 'draft' || status === 'pending') return ProductStatus.DRAFT;
  if (status !== 'publish') return ProductStatus.ARCHIVED;
  if (stockStatus === 'outofstock') return ProductStatus.OUT_OF_STOCK;
  return ProductStatus.ACTIVE;
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseDimension(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = parseFloat(value);
  return isNaN(n) ? undefined : n;
}

// ─── WooCommerce Service Class ────────────────────────────────────────────────

export class WooCommerceService {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly storeUrl: string;

  constructor(storeUrl: string, consumerKey: string, consumerSecret: string) {
    // Normalise trailing slash
    this.storeUrl = storeUrl.replace(/\/$/, '');
    this.baseUrl = `${this.storeUrl}/wp-json/wc/v3`;
    // WooCommerce REST API uses HTTP Basic Auth with consumer key/secret
    this.authHeader = `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`;
  }

  // ─── Core Fetch ────────────────────────────────────────────────────────────

  private async request<T>(
    endpoint: string,
    params?: Record<string, string>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
        },
      });
    } catch (networkError) {
      const message = networkError instanceof Error ? networkError.message : String(networkError);
      throw new ExternalServiceError('WooCommerce', `Network error: ${message}`);
    }

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new ExternalServiceError('WooCommerce', 'Failed to parse API response.');
    }
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorBody: string;
    try {
      errorBody = await response.text();
    } catch {
      errorBody = response.statusText;
    }

    switch (response.status) {
      case 401:
        throw new ExternalServiceError(
          'WooCommerce',
          'Invalid consumer key or secret. Please check your WooCommerce API credentials.'
        );
      case 403:
        throw new ExternalServiceError(
          'WooCommerce',
          'Access denied. Ensure the API keys have Read permissions and REST API is enabled.'
        );
      case 404:
        throw new ExternalServiceError(
          'WooCommerce',
          `WooCommerce REST API not found at ${this.storeUrl}. Confirm WooCommerce is installed and pretty permalinks are enabled.`
        );
      case 429:
        throw new ExternalServiceError(
          'WooCommerce',
          'Too many requests. Please wait before syncing again.'
        );
      case 500:
      case 503:
        throw new ExternalServiceError(
          'WooCommerce',
          'WooCommerce API is temporarily unavailable. Please try again later.'
        );
      default:
        throw new ExternalServiceError(
          'WooCommerce',
          `Unexpected API error (${response.status}): ${errorBody.slice(0, 200)}`
        );
    }
  }

  // ─── Public Methods ────────────────────────────────────────────────────────

  /**
   * Validate credentials by fetching the system status endpoint.
   * A 200 response confirms the key/secret pair is valid and has read access.
   */
  async validateCredentials(): Promise<{ storeName: string; currency: string; version: string }> {
    const data = await this.request<{
      environment: { version: string; store_id: string };
      currency: string;
      store_name?: string;
    }>('/system_status');

    return {
      storeName: data.store_name ?? this.storeUrl,
      currency: data.currency ?? 'USD',
      version: data.environment?.version ?? 'unknown',
    };
  }

  /**
   * Fetch all products using page-based pagination.
   * For variable products, fetches individual variations in a follow-up call.
   */
  async fetchAllProducts(): Promise<NormalizedProduct[]> {
    const allProducts: NormalizedProduct[] = [];
    const perPage = 100; // WooCommerce max per_page
    let page = 1;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const products = await this.request<WooProduct[]>('/products', {
        per_page: String(perPage),
        page: String(page),
        status: 'any',
      });

      if (!products || products.length === 0) break;

      for (const product of products) {
        const normalized = await this.normalizeProduct(product);
        allProducts.push(normalized);
      }

      if (products.length < perPage) break;
      page += 1;
    }

    return allProducts;
  }

  /**
   * Fetch a single product by its WooCommerce ID.
   */
  async fetchProduct(wooProductId: string): Promise<NormalizedProduct> {
    const product = await this.request<WooProduct>(`/products/${wooProductId}`);
    return this.normalizeProduct(product);
  }

  // ─── Variation Fetcher ─────────────────────────────────────────────────────

  /**
   * Fetch all variations for a variable product.
   * WooCommerce stores variants as child "variation" objects under a parent product.
   */
  private async fetchVariations(productId: number): Promise<WooVariation[]> {
    try {
      return await this.request<WooVariation[]>(`/products/${productId}/variations`, {
        per_page: '100',
      });
    } catch {
      // Non-fatal — fall back to an empty array so the parent product still syncs
      return [];
    }
  }

  // ─── Normalizer ────────────────────────────────────────────────────────────

  /**
   * Map a raw WooCommerce product into the project's unified NormalizedProduct shape.
   */
  private async normalizeProduct(p: WooProduct): Promise<NormalizedProduct> {
    const currency = 'USD'; // Overridden by store's posterDefaults.currency

    // Images — WooCommerce images are 1-indexed; normalize to 0-indexed
    const images: IProductImage[] = (p.images ?? []).map((img, idx) => ({
      url: img.src,
      altText: img.alt || img.name || undefined,
      position: idx,
      sourceId: String(img.id),
    }));

    // Variants — for simple products, synthesize a single variant from the product itself
    let variants: IProductVariant[] = [];

    if (p.type === 'variable' && p.variations && p.variations.length > 0) {
      const wooVariations = await this.fetchVariations(p.id);
      variants = wooVariations.map((v): IProductVariant => {
        const attributes: Record<string, string> = {};
        (v.attributes ?? []).forEach((a) => { attributes[a.name] = a.option; });

        const varPrice = parsePrice(v.price) || parsePrice(v.regular_price);
        const salePrice = parsePrice(v.sale_price);

        return {
          sourceId: String(v.id),
          title: Object.values(attributes).join(' / ') || `Variation ${v.id}`,
          sku: v.sku || undefined,
          price: varPrice,
          compareAtPrice: v.on_sale && salePrice > 0 ? parsePrice(v.regular_price) : undefined,
          currency,
          inventory: v.stock_quantity ?? -1,
          weight: parseDimension(v.weight),
          weightUnit: 'kg',
          attributes,
          isAvailable: v.stock_status === 'instock' || v.stock_quantity === null,
        };
      });
    } else {
      // Simple product — one synthetic variant
      const price = parsePrice(p.price) || parsePrice(p.regular_price);
      const salePrice = parsePrice(p.sale_price);

      variants = [
        {
          sourceId: String(p.id),
          title: 'Default',
          sku: p.sku || undefined,
          price,
          compareAtPrice: p.on_sale && salePrice > 0 ? parsePrice(p.regular_price) : undefined,
          currency,
          inventory: p.stock_quantity ?? -1,
          weight: parseDimension(p.weight),
          weightUnit: 'kg',
          attributes: {},
          isAvailable: p.stock_status === 'instock' || p.stock_quantity === null,
        },
      ];
    }

    const primaryVariant = variants[0];
    const price = primaryVariant ? primaryVariant.price : 0;
    const compareAtPrice = primaryVariant?.compareAtPrice;

    return {
      sourceId: String(p.id),
      name: p.name,
      description: stripHtml(p.description),
      shortDescription: stripHtml(p.short_description),
      vendor: this.storeUrl,           // WooCommerce has no vendor field; use store URL
      productType: p.type,
      externalUrl: p.permalink,
      status: mapWooStatus(p.status, p.stock_status),
      tags: (p.tags ?? []).map((t) => t.name),
      categories: (p.categories ?? []).map((c) => c.name),
      sku: p.sku,
      price,
      compareAtPrice,
      currency,
      images,
      variants,
      sourceCreatedAt: new Date(p.date_created),
      sourceUpdatedAt: new Date(p.date_modified),
    };
  }
}

export default WooCommerceService;
