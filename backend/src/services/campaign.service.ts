import { StatusCodes } from 'http-status-codes';
import prisma from '../database/prisma';
import { mapProduct } from '../database/mappers';
import {
  AppError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../middleware/errorMiddleware';
import {
  CreateCampaignPayload,
  ICampaignDocument,
  mapCampaign,
} from '../models/Campaign';
import PosterGeneratorTool from '../agent/tools/PosterGeneratorTool';
import ProductAnalyzer from '../marketing/analyzer/ProductAnalyzer';

export class CampaignService {
  private readonly posterTool: PosterGeneratorTool;
  private readonly productAnalyzer: ProductAnalyzer;

  constructor() {
    this.posterTool = new PosterGeneratorTool();
    this.productAnalyzer = new ProductAnalyzer();
  }

  /**
   * Orchestrates full campaign creation:
   * 1. Validates merchant & store & product ownership.
   * 2. Creates campaign in DRAFT state.
   * 3. Transitions to GENERATING state.
   * 4. Prepares marketing content using existing analyzer/infrastructure.
   * 5. Invokes PosterGeneratorTool adapter to render creative.
   * 6. Persists poster reference and transitions to PENDING_APPROVAL.
   * 7. Safely transitions to FAILED on any error without corrupting data.
   */
  public async createCampaign(
    payload: CreateCampaignPayload,
    requestingUserId: string
  ): Promise<ICampaignDocument> {
    console.info(
      `[CampaignService] Campaign creation started for store: ${payload.storeId}, product: ${payload.productId}`
    );

    // 1. Verify store existence and ownership
    const store = await prisma.store.findUnique({
      where: { id: payload.storeId },
    });

    if (!store) {
      console.warn(`[CampaignService] Store not found: ${payload.storeId}`);
      throw new NotFoundError('Store');
    }

    if (store.ownerId !== requestingUserId) {
      console.warn(
        `[CampaignService] Unauthorized store access: ${payload.storeId} by userId: ${requestingUserId}`
      );
      throw new ForbiddenError('You do not have permission to create campaigns for this store.');
    }

    if (store.isArchived) {
      throw new ValidationError('Cannot create campaigns for a disconnected or archived store.');
    }

    // 2. Verify product existence and belonging to this store
    const product = await prisma.product.findUnique({
      where: { id: payload.productId },
    });

    if (!product) {
      console.warn(`[CampaignService] Product not found: ${payload.productId}`);
      throw new NotFoundError('Product');
    }

    if (product.storeId !== payload.storeId) {
      throw new ValidationError('The specified product does not belong to this store.');
    }

    if (product.ownerId !== requestingUserId) {
      throw new ForbiddenError('You do not have permission to use this product.');
    }

    const campaignName = payload.name?.trim() || `Campaign — ${product.name}`;
    const objective =
      payload.objective?.trim() ||
      'Maximize conversion and visibility for catalog hero product.';
    const strategy =
      payload.strategy?.trim() ||
      'Feature product with high-clarity promotional messaging and verified pricing.';

    // 3. Create campaign in DRAFT state
    const draftCampaign = await prisma.campaign.create({
      data: {
        name: campaignName,
        objective,
        strategy,
        suggestedOffer: payload.suggestedOffer?.trim(),
        targetAudience: payload.targetAudience?.trim(),
        rationale: payload.rationale?.trim(),
        status: 'draft',
        storeId: store.id,
        productId: product.id,
        ownerId: requestingUserId,
      },
    });

    console.info(`[CampaignService] Campaign created in DRAFT: ${draftCampaign.id}`);

    // 4. Move to GENERATING state
    console.info(`[CampaignService] Campaign generation started: ${draftCampaign.id}`);
    await prisma.campaign.update({
      where: { id: draftCampaign.id },
      data: { status: 'generating' },
    });

    try {
      // 5. Prepare marketing content using existing project analyzer
      const existingContent = await prisma.generatedContent.findFirst({
        where: {
          productId: product.id,
          status: 'completed',
        },
        orderBy: { createdAt: 'desc' },
      });

      const mappedProduct = mapProduct(product);
      const analyzed = this.productAnalyzer.analyze(mappedProduct);
      const marketingContent = {
        headline:
          payload.suggestedOffer ||
          `${analyzed.category || 'Featured'}: ${product.name}`,
        subheadline: strategy,
        cta: 'Shop Now',
        targetAudience: payload.targetAudience || 'Value-conscious consumers',
        contentId: payload.contentId || existingContent?.id,
      };

      // 6. Invoke existing poster generation pipeline via PosterGeneratorTool
      console.info(`[CampaignService] Poster generation requested for campaign: ${draftCampaign.id}`);
      const posterResult = await this.posterTool.generateCampaignPoster({
        productId: product.id,
        ownerId: requestingUserId,
        title: campaignName,
        style: payload.posterStyle as any,
        size: payload.posterSize as any,
        contentId: payload.contentId || existingContent?.id,
      });

      if (!posterResult.success || !posterResult.posterId) {
        throw new Error(posterResult.error || 'Failed to render campaign poster creative.');
      }

      // 7. Persist generated poster reference and transition to PENDING_APPROVAL
      const approvedDraft = await prisma.campaign.update({
        where: { id: draftCampaign.id },
        data: {
          status: 'pending_approval',
          posterId: posterResult.posterId,
          posterUrl: posterResult.posterUrl,
          marketingContent: marketingContent as any,
        },
      });

      console.info(
        `[CampaignService] Campaign moved to PENDING_APPROVAL: ${draftCampaign.id} (Poster: ${posterResult.posterId})`
      );

      return mapCampaign(approvedDraft);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[CampaignService] Campaign generation failed for campaign: ${draftCampaign.id}: ${message}`
      );

      // Transition to FAILED state safely without corrupting store or product data
      await prisma.campaign.update({
        where: { id: draftCampaign.id },
        data: {
          status: 'failed',
          failureReason: message,
        },
      });

      console.info(`[CampaignService] Campaign moved to FAILED: ${draftCampaign.id}`);

      throw new AppError(
        `Campaign generation failed: ${message}`,
        StatusCodes.INTERNAL_SERVER_ERROR,
        'CAMPAIGN_GENERATION_FAILED'
      );
    }
  }

  /**
   * Retrieves single campaign by ID with verified merchant ownership.
   */
  public async getCampaignById(
    campaignId: string,
    requestingUserId: string
  ): Promise<ICampaignDocument> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        store: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, price: true, currency: true } },
        poster: { select: { id: true, posterUrl: true, generationStatus: true } },
      },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign');
    }

    if (campaign.ownerId !== requestingUserId) {
      throw new ForbiddenError('You do not have permission to view this campaign.');
    }

    return mapCampaign(campaign);
  }

  /**
   * Lists all campaigns belonging to a specific store with ownership validation.
   */
  public async getCampaignsByStore(
    storeId: string,
    requestingUserId: string
  ): Promise<ICampaignDocument[]> {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundError('Store');
    }

    if (store.ownerId !== requestingUserId) {
      throw new ForbiddenError('You do not have permission to view campaigns for this store.');
    }

    const campaigns = await prisma.campaign.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, price: true, currency: true } },
        poster: { select: { id: true, posterUrl: true, generationStatus: true } },
      },
    });

    return campaigns.map(mapCampaign);
  }

  /**
   * Merchant Approval Gate:
   * Explicit merchant action moving campaign from PENDING_APPROVAL to APPROVED.
   * Blocks unauthorized users, re-approvals, and invalid lifecycle transitions.
   */
  public async approveCampaign(
    campaignId: string,
    requestingUserId: string
  ): Promise<ICampaignDocument> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign');
    }

    if (campaign.ownerId !== requestingUserId) {
      throw new ForbiddenError('You do not have permission to approve this campaign.');
    }

    if (
      campaign.status === 'approved' ||
      campaign.status === 'active' ||
      campaign.status === 'completed'
    ) {
      throw new ValidationError('Campaign is already approved.');
    }

    if (campaign.status !== 'pending_approval') {
      throw new ValidationError(
        `Cannot approve campaign in "${campaign.status}" state. Only campaigns in "pending_approval" status can be approved.`
      );
    }

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'approved',
        approvedAt: new Date(),
      },
    });

    console.info(
      `[CampaignService] Campaign approved: ${campaign.id} by merchant: ${requestingUserId}`
    );

    return mapCampaign(updated);
  }
}

const campaignService = new CampaignService();
export default campaignService;
