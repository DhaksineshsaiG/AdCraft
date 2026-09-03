import { IProductImage, IProductVariant, ProductStatus } from '../models/Product';
import { ExternalServiceError } from '../middleware/errorMiddleware';

// ─── Shopify API Types ────────────────────────────────────────────────────────
// Minimal shapes for the Shopify Admin REST API responses we consume.
// Only the fields this service actually reads are typed; the rest are unknown.

interface ShopifyImage {
  id: number;
  src: string;
  alt: string | null;
  width: number;
  height: number;
  position: number;
}

interface ShopifyVariant {
  id: number;
  title: string;
  sku: string | null;
  price: string;             // Shopify returns prices as strings
  compare_at_price: string | null;
  inventory_quantity: number;
  barcode: string | null;
  weight: number;
  weight_unit: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  taxable: boolean;
}

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string | null;
  vendor: string;
  product_type: string;
  handle: string;
  status: string;            // 'active' | 'draft' | 'archived'
  tags: string;              // Comma-separated tag list
  variants: ShopifyVariant[];
  images: ShopifyImage[];
  options: Array<{ name: string; values: string[] }>;
  created_at: string;
  updated_at: string;
}

interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

interface ShopifyApiResponse<T> {
  data: T;
  headers: Headers;
}

interface ShopifyShopResponse {
  shop: {
    id: number;
    name: string;
    domain: string;
    myshopify_domain: string;
    currency: string;
  };
}

interface ShopifyProductStatusesResponse {
  data?: {
    products?: {
      nodes?: Array<{
        legacyResourceId: string | number;
        status: string;
      }>;
      pageInfo?: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
    };
  };
  errors?: Array<{ message?: string }>;
}

