import api from './auth.service';
import type { ApiResponse } from './api.types';

export interface GrowthSignals {
  price: number;
  compareAtPrice: number | null;
  currency: string;
  hasDiscount: boolean;
  discountPercent: number;
  status: string;
  isAvailable: boolean;
  totalInventory: number | null;
  hasInventoryTracking: boolean;
  imageCount: number;
  hasPrimaryImage: boolean;
  hasDescription: boolean;
  descriptionLength: number;
  isProcessed: boolean;
  processingStatus: string;
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

export interface GrowthRecommendation {
  objective: string;
  strategy: string;
  suggestedCampaignName: string;
  suggestedOffer: string;
  targetAudience: string;
  rationale: string;
}

export interface CatalogSummary {
  totalProducts: number;
  activeProducts: number;
  candidatesEvaluated: number;
}

export interface OtherCandidate {
  productId: string;
  productName: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface GrowthAnalysisResult {
  storeId: string;
  storeName: string;
  analyzedAt: string;
  catalogSummary: CatalogSummary;
  topOpportunity: CandidateOpportunity;
  otherCandidates: OtherCandidate[];
  recommendation: GrowthRecommendation;
  provider: 'ollama' | 'openai' | 'deterministic-engine';
}

/**
 * Analyzes a merchant's store catalog using the Phase 1 AI Growth Brain.
 */
export async function analyzeStore(storeId: string): Promise<GrowthAnalysisResult> {
  const { data } = await api.post<ApiResponse<GrowthAnalysisResult>>(
    `/growth/analyze/${storeId}`
  );
  return data.data;
}
