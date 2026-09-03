import { IGeneratedContentDocument, ContentType } from '../../models/GeneratedContent';
import { IProductDocument, IProductImage } from '../../models/Product';
import { PosterData, PosterImageData } from '../types';
import { randomInt } from 'crypto';

export interface PosterDataMapper {
  map(product: IProductDocument, content: IGeneratedContentDocument): PosterData;
}

export class DefaultPosterDataMapper implements PosterDataMapper {
  public map(product: IProductDocument, content: IGeneratedContentDocument): PosterData {
    const selectedText = getSelectedText(content);
    const compareAtAmount = getValidCompareAtAmount(product);

    return {
      product: {
        id: product._id.toString(),
        name: product.name,
        image: mapProductImage(product.primaryImage ?? getPrimaryImage(product.images)),
        description: product.shortDescription ?? product.description,
        category: product.categories[0],
        vendor: product.vendor,
        url: product.externalUrl,
      },
      headline: resolveHeadline(product, content, selectedText),
      description: resolveDescription(product, content, selectedText),
      price: {
        amount: product.price,
        currency: product.currency,
        compareAtAmount,
      },
      cta: resolveCta(product, content, selectedText),
      promotion: resolvePromotion(product, compareAtAmount),
      brand: {
        name: product.vendor,
      },
      locale: content.language,
      metadata: {
        productId: product._id.toString(),
        generatedContentId: content._id.toString(),
        contentType: content.contentType,
        contentVersion: content.version,
      },
    };
  }
}

function getSelectedText(content: IGeneratedContentDocument): string | undefined {
  return content.selectedText ?? content.rawOutput ?? content.variants[0]?.text;
}

function resolveHeadline(
  product: IProductDocument,
  content: IGeneratedContentDocument,
  selectedText: string | undefined
): string {
  if (content.contentType === ContentType.HEADLINE && selectedText) {
    return resolveProfessionalHeadline(product, selectedText);
  }

  if (content.contentType === ContentType.MARKETING_COPY && selectedText) {
    return resolveProfessionalHeadline(
      product,
      selectedText.split(/[.\n]/)[0]?.trim() || product.name
    );
  }

  return product.name;
}

function compactHeadline(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const leadClause = normalized.split(/\s[-–—]\s/)[0]?.trim();
  const candidate = leadClause && leadClause.length >= 18 ? leadClause : normalized;

  if (candidate.length <= 64) return candidate;

  const words = candidate.split(' ');
  let result = '';

  for (const word of words) {
    const next = result ? `${result} ${word}` : word;
    if (next.length > 61) break;
    result = next;
  }

  return result ? `${result}…` : `${candidate.slice(0, 61).trim()}…`;
}

function resolveProfessionalHeadline(
  product: IProductDocument,
  candidate: string
): string {
  const compact = compactHeadline(candidate);
  const genericLead = /\b(unlock|unleash|elevate|experience|discover|redefine|transform|step into|meet the future|level up)\b/i;
  const excessivePunctuation = /[!?]{2,}/;

  if (
    genericLead.test(compact) ||
    excessivePunctuation.test(compact) ||
    compact.split(/\s+/).length > 10
  ) {
    return compactHeadline(product.name);
  }

  return compact;
}

function resolveDescription(
  product: IProductDocument,
  content: IGeneratedContentDocument,
  selectedText: string | undefined
): string | undefined {
  if (content.contentType === ContentType.PRODUCT_DESCRIPTION && selectedText) {
    return selectedText;
  }

  if (content.contentType === ContentType.MARKETING_COPY && selectedText) {
    const sentences = selectedText.split(/(?<=[.!?])\s+/);
    return sentences[1]?.trim() ?? product.shortDescription ?? product.description;
  }

  return product.shortDescription ?? product.description;
}

function resolveCta(
  product: IProductDocument,
  content: IGeneratedContentDocument,
  selectedText: string | undefined
): string {
  if (content.contentType === ContentType.CALL_TO_ACTION && selectedText) {
    const compact = selectedText.replace(/\s+/g, ' ').trim();
    if (
      compact.length <= 22 &&
      /^(shop|explore|discover|view|see|learn|try|find|get|order|buy)\b/i.test(compact)
    ) {
      return compact;
    }
  }

  const options = CTA_COPY_BY_CATEGORY[resolveProductCategory(product)];
  return options[randomInt(options.length)]!;
}

type CtaCopyCategory = 'technology' | 'sports' | 'coffee' | 'fragrance' | 'general';

const CTA_COPY_BY_CATEGORY: Readonly<Record<CtaCopyCategory, readonly string[]>> = {
  technology: ['Discover More', 'Experience It', 'Explore Innovation', 'See What’s Next'],
  sports: ['Own The Run', 'Move Faster', 'Step In', 'Find Your Pace'],
  coffee: ['Start Your Morning', 'Taste Comfort', 'Brew Happiness', 'Make It Yours'],
  fragrance: ['Experience Luxury', 'Discover The Scent', 'Own The Moment', 'Enter The Edit'],
  general: ['Discover More', 'Explore The Collection', 'Make It Yours', 'See The Details'],
};

function resolveProductCategory(product: IProductDocument): CtaCopyCategory {
  const context = [
    product.categories?.[0],
    product.vendor,
    product.name,
    product.shortDescription,
    product.description,
  ].filter(Boolean).join(' ').toLowerCase();

  if (/coffee|espresso|cafe|mug|tea|drinkware|roast|ceramic/.test(context)) return 'coffee';
  if (/perfume|fragrance|cologne|eau de|scent|parfum/.test(context)) return 'fragrance';
  if (/shoe|sneaker|sport|fitness|running|training|athletic/.test(context)) return 'sports';
  if (/phone|smartphone|electronic|laptop|tablet|device|tech|camera|audio/.test(context)) return 'technology';
  return 'general';
}

function resolvePromotion(
  product: IProductDocument,
  compareAtPrice: number | undefined
): PosterData['promotion'] {
  const discountPercent = compareAtPrice
    ? Math.round(((compareAtPrice - product.price) / compareAtPrice) * 100)
    : undefined;

  return discountPercent ? { discountPercent } : undefined;
}

function getValidCompareAtAmount(product: IProductDocument): number | undefined {
  return typeof product.compareAtPrice === 'number' &&
    product.compareAtPrice > product.price
    ? product.compareAtPrice
    : undefined;
}

function getPrimaryImage(images: IProductImage[]): IProductImage | undefined {
  return [...images].sort((a, b) => a.position - b.position)[0];
}

function mapProductImage(image: IProductImage | null | undefined): PosterImageData | undefined {
  if (!image) {
    return undefined;
  }

  return {
    url: image.url,
    altText: image.altText,
    width: image.width,
    height: image.height,
  };
}
