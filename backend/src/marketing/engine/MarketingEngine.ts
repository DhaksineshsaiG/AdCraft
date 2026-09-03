import ProductAnalyzer, {
  AnalyzedProduct,
  ProductAnalyzerInput,
} from '../analyzer/ProductAnalyzer';
import CategoryDetector from '../category/CategoryDetector';
import ContentComposer, { ComposeOptions } from '../composer/ContentComposer';
import type { LearnedPreferenceSummary } from '../learning/LearningEngine';
import ToneEngine from '../tone/ToneEngine';

export interface MarketingEngineResult {
  headline: string;
  subheadline: string;
  description: string;
  cta: string;
  tone: string;
  category: string;
  features: string[];
  benefits: string[];
  audience: string[];
  emotions: string[];
  keywords: string[];
  lifestyle: string[];
  intent: string[];
  templateCategory: string;
  templateIds: string[];
  variationScore: number;
  dictionary: string;
  campaignUsed: string;
  industryPackUsed: string;
  personalizationApplied: boolean;
  learnedPreferences: LearnedPreferenceSummary | null;
}

export class MarketingEngine {
  constructor(
    private readonly productAnalyzer: ProductAnalyzer = new ProductAnalyzer(),
    private readonly categoryDetector: CategoryDetector = new CategoryDetector(),
    private readonly toneEngine: ToneEngine = new ToneEngine(),
    private readonly contentComposer: ContentComposer = new ContentComposer()
  ) {}

  generate(product: ProductAnalyzerInput, options: ComposeOptions = {}): MarketingEngineResult {
    const analyzedProduct = this.productAnalyzer.analyze(product);
    const category = this.categoryDetector.detect(analyzedProduct);
    const tone = this.toneEngine.getTone(category);
    const enrichedProduct: AnalyzedProduct = {
      ...analyzedProduct,
      normalizedCategory: category,
      tone,
    };
    const content = this.contentComposer.compose(enrichedProduct, options);

    return {
      ...content,
      tone,
      category,
    };
  }

  getMemorySnapshot(): ReturnType<ContentComposer['getMemorySnapshot']> {
    return this.contentComposer.getMemorySnapshot();
  }
}

export default MarketingEngine;
