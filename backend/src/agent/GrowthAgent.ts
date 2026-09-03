import prisma from '../database/prisma';
import { mapProduct } from '../database/mappers';
import { env } from '../config/env';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../middleware/errorMiddleware';
import { IProductDocument, ProductStatus } from '../models/Product';
import { AIModel } from '../models/GeneratedContent';
import {
  CandidateOpportunity,
  GrowthOpportunityDetector,
  GrowthSignals,
} from './GrowthOpportunityDetector';
import CampaignEngine, { CampaignName } from '../marketing/campaigns/CampaignEngine';
import ProductAnalyzer from '../marketing/analyzer/ProductAnalyzer';
import ollamaService from '../services/ollama.service';
import openAIService from '../services/openai.service';

export interface GrowthRecommendation {
  objective: string;
  strategy: string;
  suggestedCampaignName: string;
  suggestedOffer: string;
  targetAudience: string;
  rationale: string;
}

export interface GrowthAnalysisResult {
  storeId: string;
  storeName: string;
  analyzedAt: string;
  catalogSummary: {
    totalProducts: number;
    activeProducts: number;
    candidatesEvaluated: number;
  };
  topOpportunity: {
    productId: string;
    productName: string;
    score: number;
    confidence: 'high' | 'medium' | 'low';
    reasons: string[];
    signals: GrowthSignals;
  };
  otherCandidates: Array<{
    productId: string;
    productName: string;
    score: number;
    confidence: 'high' | 'medium' | 'low';
  }>;
  recommendation: GrowthRecommendation;
  provider: 'ollama' | 'openai' | 'deterministic-engine';
}

export class GrowthAgent {
  private readonly detector: GrowthOpportunityDetector;
  private readonly campaignEngine: CampaignEngine;
  private readonly productAnalyzer: ProductAnalyzer;

  constructor() {
    this.detector = new GrowthOpportunityDetector();
    this.campaignEngine = new CampaignEngine();
    this.productAnalyzer = new ProductAnalyzer();
  }

  /**
   * Main entry point for AI Growth Agent store analysis.
   */
  public async analyzeStore(
    storeId: string,
    requestingUserId: string
  ): Promise<GrowthAnalysisResult> {
    console.info(`[GrowthAgent] Growth analysis started for storeId: ${storeId}`);

    // 1. Verify store existence and ownership
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      console.warn(`[GrowthAgent] Store not found: ${storeId}`);
      throw new NotFoundError('Store');
    }

    if (store.ownerId !== requestingUserId) {
      console.warn(
        `[GrowthAgent] Unauthorized access attempt for storeId: ${storeId} by userId: ${requestingUserId}`
      );
      throw new ForbiddenError('You do not have permission to analyze this store.');
    }

    if (store.isArchived) {
      throw new ValidationError('Cannot analyze a disconnected or archived store.');
    }

    // 2. Load store products
    const productRecords = await prisma.product.findMany({
      where: {
        storeId,
        status: { not: ProductStatus.ARCHIVED },
      },
      include: { store: true },
      orderBy: { createdAt: 'desc' },
    });

    console.info(
      `[GrowthAgent] Number of products analyzed: ${productRecords.length} for store: "${store.name}"`
    );

    if (productRecords.length === 0) {
      throw new ValidationError(
        'No active products found in this store. Please import or sync products before running growth analysis.'
      );
    }

    // 3. Map products to domain model
    const mappedProducts: IProductDocument[] = productRecords.map(mapProduct);

    // 4. Run deterministic opportunity detection
    const candidates = this.detector.detect(mappedProducts);

    if (candidates.length === 0) {
      throw new ValidationError(
        'Unable to evaluate product opportunities. Please ensure your products have pricing and status configured.'
      );
    }

    const topOpportunity = candidates[0];
    console.info(
      `[GrowthAgent] Top opportunity selected: ${topOpportunity.productId} (${topOpportunity.productName}) with score ${topOpportunity.score}/100`
    );

    const otherCandidates = candidates.slice(1, 5).map((c) => ({
      productId: c.productId,
      productName: c.productName,
      score: c.score,
      confidence: c.confidence,
    }));

    // 5. Generate AI strategy recommendation
    const { recommendation, provider } = await this.generateStrategy(
      topOpportunity,
      mappedProducts.find((p) => p._id === topOpportunity.productId)
    );

    const activeCount = productRecords.filter(
      (p) => p.status === ProductStatus.ACTIVE
    ).length;

