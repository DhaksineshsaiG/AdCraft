import {
  IProductDocument,
  ProductProcessingStatus,
  ProductStatus,
} from '../models/Product';

export interface GrowthSignals {
  price: number;
  compareAtPrice: number | null;
  currency: string;
  hasDiscount: boolean;
  discountPercent: number;
  status: ProductStatus;
  isAvailable: boolean;
  totalInventory: number | null;
  hasInventoryTracking: boolean;
  imageCount: number;
  hasPrimaryImage: boolean;
  hasDescription: boolean;
  descriptionLength: number;
  isProcessed: boolean;
  processingStatus: ProductProcessingStatus;
  category: string;
  tagsCount: number;
  variantCount: number;
}

export interface CandidateOpportunity {
  productId: string;
  productName: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
  signals: GrowthSignals;
}

export class GrowthOpportunityDetector {
  /**
   * Evaluates an array of product catalog documents and returns
   * candidate opportunities sorted by opportunityScore descending.
   */
  public detect(products: IProductDocument[]): CandidateOpportunity[] {
    if (!products || products.length === 0) {
      return [];
    }

    const candidates: CandidateOpportunity[] = products
      .filter((p) => p.status !== ProductStatus.ARCHIVED)
      .map((product) => this.evaluateProduct(product));

    // Sort descending by opportunity score
    return candidates.sort((a, b) => b.score - a.score);
  }

  /**
   * Deterministically evaluates measurable catalog signals for a single product.
   * Scoring weights (Total 100 max):
   *  1. Pricing & Discount Opportunity: 0 - 30 points
   *  2. Inventory & Stock Availability: 0 - 25 points
   *  3. Creative & Media Asset Readiness: 0 - 25 points
   *  4. Product Metadata & Completeness: 0 - 20 points
   */
  public evaluateProduct(product: IProductDocument): CandidateOpportunity {
    const reasons: string[] = [];
    const signals = this.extractSignals(product);

    let pricingScore = 0;
    let inventoryScore = 0;
    let assetScore = 0;
    let completenessScore = 0;

    // ─── 1. Pricing & Discount Signals (0 - 30 pts) ───────────────────────────
    if (signals.hasDiscount && signals.discountPercent > 0) {
      if (signals.discountPercent >= 10 && signals.discountPercent <= 50) {
        pricingScore = 30;
        reasons.push(
          `Strong promotional advantage: Existing ${signals.discountPercent}% compare-at discount (${signals.currency} ${signals.price.toFixed(2)} vs ${signals.currency} ${(signals.compareAtPrice ?? 0).toFixed(2)}) offers immediate campaign leverage.`
        );
      } else if (signals.discountPercent > 50) {
        pricingScore = 24;
        reasons.push(
          `Deep clearance opportunity: High discount of ${signals.discountPercent}% suggests a clearance or stock liquidation strategy.`
        );
      } else {
        pricingScore = 18;
        reasons.push(
          `Modest active discount: ${signals.discountPercent}% discount is ready to be showcased in marketing assets.`
        );
      }
    } else if (signals.price > 0) {
      // Clear pricing structure without existing discount — prime candidate for a fresh promotional offer
      pricingScore = 15;
      reasons.push(
        `Established base price (${signals.currency} ${signals.price.toFixed(2)}) provides room for an introductory or flash promotion.`
      );
    }

    // ─── 2. Inventory & Availability Signals (0 - 25 pts) ─────────────────────
    if (signals.status === ProductStatus.ACTIVE) {
      inventoryScore += 10;
    }

    if (signals.hasInventoryTracking && signals.totalInventory !== null) {
      if (signals.totalInventory > 20) {
        inventoryScore += 15;
        reasons.push(
          `Healthy inventory depth: ${signals.totalInventory} units recorded in stock, supporting an active campaign without immediate stockout risk.`
        );
      } else if (signals.totalInventory > 0) {
        inventoryScore += 10;
        reasons.push(
          `Limited stock availability: ${signals.totalInventory} units remaining, creating a natural urgency angle.`
        );
      } else {
        inventoryScore = Math.max(0, inventoryScore - 15);
      }
    } else if (signals.isAvailable) {
      // Inventory quantity not tracked numerically, but marked available
      inventoryScore += 12;
      reasons.push(`Product is marked active and available for customer orders.`);
    }

    // ─── 3. Creative & Media Asset Readiness (0 - 25 pts) ─────────────────────
    if (signals.hasPrimaryImage) {
      assetScore += 15;
      if (signals.imageCount > 1) {
        assetScore += 5;
        reasons.push(
          `Rich media coverage: ${signals.imageCount} product images available for multi-angle poster composition.`
        );
      } else {
        reasons.push(`Primary hero product image verified for creative generation.`);
      }
    } else {
      reasons.push(`Warning: No product images detected, which limits visual campaign creation.`);
    }

    if (signals.isProcessed) {
      assetScore += 5;
    }

    // ─── 4. Product Metadata & Completeness (0 - 20 pts) ──────────────────────
    if (signals.descriptionLength > 100) {
      completenessScore += 10;
      reasons.push(`Comprehensive product description provides rich context for marketing copy.`);
    } else if (signals.descriptionLength > 0) {
      completenessScore += 6;
      reasons.push(`Product description is present.`);
    }

    if (signals.tagsCount > 0) {
      completenessScore += 5;
    }

    if (signals.category) {
      completenessScore += 5;
    }

    const totalScore = Math.min(
      100,
      Math.max(0, pricingScore + inventoryScore + assetScore + completenessScore)
    );

    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (totalScore >= 70) {
      confidence = 'high';
    } else if (totalScore >= 45) {
      confidence = 'medium';
    }

    return {
      productId: product._id,
      productName: product.name,
      score: totalScore,
      confidence,
      reasons,
      signals,
    };
  }