interface ShopifyProductStatusesPage {
  products: {
    nodes: Array<{ legacyResourceId: string | number; status: string }>;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

// ─── Normalized Output Types ──────────────────────────────────────────────────

export interface NormalizedProduct {
  sourceId: string;
  name: string;
  description: string;
  vendor: string;
  productType: string;
  externalUrl: string;
  status: ProductStatus;
  tags: string[];
  price: number;
  compareAtPrice: number | undefined;
  currency: string;
  images: IProductImage[];
  variants: IProductVariant[];
  sourceCreatedAt: Date;
  sourceUpdatedAt: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_SHOPIFY_API_VERSION = '2026-01';
const STATUS_GRAPHQL_API_VERSION = '2026-01';

function parsePrice(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

function mapShopifyStatus(status: string): ProductStatus {
  switch (status.trim().toLowerCase()) {
    case 'active':
      return ProductStatus.ACTIVE;
    case 'draft':
      return ProductStatus.DRAFT;
    case 'archived':
      return ProductStatus.ARCHIVED;
    case 'unlisted':
      // We treat Shopify's hidden/unlisted products as archived in our app so
      // they stay out of normal product flows without deleting related posters.
      return ProductStatus.ARCHIVED;
    default:
      return ProductStatus.ACTIVE;
  }
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function isDefaultShopifyOption(name: string | undefined, value: string | null | undefined): boolean {
  return (
    (name ?? '').toLowerCase() === 'title' &&
    (value ?? '').toLowerCase() === 'default title'
  );
}

function buildVariantTitle(
  rawTitle: string,
  attributes: Record<string, string>
): string {
  const values = Object.entries(attributes)
    .filter(([name, value]) => !isDefaultShopifyOption(name, value))
    .map(([name, value]) => `${name}: ${value}`);

  if (values.length > 0) return values.join(' / ');

  return rawTitle.toLowerCase() === 'default title' ? 'Default' : rawTitle;
}

function parseNextPageInfo(linkHeader: string | null): string | null {
  if (!linkHeader) return null;

  const nextLink = linkHeader
    .split(',')
    .map((part) => part.trim())
    .find((part) => part.includes('rel="next"'));

  if (!nextLink) return null;

  const match = nextLink.match(/<([^>]+)>/);
  if (!match) return null;

  try {
    return new URL(match[1]).searchParams.get('page_info');
  } catch {
    return null;
  }
}

// ─── Shopify Service Class ────────────────────────────────────────────────────

export class ShopifyService {
  private readonly baseUrl: string;
  private readonly graphqlStatusUrl: string;
  private readonly headers: Record<string, string>;
  private readonly shopDomain: string;

  constructor(
    shopDomain: string,
    accessToken: string,
    apiVersion: string = DEFAULT_SHOPIFY_API_VERSION
  ) {
    this.shopDomain = shopDomain;
    this.baseUrl = `https://${shopDomain}/admin/api/${apiVersion}`;
    this.graphqlStatusUrl = `https://${shopDomain}/admin/api/${STATUS_GRAPHQL_API_VERSION}/graphql.json`;
    this.headers = {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    };
  }

  // ─── Core Fetch ────────────────────────────────────────────────────────────

  private async request<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    return (await this.requestWithHeaders<T>(endpoint, params)).data;
  }

  private async requestWithHeaders<T>(
    endpoint: string,
    params?: Record<string, string>
  ): Promise<ShopifyApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.headers,
      });
    } catch (networkError) {
      const message = networkError instanceof Error ? networkError.message : String(networkError);
      throw new ExternalServiceError('Shopify', `Network error: ${message}`);
    }

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    try {
      const data = (await response.json()) as T;
      return { data, headers: response.headers };
    } catch {
      throw new ExternalServiceError('Shopify', 'Failed to parse API response.');
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
          'Shopify',
          'Invalid or expired access token. Please reconnect your store.'
        );
      case 403:
        throw new ExternalServiceError(
          'Shopify',
          'Access denied. Ensure your app has the required scopes (read_products).'
        );
      case 404:
        throw new ExternalServiceError(
          'Shopify',
          `Resource not found. Verify the shop domain is correct: ${this.shopDomain}`
        );
      case 429:
        throw new ExternalServiceError(
          'Shopify',
          'API rate limit exceeded. Please wait before syncing again.'
        );
      case 500:
      case 503:
        throw new ExternalServiceError(
          'Shopify',
          'Shopify API is temporarily unavailable. Please try again later.'
        );
      default:
        throw new ExternalServiceError(
          'Shopify',
          `Unexpected API error (${response.status}): ${errorBody.slice(0, 200)}`
        );
    }
  }

  private async requestGraphQL<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(this.graphqlStatusUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ query, variables }),
      });
    } catch (networkError) {
      const message = networkError instanceof Error ? networkError.message : String(networkError);
      throw new ExternalServiceError('Shopify', `Network error: ${message}`);
    }

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    let payload: ShopifyProductStatusesResponse;
    try {
      payload = (await response.json()) as ShopifyProductStatusesResponse;
    } catch {
      throw new ExternalServiceError('Shopify', 'Failed to parse API response.');
    }

    if (payload.errors?.length) {
      const message = payload.errors
        .map((error) => error.message?.trim())
        .filter((error): error is string => Boolean(error))
        .join('; ');
      throw new ExternalServiceError(
        'Shopify',
        message || 'Shopify GraphQL request failed.'
      );
    }

    if (!payload.data) {
      throw new ExternalServiceError('Shopify', 'Shopify GraphQL response was empty.');
    }

    return payload.data as T;
  }

  private async fetchProductStatuses(): Promise<Map<string, ProductStatus>> {
    const statuses = new Map<string, ProductStatus>();
    const query = `
      query FetchProductStatuses($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          nodes {
            legacyResourceId
            status
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    let after: string | null = null;

    while (true) {
      const page: ShopifyProductStatusesPage = await this.requestGraphQL<ShopifyProductStatusesPage>(
        query,
        { first: 250, after }
      );

      for (const product of page.products.nodes ?? []) {
        statuses.set(String(product.legacyResourceId), mapShopifyStatus(product.status));
      }

      if (!page.products.pageInfo.hasNextPage || !page.products.pageInfo.endCursor) {
        break;
      }

      after = page.products.pageInfo.endCursor;
    }

    return statuses;
  }

  // ─── Public Methods ────────────────────────────────────────────────────────

  /**
   * Validate credentials by fetching the shop resource.
   * This is a lightweight call used on store connection.
   */
  async validateCredentials(): Promise<{ shopName: string; currency: string }> {
    const data = await this.request<ShopifyShopResponse>('/shop.json');
    return {
      shopName: data.shop.name,
      currency: data.shop.currency,
    };
  }

  /**
   * Fetch all products with cursor-based pagination.
   * Automatically follows pages until all products are fetched.
   */
  async fetchAllProducts(): Promise<NormalizedProduct[]> {
    const allProducts: ShopifyProduct[] = [];
    const limit = 250; // Maximum allowed by Shopify
    let pageInfo: string | null = null;

    while (true) {
      const params: Record<string, string> = {
        limit: String(limit),
        published_status: 'any',
        fields: [
          'id', 'title', 'body_html', 'vendor', 'product_type',
          'handle', 'status', 'tags', 'variants', 'images',
          'options', 'created_at', 'updated_at',
        ].join(','),
      };

      // Cursor-based pagination: after the first page, use page_info
      if (pageInfo) {
        params['page_info'] = pageInfo;
        // When using page_info, limit is the only other allowed param
        delete params['published_status'];
        delete params['fields'];
      }

      const { data, headers } = await this.requestWithHeaders<ShopifyProductsResponse>(
        '/products.json',
        params
      );
      
      const products = data.products ?? [];

      allProducts.push(...products);

      // Shopify cursor pagination uses the Link header — for simplicity
      // we break when fewer products than limit are returned
      pageInfo = parseNextPageInfo(headers.get('link'));

      if (!pageInfo) break;

    }

    const statusMap = await this.fetchProductStatuses();

    return allProducts.map((product) =>
      this.normalizeProduct({
        ...product,
        status: statusMap.get(String(product.id)) ?? mapShopifyStatus(product.status),
      })
    );
  }

  /**
   * Fetch a single product by its Shopify ID.
   */
  async fetchProduct(shopifyProductId: string): Promise<NormalizedProduct> {
    const data = await this.request<{ product: ShopifyProduct }>(
      `/products/${shopifyProductId}.json`
    );
    return this.normalizeProduct(data.product);
  }

  // ─── Normalizer ────────────────────────────────────────────────────────────

  /**
   * Map a raw Shopify product into the project's unified NormalizedProduct shape.
   * This keeps all Shopify-specific field names out of the Product model.
   */
  private normalizeProduct(p: ShopifyProduct): NormalizedProduct {
    // Currency comes from the shop level; variants carry the price string
    const currency = 'USD'; // Will be overridden by store's posterDefaults.currency

    const images: IProductImage[] = (p.images ?? []).map((img) => ({
      url: img.src,
      altText: img.alt ?? undefined,
      width: img.width,
      height: img.height,
      position: img.position - 1, // Shopify is 1-indexed; we store 0-indexed
      sourceId: String(img.id),
    }));

    const variants: IProductVariant[] = (p.variants ?? []).map((v) => {
      // Build attributes from Shopify option slots
      const attributes: Record<string, string> = {};
      if (v.option1 && p.options[0] && !isDefaultShopifyOption(p.options[0].name, v.option1)) {
        attributes[p.options[0].name] = v.option1;
      }
      if (v.option2 && p.options[1] && !isDefaultShopifyOption(p.options[1].name, v.option2)) {
        attributes[p.options[1].name] = v.option2;
      }
      if (v.option3 && p.options[2] && !isDefaultShopifyOption(p.options[2].name, v.option3)) {
        attributes[p.options[2].name] = v.option3;
      }

      return {
        sourceId: String(v.id),
        title: buildVariantTitle(v.title, attributes),
        sku: v.sku ?? undefined,
        price: parsePrice(v.price),
        compareAtPrice: v.compare_at_price ? parsePrice(v.compare_at_price) : undefined,
        currency,
        inventory: v.inventory_quantity,
        barcode: v.barcode ?? undefined,
        weight: v.weight,
        weightUnit: v.weight_unit,
        attributes,
        isAvailable: v.inventory_quantity === -1 || v.inventory_quantity > 0,
      };
    });

    // Use the lowest variant price as the product-level price
    const primaryVariant = variants[0];
    const price = primaryVariant ? primaryVariant.price : 0;
    const compareAtPrice = primaryVariant?.compareAtPrice;

    const tags = p.tags
      ? p.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    return {
      sourceId: String(p.id),
      name: p.title,
      description: stripHtml(p.body_html),
      vendor: p.vendor,
      productType: p.product_type,
      externalUrl: `https://${this.shopDomain}/products/${p.handle}`,
      status:
        typeof p.status === 'string'
          ? mapShopifyStatus(p.status)
          : (p.status as ProductStatus),
      tags,
      price,
      compareAtPrice,
      currency,
      images,
      variants,
      sourceCreatedAt: new Date(p.created_at),
      sourceUpdatedAt: new Date(p.updated_at),
    };
  }
}

export default ShopifyService;
