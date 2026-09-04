import crypto from 'crypto';

const mockStoreFindUnique = jest.fn();
const mockProductFindMany = jest.fn();
const mockProductFindUnique = jest.fn();
const mockCampaignCreate = jest.fn();
const mockCampaignUpdate = jest.fn();
const mockCampaignFindUnique = jest.fn();
const mockCampaignFindFirst = jest.fn();
const mockPaymentCreate = jest.fn();
const mockPaymentUpdate = jest.fn();
const mockPaymentFindFirst = jest.fn();
const mockGeneratedContentFindFirst = jest.fn();

jest.mock('../database/prisma', () => ({
  __esModule: true,
  default: {
    store: { findUnique: mockStoreFindUnique },
    product: { findMany: mockProductFindMany, findUnique: mockProductFindUnique },
    campaign: {
      create: mockCampaignCreate,
      update: mockCampaignUpdate,
      findUnique: mockCampaignFindUnique,
      findFirst: mockCampaignFindFirst,
    },
    payment: {
      create: mockPaymentCreate,
      update: mockPaymentUpdate,
      findFirst: mockPaymentFindFirst,
    },
    generatedContent: { findFirst: mockGeneratedContentFindFirst },
  },
}));

const mockGeneratePoster = jest.fn();
jest.mock('../services/poster.service', () => ({
  generatePoster: mockGeneratePoster,
}));

const mockOrdersCreate = jest.fn();
jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: { create: mockOrdersCreate },
  }));
});

// Set Razorpay test credentials
process.env.RAZORPAY_KEY_ID = 'rzp_test_buildathonKey';
process.env.RAZORPAY_KEY_SECRET = 'buildathonSecret1234567890';
process.env.CAMPAIGN_EXECUTION_AMOUNT = '499';

import GrowthAgent from './GrowthAgent';
import campaignService from '../services/campaign.service';
import paymentService from '../services/payment.service';
import { ValidationError } from '../middleware/errorMiddleware';