    return {
      storeId: store.id,
      storeName: store.name,
      analyzedAt: new Date().toISOString(),
      catalogSummary: {
        totalProducts: productRecords.length,
        activeProducts: activeCount,
        candidatesEvaluated: candidates.length,
      },
      topOpportunity: {
        productId: topOpportunity.productId,
        productName: topOpportunity.productName,
        score: topOpportunity.score,
        confidence: topOpportunity.confidence,
        reasons: topOpportunity.reasons,
        signals: topOpportunity.signals,
      },
      otherCandidates,
      recommendation,
      provider,
    };
  }

  /**
   * Generates a growth strategy recommendation using the active AI provider
   * or a deterministic rule-based fallback without fabricating historical sales.
   */
  private async generateStrategy(
    opportunity: CandidateOpportunity,
    product?: IProductDocument
  ): Promise<{ recommendation: GrowthRecommendation; provider: 'ollama' | 'openai' | 'deterministic-engine' }> {
    const contentProvider = env.CONTENT_PROVIDER;
    const signals = opportunity.signals;

    // Build grounding context using ONLY real catalog signals
    const contextDetails = [
      `Product Name: ${opportunity.productName}`,
      `Category: ${signals.category || 'General merchandise'}`,
      `Current Price: ${signals.currency} ${signals.price.toFixed(2)}`,
      signals.hasDiscount
        ? `Existing Compare-at Price: ${signals.currency} ${(signals.compareAtPrice ?? 0).toFixed(2)} (${signals.discountPercent}% active discount)`
        : 'Existing Compare-at Price: None (standard pricing)',
      signals.hasInventoryTracking && signals.totalInventory !== null
        ? `Recorded Inventory Units: ${signals.totalInventory}`
        : `Availability: ${signals.isAvailable ? 'In stock / available' : 'Out of stock'}`,
      `Image Assets: ${signals.imageCount} product images available`,
      `Opportunity Score: ${opportunity.score}/100`,
      `Catalog Assessment Points: ${opportunity.reasons.join('; ')}`,
    ].join('\n');

    // Attempt LLM generation if Ollama or OpenAI is configured
    if (contentProvider === 'ollama' && env.OLLAMA_BASE_URL) {
      try {
        const result = await this.callLlmForStrategy(
          'ollama',
          opportunity.productName,
          contextDetails
        );
        if (result) {
          return { recommendation: result, provider: 'ollama' };
        }
      } catch (err) {
        console.warn(
          '[GrowthAgent] Ollama completion unavailable. Falling back to deterministic engine.',
          err instanceof Error ? err.message : String(err)
        );
      }
    } else if (env.OPENAI_API_KEY) {
      try {
        const result = await this.callLlmForStrategy(
          'openai',
          opportunity.productName,
          contextDetails
        );
        if (result) {
          return { recommendation: result, provider: 'openai' };
        }
      } catch (err) {
        console.warn(
          '[GrowthAgent] OpenAI completion unavailable. Falling back to deterministic engine.',
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    // Deterministic fallback (safe, offline-capable, strictly grounded)
    const fallbackRecommendation = this.generateDeterministicRecommendation(
      opportunity,
      product
    );
    return {
      recommendation: fallbackRecommendation,
      provider: 'deterministic-engine',
    };
  }

  private async callLlmForStrategy(
    provider: 'ollama' | 'openai',
    productName: string,
    contextDetails: string
  ): Promise<GrowthRecommendation | null> {
    const systemPrompt = `You are the AI Growth & Campaign Agent for AdCraft.
Your task is to analyze real catalog signals for a merchant product and propose a structured marketing campaign strategy.
CRITICAL SAFETY CONSTRAINTS:
1. Ground your reasoning strictly in the real catalog signals provided (prices, discounts, availability, imagery).
2. Do NOT invent, fabricate, or assume historical sales data or past transaction metrics.
3. Keep suggestions actionable, clear, and realistic.
4. Output MUST be valid JSON only with this exact shape:
{
  "objective": "<1-2 sentence business goal>",
  "strategy": "<clear marketing and promotional tactic>",
  "suggestedCampaignName": "<short campaign name e.g. Summer Refresh, Limited-Time Advantage, Flash Clearance, Spotlight Sale>",
  "suggestedOffer": "<specific offer e.g. Save 19% on Nike Air Max, Special Limited Price>",
  "targetAudience": "<target customer persona based on product category/description>",
  "rationale": "<executive summary of why this catalog opportunity is optimal right now>"
}`;

    const userPrompt = `Catalog Signals for Product: "${productName}"\n\n${contextDetails}\n\nProduce the structured growth recommendation JSON:`;

    let rawText = '';

    if (provider === 'ollama') {
      const response = await ollamaService.complete({
        model: AIModel.GPT_4O_MINI,
        systemPrompt,
        userPrompt,
        temperature: 0.3,
        maxTokens: 600,
        variants: 1,
      });
      rawText = response.texts[0] || '';
    } else {
      const response = await openAIService.complete({
        model: AIModel.GPT_4O_MINI,
        systemPrompt,
        userPrompt,
        temperature: 0.3,
        maxTokens: 600,
        variants: 1,
      });
      rawText = response.texts[0] || '';
    }

    return this.parseLlmJson(rawText);
  }

  private parseLlmJson(rawText: string): GrowthRecommendation | null {
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);
      if (
        typeof parsed.objective === 'string' &&
        typeof parsed.strategy === 'string' &&
        typeof parsed.suggestedCampaignName === 'string' &&
        typeof parsed.suggestedOffer === 'string' &&
        typeof parsed.targetAudience === 'string' &&
        typeof parsed.rationale === 'string'
      ) {
        return {
          objective: parsed.objective.trim(),
          strategy: parsed.strategy.trim(),
          suggestedCampaignName: parsed.suggestedCampaignName.trim(),
          suggestedOffer: parsed.suggestedOffer.trim(),
          targetAudience: parsed.targetAudience.trim(),
          rationale: parsed.rationale.trim(),
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Deterministic recommendation generator using existing CampaignEngine
   * and ProductAnalyzer without inventing unavailable data.
   */
  public generateDeterministicRecommendation(
    opportunity: CandidateOpportunity,
    product?: IProductDocument
  ): GrowthRecommendation {
    const signals = opportunity.signals;
    const analyzed = product ? this.productAnalyzer.analyze(product) : null;
    const categoryName = analyzed?.category || signals.category || 'General Merchandise';

    let campaignKey: CampaignName = 'Default';
    let suggestedCampaignName = 'Spotlight Showcase';
    let objective = 'Showcase hero product assets to drive engagement and first-order conversion.';
    let strategy = `Feature ${opportunity.productName} prominently using validated hero imagery and high-clarity pricing.`;
    let suggestedOffer = `Featured Price: ${signals.currency} ${signals.price.toFixed(2)}`;

    if (signals.hasDiscount && signals.discountPercent >= 20) {
      campaignKey = 'Clearance';
      suggestedCampaignName = 'Clearance Advantage';
      objective = `Capitalize on existing ${signals.discountPercent}% price reduction to maximize impulse conversion.`;
      strategy = `Highlight the verified price difference (${signals.currency} ${signals.price.toFixed(2)} vs compare-at ${signals.currency} ${(signals.compareAtPrice ?? 0).toFixed(2)}) across promotional assets.`;
      suggestedOffer = `Save ${signals.discountPercent}% — Now ${signals.currency} ${signals.price.toFixed(2)}`;
    } else if (signals.hasDiscount && signals.discountPercent > 0) {
      campaignKey = 'Black Friday';
      suggestedCampaignName = 'Limited Deal';
      objective = `Promote active ${signals.discountPercent}% price savings to boost product visibility.`;
      strategy = `Lead with current promotional pricing to attract value-oriented shoppers.`;
      suggestedOffer = `Special Offer: ${signals.currency} ${signals.price.toFixed(2)} (Was ${signals.currency} ${(signals.compareAtPrice ?? 0).toFixed(2)})`;
    } else if (
      signals.hasInventoryTracking &&
      signals.totalInventory !== null &&
      signals.totalInventory > 0 &&
      signals.totalInventory <= 10
    ) {
      campaignKey = 'New Arrival';
      suggestedCampaignName = 'Low Stock Alert';
      objective = 'Create authentic demand urgency around remaining inventory.';
      strategy = `Communicate limited stock availability (${signals.totalInventory} units left) to drive immediate purchase decisions.`;
      suggestedOffer = `Limited Stock: Only ${signals.totalInventory} units available at ${signals.currency} ${signals.price.toFixed(2)}`;
    } else if (signals.price > 100) {
      campaignKey = 'Premium';
      suggestedCampaignName = 'Premium Spotlight';
      objective = 'Position high-value flagship product with focus on quality and verified specifications.';
      strategy = `Emphasize premium product features and design quality to justify value at ${signals.currency} ${signals.price.toFixed(2)}.`;
      suggestedOffer = `Featured Premium Selection: ${signals.currency} ${signals.price.toFixed(2)}`;
    }

    const campaignDef = this.campaignEngine.getCampaign(campaignKey);
    const primaryCta = campaignDef.cta[0] || 'Shop Now';

    const targetAudience = categoryName
      ? `Shoppers interested in ${categoryName.toLowerCase()} who value verified quality and transparent pricing.`
      : 'Value-conscious consumers seeking quality catalog selections.';

    const rationale = [
      `Selected based on measurable catalog readiness score (${opportunity.score}/100).`,
      opportunity.reasons.slice(0, 2).join(' '),
      `The product is confirmed active in catalog with verified imagery and immediate order viability. Recommended CTA: "${primaryCta}".`,
    ]
      .filter(Boolean)
      .join(' ');

    return {
      objective,
      strategy,
      suggestedCampaignName,
      suggestedOffer,
      targetAudience,
      rationale,
    };
  }
}

export default GrowthAgent;
