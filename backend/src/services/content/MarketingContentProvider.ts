import { ContentType } from '../../models/GeneratedContent';
import type { IProductDocument } from '../../models/Product';
import MarketingEngine, { MarketingEngineResult } from '../../marketing/engine/MarketingEngine';
import MarketingQualityEngine from '../../marketing/quality/MarketingQualityEngine';
import type { QualityReport } from '../../marketing/quality/QualityReport';
import type { ContentProvider, ContentProviderRequest } from './ContentProvider';

interface MarketingAttempt {
  content: MarketingEngineResult;
  qualityReport: QualityReport;
}

const MAX_QUALITY_ATTEMPTS = 3;
const QUALITY_THRESHOLD = 85;

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

function compactSentences(values: Array<string | undefined>): string {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTrailingPunctuation(value: string): string {
  return value.replace(/[.!?]+$/g, '').trim();
}

function productCategory(product: IProductDocument): string {
  return product.productType || product.categories[0] || product.tags[0] || '';
}

function primaryImageUrl(product: IProductDocument): string {
  return product.primaryImage?.url ?? product.images[0]?.url ?? '';
}

function toMarketingProduct(product: IProductDocument) {
  return {
    title: product.name,
    name: product.name,
    vendor: product.vendor,
    category: productCategory(product),
    productType: product.productType,
    description: product.description ?? product.shortDescription ?? '',
    price: product.price,
    tags: product.tags,
    image: primaryImageUrl(product),
    images: product.images,
    variants: product.variants,
  };
}

function buildImagePrompt(product: IProductDocument, content: MarketingEngineResult): string {
  const category = content.category.toLowerCase();
  const tone = content.tone.toLowerCase();
  const featureCue = content.features.slice(0, 3).join(', ') || category;
  const benefitCue = content.benefits.slice(0, 2).join(', ') || 'clear customer value';

  return compactSentences([
    `Create a polished ${tone} marketing poster for ${product.name}.`,
    `Feature the product as the hero object with ${featureCue} visual cues.`,
    `Use clean composition, strong product lighting, and a ${category} retail aesthetic.`,
    `Communicate ${benefitCue} without adding any readable text to the image.`,
  ]);
}

function textForContentType(
  product: IProductDocument,
  content: MarketingEngineResult,
  request: ContentProviderRequest
): string {
  switch (request.options.contentType) {
    case ContentType.HEADLINE:
      return stripTrailingPunctuation(content.headline);
    case ContentType.TAGLINE:
      return stripTrailingPunctuation(content.subheadline);
    case ContentType.CALL_TO_ACTION:
      return request.options.callToActionText?.trim() || content.cta;
    case ContentType.PRODUCT_DESCRIPTION:
      return content.description;
    case ContentType.PROMOTIONAL_TEXT: {
      const discount = request.options.discountPercent
        ? `${request.options.discountPercent}% off`
        : 'limited-time value';
      return compactSentences([
        `${discount} on ${product.name}.`,
        content.headline,
        content.cta,
      ]);
    }
    case ContentType.IMAGE_PROMPT:
      return buildImagePrompt(product, content);
    case ContentType.MARKETING_COPY:
    default:
      return compactSentences([content.headline, content.description, content.cta]);
  }
}

function rankAttempt(attempt: MarketingAttempt): number {
  return attempt.qualityReport.score * 100 + attempt.content.variationScore;
}

export class MarketingContentProvider implements ContentProvider {
  readonly name = 'marketing' as const;

  constructor(
    private readonly marketingEngine: MarketingEngine = new MarketingEngine(),
    private readonly qualityEngine: MarketingQualityEngine = new MarketingQualityEngine()
  ) {}

  async generateContent(request: ContentProviderRequest) {
    const startTime = Date.now();
    const attempts: MarketingAttempt[] = [];

    for (let attempt = 0; attempt < MAX_QUALITY_ATTEMPTS; attempt += 1) {
      const content = this.marketingEngine.generate(toMarketingProduct(request.product));
      const qualityReport = this.qualityEngine.evaluate(content);
      attempts.push({ content, qualityReport });

      if (qualityReport.score >= QUALITY_THRESHOLD) break;
    }

    const selected = attempts.reduce((best, attempt) =>
      rankAttempt(attempt) > rankAttempt(best) ? attempt : best
    );
    const text = textForContentType(request.product, selected.content, request);
    const durationMs = Date.now() - startTime;
    const promptTokens = estimateTokenCount(
      `${request.promptConfig.systemPrompt}\n${request.promptConfig.userPrompt}`
    );
    const completionTokens = estimateTokenCount(text);

    if (process.env.NODE_ENV !== 'production') {
      console.info('[ContentProvider] Provider Used: marketing', {
        qualityScore: selected.qualityReport.score,
        attempts: attempts.length,
        generationTimeMs: durationMs,
      });
    }

    return {
      texts: [text],
      metrics: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        generationDurationMs: durationMs,
        estimatedCostUsd: 0,
      },
    };
  }
}

export default MarketingContentProvider;

