const mockStoreFindUnique = jest.fn();
const mockProductFindMany = jest.fn();

jest.mock('../database/prisma', () => ({
  __esModule: true,
  default: {
    store: {
      findUnique: mockStoreFindUnique,
    },
    product: {
      findMany: mockProductFindMany,
    },
  },
}));

import GrowthAgent from './GrowthAgent';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../middleware/errorMiddleware';

describe('GrowthAgent', () => {
  let agent: GrowthAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new GrowthAgent();
  });

  test('throws NotFoundError if store does not exist', async () => {
    mockStoreFindUnique.mockResolvedValue(null);

    await expect(
      agent.analyzeStore('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'user-owner-1')
    ).rejects.toThrow(NotFoundError);
  });

  test('throws ForbiddenError if store is owned by another user', async () => {
    mockStoreFindUnique.mockResolvedValue({
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      name: 'Sneaker Store',
      ownerId: 'different-user',
      isArchived: false,
    });

    await expect(
      agent.analyzeStore('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'user-owner-1')
    ).rejects.toThrow(ForbiddenError);
  });

  test('throws ValidationError if store has no products', async () => {
    mockStoreFindUnique.mockResolvedValue({
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      name: 'Empty Store',
      ownerId: 'user-owner-1',
      isArchived: false,
    });
    mockProductFindMany.mockResolvedValue([]);

    await expect(
      agent.analyzeStore('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'user-owner-1')
    ).rejects.toThrow(ValidationError);
  });

  test('successfully analyzes store products and returns structured recommendation', async () => {
    mockStoreFindUnique.mockResolvedValue({
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      name: 'Demo Urban Footwear',
      ownerId: 'user-owner-1',
      isArchived: false,
    });

    mockProductFindMany.mockResolvedValue([
      {
        id: 'p-1',
        sourceId: 'src-1',
        source: 'shopify',
        name: 'Nike Air Max Running Shoes',
        price: 129.99,
        compareAtPrice: 159.99,
        currency: 'USD',
        images: [{ url: 'https://images.unsplash.com/shoes.jpg', position: 0 }],
        categories: ['Footwear'],
        tags: ['running', 'sneakers'],
        variants: [{ title: 'Black / 10', price: 129.99, inventory: 25, isAvailable: true }],
        status: 'active',
        processingStatus: 'ready',
        description: 'High-performance running shoe with responsive cushioning.',
        storeId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        ownerId: 'user-owner-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncedAt: new Date(),
      },
      {
        id: 'p-2',
        sourceId: 'src-2',
        source: 'shopify',
        name: 'Basic Cotton Socks',
        price: 9.99,
        compareAtPrice: null,
        currency: 'USD',
        images: [{ url: 'https://images.unsplash.com/socks.jpg', position: 0 }],
        categories: ['Accessories'],
        tags: ['socks'],
        variants: [{ title: 'White', price: 9.99, inventory: 5, isAvailable: true }],
        status: 'active',
        processingStatus: 'ready',
        description: 'Cotton ankle socks.',
        storeId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        ownerId: 'user-owner-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncedAt: new Date(),
      },
    ]);

    const result = await agent.analyzeStore(
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      'user-owner-1'
    );

    expect(result.storeId).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    expect(result.storeName).toBe('Demo Urban Footwear');
    expect(result.catalogSummary.totalProducts).toBe(2);
    expect(result.topOpportunity.productId).toBe('p-1');
    expect(result.topOpportunity.productName).toBe('Nike Air Max Running Shoes');
    expect(result.topOpportunity.score).toBeGreaterThan(60);
    expect(result.recommendation).toBeDefined();
    expect(result.recommendation.objective).toBeTruthy();
    expect(result.recommendation.strategy).toBeTruthy();
    expect(result.recommendation.suggestedCampaignName).toBeTruthy();
    expect(result.recommendation.suggestedOffer).toBeTruthy();
    expect(result.recommendation.targetAudience).toBeTruthy();
    expect(result.recommendation.rationale).toBeTruthy();
  });
});
