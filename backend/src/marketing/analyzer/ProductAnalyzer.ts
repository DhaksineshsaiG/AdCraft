import CategoryDetector, { MarketingCategory } from '../category/CategoryDetector';
import ToneEngine, { MarketingTone } from '../tone/ToneEngine';

interface ProductImageLike {
  url?: string;
  src?: string;
  altText?: string;
  alt?: string | null;
}

interface ProductVariantLike {
  price?: number | string | null;
}

export interface ProductAnalyzerInput {
  title?: string;
  name?: string;
  vendor?: string | null;
  category?: string;
  productType?: string | null;
  type?: string | null;
  description?: string | null;
  body_html?: string | null;
  price?: number | string | null;
  tags?: string[] | string | null;
  image?: string | ProductImageLike | null;
  images?: ProductImageLike[] | null;
  variants?: ProductVariantLike[] | null;
}

export interface AnalyzedProduct {
  title: string;
  vendor: string;
  category: string;
  description: string;
  price: number;
  tags: string[];
  image: string;
  normalizedCategory: MarketingCategory;
  tone: MarketingTone;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseTags(tags: ProductAnalyzerInput['tags']): string[] {
  if (Array.isArray(tags)) {
    return tags.map((tag) => tag.trim()).filter(Boolean);
  }

  if (typeof tags === 'string') {
    return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
  }

  return [];
}

function parsePrice(product: ProductAnalyzerInput): number {
  const directPrice = Number(product.price);
  if (Number.isFinite(directPrice)) return directPrice;

  const variantPrice = Number(product.variants?.[0]?.price);
  return Number.isFinite(variantPrice) ? variantPrice : 0;
}

function parseImage(product: ProductAnalyzerInput): string {
  if (typeof product.image === 'string') return product.image;
  if (product.image?.url) return product.image.url;
  if (product.image?.src) return product.image.src;

  const primaryImage = product.images?.[0];
  return primaryImage?.url ?? primaryImage?.src ?? '';
}

export class ProductAnalyzer {
  constructor(
    private readonly categoryDetector: CategoryDetector = new CategoryDetector(),
    private readonly toneEngine: ToneEngine = new ToneEngine()
  ) {}

  analyze(product: ProductAnalyzerInput): AnalyzedProduct {
    const title = product.title?.trim() || product.name?.trim() || '';
    const category =
      product.category?.trim() ||
      product.productType?.trim() ||
      product.type?.trim() ||
      '';
    const description = stripHtml(product.description ?? product.body_html ?? '');
    const tags = parseTags(product.tags);
    const normalizedCategory = this.categoryDetector.detect({
      title,
      category,
      description,
      tags,
    });

    return {
      title,
      vendor: product.vendor?.trim() ?? '',
      category,
      description,
      price: parsePrice(product),
      tags,
      image: parseImage(product),
      normalizedCategory,
      tone: this.toneEngine.getTone(normalizedCategory),
    };
  }
}

export default ProductAnalyzer;
