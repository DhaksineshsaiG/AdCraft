const mockStoreFindUnique = jest.fn();
const mockProductFindUnique = jest.fn();
const mockCampaignCreate = jest.fn();
const mockCampaignUpdate = jest.fn();
const mockCampaignFindUnique = jest.fn();
const mockCampaignFindMany = jest.fn();
const mockGeneratedContentFindFirst = jest.fn();

jest.mock('../database/prisma', () => ({
  __esModule: true,
  default: {
    store: {
      findUnique: mockStoreFindUnique,
    },
    product: {
      findUnique: mockProductFindUnique,
    },
    campaign: {
      create: mockCampaignCreate,
      update: mockCampaignUpdate,
      findUnique: mockCampaignFindUnique,
      findMany: mockCampaignFindMany,
    },
    generatedContent: {
      findFirst: mockGeneratedContentFindFirst,
    },
  },
}));

const mockGenerateCampaignPoster = jest.fn();
jest.mock('../agent/tools/PosterGeneratorTool', () => {
  return jest.fn().mockImplementation(() => ({
    generateCampaignPoster: mockGenerateCampaignPoster,
  }));
});

import { CampaignService } from './campaign.service';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  AppError,
} from '../middleware/errorMiddleware';

describe('CampaignService', () => {
  let service: CampaignService;
  const storeId = 'store-uuid-1';
  const productId = 'prod-uuid-1';
  const ownerId = 'owner-uuid-1';
  const campaignId = 'campaign-uuid-1';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CampaignService();
  });

  describe('createCampaign', () => {
    test('throws NotFoundError if store does not exist', async () => {
      mockStoreFindUnique.mockResolvedValue(null);

      await expect(
        service.createCampaign({ storeId, productId }, ownerId)
      ).rejects.toThrow(NotFoundError);
    });

    test('throws ForbiddenError if store is owned by another merchant', async () => {
      mockStoreFindUnique.mockResolvedValue({
        id: storeId,
        ownerId: 'different-merchant',
        isArchived: false,
      });

      await expect(
        service.createCampaign({ storeId, productId }, ownerId)
      ).rejects.toThrow(ForbiddenError);
    });

    test('throws ValidationError if product does not belong to store', async () => {
      mockStoreFindUnique.mockResolvedValue({
        id: storeId,
        name: 'My Store',
        ownerId,
        isArchived: false,
      });
      mockProductFindUnique.mockResolvedValue({
        id: productId,
        storeId: 'different-store',
        ownerId,
      });

      await expect(
        service.createCampaign({ storeId, productId }, ownerId)
      ).rejects.toThrow(ValidationError);
    });

    test('successfully orchestrates: DRAFT -> GENERATING -> PENDING_APPROVAL', async () => {
      const store = { id: storeId, name: 'My Store', ownerId, isArchived: false };
      const product = {
        id: productId,
        storeId,
        ownerId,
        name: 'Trail Running Shoes',
        price: 120,
        currency: 'USD',
        categories: ['Footwear'],
        tags: ['trail'],
        images: [{ url: 'https://example.com/shoes.jpg', position: 0 }],
        variants: [],
      };

      mockStoreFindUnique.mockResolvedValue(store);
      mockProductFindUnique.mockResolvedValue(product);
      mockGeneratedContentFindFirst.mockResolvedValue(null);

      // 1. Create in DRAFT
      mockCampaignCreate.mockResolvedValue({
        id: campaignId,
        name: 'Campaign — Trail Running Shoes',
        objective: 'Drive sales',
        strategy: 'Promote comfort',
        status: 'draft',
        storeId,
        productId,
        ownerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 2. Move to GENERATING
      mockCampaignUpdate.mockImplementation(({ data }: any) => ({
        id: campaignId,
        name: 'Campaign — Trail Running Shoes',
        objective: 'Drive sales',
        strategy: 'Promote comfort',
        status: data.status,
        posterId: data.posterId ?? null,
        posterUrl: data.posterUrl ?? null,
        marketingContent: data.marketingContent ?? null,
        storeId,
        productId,
        ownerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // 3. Poster generation succeeds
      mockGenerateCampaignPoster.mockResolvedValue({
        success: true,
        posterId: 'poster-uuid-1',
        posterUrl: 'https://storage.example.com/posters/poster-1.png',
      });

      const result = await service.createCampaign(
        {
          storeId,
          productId,
          name: 'Summer Trail Kickoff',
          suggestedOffer: 'Save 20%',
        },
        ownerId
      );

      expect(result.id).toBe(campaignId);
      expect(result.status).toBe('pending_approval');
      expect(result.posterId).toBe('poster-uuid-1');
      expect(result.posterUrl).toBe('https://storage.example.com/posters/poster-1.png');

      // Verify lifecycle transitions
      expect(mockCampaignCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'draft' }) })
      );
      expect(mockCampaignUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'generating' }) })
      );
      expect(mockCampaignUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'pending_approval' }) })
      );
    });

    test('transitions safely to FAILED when poster generation fails', async () => {
      const store = { id: storeId, name: 'My Store', ownerId, isArchived: false };
      const product = {
        id: productId,
        storeId,
        ownerId,
        name: 'Corrupt Image Item',
        price: 50,
        currency: 'USD',
        categories: [],
        tags: [],
        images: [{ url: 'https://example.com/broken.jpg', position: 0 }],
        variants: [],
      };

      mockStoreFindUnique.mockResolvedValue(store);
      mockProductFindUnique.mockResolvedValue(product);
      mockGeneratedContentFindFirst.mockResolvedValue(null);

      mockCampaignCreate.mockResolvedValue({
        id: campaignId,
        status: 'draft',
        storeId,
        productId,
        ownerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockCampaignUpdate.mockResolvedValue({
        id: campaignId,
        status: 'failed',
        failureReason: 'Sharp rendering failure',
        storeId,
        productId,
        ownerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockGenerateCampaignPoster.mockResolvedValue({
        success: false,
        error: 'Sharp rendering failure',
      });

      await expect(
        service.createCampaign({ storeId, productId }, ownerId)
      ).rejects.toThrow(AppError);

      expect(mockCampaignUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: campaignId },
          data: expect.objectContaining({
            status: 'failed',
            failureReason: 'Sharp rendering failure',
          }),
        })
      );
    });
  });

  describe('Merchant Approval Gate (approveCampaign)', () => {
    test('successfully approves campaign in PENDING_APPROVAL state', async () => {
      mockCampaignFindUnique.mockResolvedValue({
        id: campaignId,
        status: 'pending_approval',
        storeId,
        productId,
        ownerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockCampaignUpdate.mockResolvedValue({
        id: campaignId,
        status: 'approved',
        storeId,
        productId,
        ownerId,
        approvedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const approved = await service.approveCampaign(campaignId, ownerId);
      expect(approved.status).toBe('approved');
      expect(mockCampaignUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: campaignId },
          data: expect.objectContaining({
            status: 'approved',
          }),
        })
      );
    });

    test('blocks approval if requesting user is not the merchant owner', async () => {
      mockCampaignFindUnique.mockResolvedValue({
        id: campaignId,
        status: 'pending_approval',
        ownerId: 'real-owner',
      });

      await expect(
        service.approveCampaign(campaignId, 'unauthorized-user')
      ).rejects.toThrow(ForbiddenError);
    });

    test('blocks re-approval of already approved campaign', async () => {
      mockCampaignFindUnique.mockResolvedValue({
        id: campaignId,
        status: 'approved',
        ownerId,
      });

      await expect(
        service.approveCampaign(campaignId, ownerId)
      ).rejects.toThrow(ValidationError);
    });

    test('blocks approval of campaign in FAILED or DRAFT state', async () => {
      mockCampaignFindUnique.mockResolvedValue({
        id: campaignId,
        status: 'failed',
        ownerId,
      });

      await expect(
        service.approveCampaign(campaignId, ownerId)
      ).rejects.toThrow(ValidationError);
    });
  });
});