  private extractSignals(product: IProductDocument): GrowthSignals {
    const price = Number(product.price) || 0;
    const compareAtPrice =
      product.compareAtPrice !== null && product.compareAtPrice !== undefined
        ? Number(product.compareAtPrice)
        : null;

    const hasDiscount =
      compareAtPrice !== null && compareAtPrice > price && price > 0;
    const discountPercent = hasDiscount && compareAtPrice
      ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
      : 0;

    // Evaluate variants inventory
    let totalInventory: number | null = null;
    let hasInventoryTracking = false;
    let isAvailable = product.status === ProductStatus.ACTIVE;

    if (Array.isArray(product.variants) && product.variants.length > 0) {
      let trackedCount = 0;
      let inventorySum = 0;
      let hasAvailableVariant = false;

      for (const variant of product.variants) {
        if (typeof variant.inventory === 'number') {
          hasInventoryTracking = true;
          trackedCount++;
          inventorySum += variant.inventory;
        }
        if (variant.isAvailable) {
          hasAvailableVariant = true;
        }
      }

      if (hasInventoryTracking && trackedCount > 0) {
        totalInventory = inventorySum;
      }
      isAvailable = hasAvailableVariant;
    }

    const images = Array.isArray(product.images) ? product.images : [];
    const imageCount = images.length;
    const hasPrimaryImage = imageCount > 0 && Boolean(images[0]?.url);

    const description = (product.description || product.shortDescription || '').trim();
    const category = product.productType || product.categories?.[0] || '';
    const tagsCount = Array.isArray(product.tags) ? product.tags.length : 0;
    const variantCount = Array.isArray(product.variants) ? product.variants.length : 0;

    const processingStatus =
      product.processingMetadata?.status ?? ProductProcessingStatus.PENDING;
    const isProcessed = processingStatus === ProductProcessingStatus.READY;

    return {
      price,
      compareAtPrice,
      currency: product.currency || 'USD',
      hasDiscount,
      discountPercent,
      status: product.status,
      isAvailable,
      totalInventory,
      hasInventoryTracking,
      imageCount,
      hasPrimaryImage,
      hasDescription: description.length > 0,
      descriptionLength: description.length,
      isProcessed,
      processingStatus,
      category,
      tagsCount,
      variantCount,
    };
  }
}

export default GrowthOpportunityDetector;
