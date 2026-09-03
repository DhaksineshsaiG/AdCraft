import GrowthOpportunityDetector from './GrowthOpportunityDetector';
import {
  IProductDocument,
  ProductProcessingStatus,
  ProductSource,
  ProductStatus,
} from '../models/Product';

function createMockProduct(overrides: Partial<IProductDocument> = {}): IProductDocument {
  const now = new Date();
  return {
    _id: 'prod-uuid-1',
    id: 'prod-uuid-1',
    sourceId: 'src-1',
    source: ProductSource.MANUAL,
    name: 'Standard Product',
    price: 100,
    compareAtPrice: undefined,
    currency: 'USD',
    images: [
      {
        url: 'https://example.com/image.jpg',
        position: 0,
      },
    ],
    categories: ['Apparel'],
    tags: ['classic'],
    variants: [
      {
        title: 'Default',
        price: 100,
        currency: 'USD',
        inventory: 30,
        isAvailable: true,
        attributes: {},
      },
    ],
    hasVariants: false,
    dimensions: {},
    status: ProductStatus.ACTIVE,
    processingMetadata: {
      status: ProductProcessingStatus.READY,
      processedAt: now,
    },
    store: 'store-uuid-1',
    owner: 'user-uuid-1',
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
    primaryImage: { url: 'https://example.com/image.jpg', position: 0 },
    cheapestVariant: null,
    description: 'A well-crafted product designed for everyday utility.',
    ...overrides,
  };
}

describe('GrowthOpportunityDetector', () => {
  let detector: GrowthOpportunityDetector;

  beforeEach(() => {
    detector = new GrowthOpportunityDetector();
  });

  test('returns empty array when no products are provided', () => {
    expect(detector.detect([])).toEqual([]);
  });

  test('filters out archived products', () => {
    const active = createMockProduct({ _id: 'p-1', status: ProductStatus.ACTIVE });
    const archived = createMockProduct({ _id: 'p-2', status: ProductStatus.ARCHIVED });

    const results = detector.detect([active, archived]);
    expect(results).toHaveLength(1);
    expect(results[0].productId).toBe('p-1');
  });

  test('scores discounted product higher than full-price product with identical assets', () => {
    const discounted = createMockProduct({
      _id: 'p-discount',
      name: 'Discounted Item',
      price: 80,
      compareAtPrice: 100, // 20% discount
    });

    const fullPrice = createMockProduct({
      _id: 'p-regular',
      name: 'Regular Item',
      price: 100,
      compareAtPrice: undefined,
    });

    const results = detector.detect([fullPrice, discounted]);
    expect(results[0].productId).toBe('p-discount');
    expect(results[0].score).toBeGreaterThan(results[1].score);
    expect(results[0].signals.hasDiscount).toBe(true);
    expect(results[0].signals.discountPercent).toBe(20);
    expect(results[0].reasons.some((r) => r.includes('20% compare-at discount'))).toBe(true);
  });

  test('correctly captures inventory signals without fabricating sales data', () => {
    const inStock = createMockProduct({
      _id: 'p-instock',
      variants: [
        {
          title: 'V1',
          price: 50,
          currency: 'USD',
          inventory: 45,
          isAvailable: true,
          attributes: {},
        },
      ],
    });

    const result = detector.evaluateProduct(inStock);
    expect(result.signals.hasInventoryTracking).toBe(true);
    expect(result.signals.totalInventory).toBe(45);
    expect(result.signals.isAvailable).toBe(true);
    expect(result.reasons.some((r) => r.includes('45 units recorded in stock'))).toBe(true);
  });

  test('penalizes products without imagery', () => {
    const withImage = createMockProduct({
      _id: 'p-img',
      images: [{ url: 'https://example.com/hero.jpg', position: 0 }],
    });

    const noImage = createMockProduct({
      _id: 'p-no-img',
      images: [],
    });

    const results = detector.detect([noImage, withImage]);
    expect(results[0].productId).toBe('p-img');
    expect(results[1].score).toBeLessThan(results[0].score);
    expect(results[1].signals.hasPrimaryImage).toBe(false);
    expect(results[1].reasons.some((r) => r.includes('Warning: No product images detected'))).toBe(true);
  });
});