describe('Track 01 — Full Agentic Commerce Pipeline (Phases 1, 2, 3)', () => {
  const storeId = 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa';
  const productId = 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb';
  const ownerId = 'cccccccc-3333-3333-3333-cccccccccccc';
  const campaignId = 'dddddddd-4444-4444-4444-dddddddddddd';
  const paymentId = 'eeeeeeee-5555-5555-5555-eeeeeeeeeeee';
  const rzpOrderId = 'order_buildathon_999999';

  const mockStore = {
    id: storeId,
    name: 'Buildathon Flagship Store',
    ownerId,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProduct = {
    id: productId,
    sourceId: 'src-bld-1',
    source: 'shopify',
    name: 'Pro Wireless Earbuds',
    price: 99,
    compareAtPrice: 129, // 23% discount
    currency: 'USD',
    images: [{ url: 'https://cdn.example.com/earbuds.png', position: 0 }],
    categories: ['Electronics'],
    tags: ['audio', 'wireless'],
    variants: [{ title: 'Black', price: 99, inventory: 50, isAvailable: true }],
    status: 'active',
    processingStatus: 'ready',
    description: 'High-fidelity noise cancelling wireless earbuds.',
    storeId,
    ownerId,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSyncedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCampaignFindFirst.mockResolvedValue(null);
    mockStoreFindUnique.mockResolvedValue(mockStore);
    mockProductFindMany.mockResolvedValue([mockProduct]);
    mockProductFindUnique.mockResolvedValue(mockProduct);
    mockGeneratedContentFindFirst.mockResolvedValue(null);
  });

  test('complete flow: AI Opportunity Detection -> Campaign Creation -> Poster Tool -> Merchant Approval -> Razorpay Order -> Signature Verification -> Campaign ACTIVE', async () => {
    // ══════════════════════════════════════════════════════════════════════════
    // PHASE 1: AI Growth Brain analyzes store and selects top opportunity
    // ══════════════════════════════════════════════════════════════════════════
    const growthAgent = new GrowthAgent();
    const growthAnalysis = await growthAgent.analyzeStore(storeId, ownerId);

    expect(growthAnalysis.storeId).toBe(storeId);
    expect(growthAnalysis.topOpportunity.productId).toBe(productId);
    expect(growthAnalysis.topOpportunity.score).toBeGreaterThan(70);
    expect(growthAnalysis.recommendation.suggestedCampaignName).toBeTruthy();

    // ══════════════════════════════════════════════════════════════════════════
    // PHASE 2: Campaign Orchestrator prepares creative and awaits approval
    // ══════════════════════════════════════════════════════════════════════════
    mockCampaignCreate.mockResolvedValue({
      id: campaignId,
      name: growthAnalysis.recommendation.suggestedCampaignName,
      status: 'draft',
      storeId,
      productId,
      ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockGeneratePoster.mockResolvedValue({
      _id: 'poster-bld-1',
      posterUrl: 'https://cdn.adcraft.app/posters/bld-1.png',
      generationStatus: 'completed',
      dimensions: { width: 1080, height: 1080, unit: 'px' },
    });

    mockCampaignUpdate.mockImplementation(({ data }: any) => ({
      id: campaignId,
      name: growthAnalysis.recommendation.suggestedCampaignName,
      status: data.status,
      posterId: data.posterId ?? null,
      posterUrl: data.posterUrl ?? null,
      approvedAt: data.approvedAt ?? null,
      storeId,
      productId,
      ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const draftCampaign = await campaignService.createCampaign(
      {
        storeId,
        productId,
        name: growthAnalysis.recommendation.suggestedCampaignName,
        objective: growthAnalysis.recommendation.objective,
        strategy: growthAnalysis.recommendation.strategy,
      },
      ownerId
    );

    expect(draftCampaign.status).toBe('pending_approval');
    expect(draftCampaign.posterId).toBe('poster-bld-1');

    // Merchant Approval Gate: Explicit merchant sign-off
    mockCampaignFindUnique.mockResolvedValue({
      id: campaignId,
      status: 'pending_approval',
      storeId,
      productId,
      ownerId,
    });

    const approvedCampaign = await campaignService.approveCampaign(campaignId, ownerId);
    expect(approvedCampaign.status).toBe('approved');
    expect(approvedCampaign.approvedAt).toBeDefined();

    // ══════════════════════════════════════════════════════════════════════════
    // PHASE 3: Razorpay Commerce Execution
    // ══════════════════════════════════════════════════════════════════════════

    // 1. Order Creation
    mockCampaignFindUnique.mockResolvedValue({
      id: campaignId,
      name: growthAnalysis.recommendation.suggestedCampaignName,
      status: 'approved',
      storeId,
      productId,
      ownerId,
    });
    mockPaymentFindFirst.mockResolvedValue(null); // no prior payments

    mockPaymentCreate.mockResolvedValue({
      id: paymentId,
      amount: 499,
      currency: 'INR',
      status: 'created',
      campaignId,
    });

    mockOrdersCreate.mockResolvedValue({
      id: rzpOrderId,
      amount: 49900,
      currency: 'INR',
      receipt: `rcpt_${paymentId.substring(0, 8)}`,
      status: 'created',
    });

    mockPaymentUpdate.mockImplementation(({ data }: any) => ({
      id: paymentId,
      amount: 499,
      currency: 'INR',
      status: data.status,
      razorpayOrderId: data.razorpayOrderId ?? rzpOrderId,
      razorpayPaymentId: data.razorpayPaymentId ?? null,
      verifiedAt: data.verifiedAt ?? null,
      campaignId,
    }));

    const orderResponse = await paymentService.createPaymentOrder(campaignId, ownerId);

    expect(orderResponse.razorpayOrderId).toBe(rzpOrderId);
    expect(orderResponse.amount).toBe(499);
    expect(orderResponse.amountInSubunits).toBe(49900);
    expect(orderResponse.currency).toBe('INR');

    // 2. Cryptographic Signature Verification & Campaign Activation
    const mockPaymentId = 'pay_bld_777777';
    const validSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${rzpOrderId}|${mockPaymentId}`)
      .digest('hex');

    mockPaymentFindFirst.mockResolvedValue({
      id: paymentId,
      campaignId,
      status: 'pending',
      razorpayOrderId: rzpOrderId,
      amount: 499,
      currency: 'INR',
      campaign: {
        id: campaignId,
        name: growthAnalysis.recommendation.suggestedCampaignName,
        status: 'approved',
        ownerId,
        store: mockStore,
      },
    });

    const verifyResult = await paymentService.verifyPayment(
      {
        razorpay_order_id: rzpOrderId,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: validSignature,
      },
      ownerId
    );

    // Assert authoritative payment verification
    expect(verifyResult.payment.status).toBe('verified');
    expect(verifyResult.payment.verifiedAt).toBeDefined();

    // Assert final Commerce Activation: Campaign -> ACTIVE
    expect(verifyResult.campaign.status).toBe('active');
    expect(mockCampaignUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: campaignId },
        data: { status: 'active' },
      })
    );
  });

  test('safety: unapproved campaign cannot create Razorpay orders', async () => {
    mockCampaignFindUnique.mockResolvedValue({
      id: campaignId,
      status: 'pending_approval', // Not yet approved by merchant!
      ownerId,
    });

    await expect(
      paymentService.createPaymentOrder(campaignId, ownerId)
    ).rejects.toThrow(ValidationError);
  });

  test('safety: invalid signature leaves campaign in APPROVED and does not activate', async () => {
    mockPaymentFindFirst.mockResolvedValue({
      id: paymentId,
      campaignId,
      status: 'pending',
      razorpayOrderId: rzpOrderId,
      campaign: {
        id: campaignId,
        status: 'approved',
        ownerId,
      },
    });

    await expect(
      paymentService.verifyPayment(
        {
          razorpay_order_id: rzpOrderId,
          razorpay_payment_id: 'pay_tampered_123',
          razorpay_signature: 'invalid_signature_hex_value',
        },
        ownerId
      )
    ).rejects.toThrow(ValidationError);

    // Verify Campaign was NOT set to ACTIVE
    expect(mockCampaignUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'active' } })
    );
  });
});
