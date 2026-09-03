import type {
  BackgroundTreatment,
  ProductShadowTreatment,
  ProductTreatment,
} from '../composition';
import type { PosterColorPalette, PosterData, PremiumPosterTheme } from '../types';
import type { PosterSizeName } from '../../poster-intelligence/layout/LayoutTypes';
import type { PosterTemplate } from '../templates/PosterTemplate';
import type { IGeneratedContentDocument } from '../../models/GeneratedContent';
import type { IProductDocument } from '../../models/Product';
import type { PosterDesignDecision, PosterDesignInput } from '../../poster-intelligence/composer/PosterDesignTypes';

export function buildPosterDesignInput(
  product: IProductDocument,
  content: IGeneratedContentDocument,
  template: PosterTemplate
): PosterDesignInput {
  return {
    productCategory: resolveProductCategory(product),
    posterSize: {
      width: template.dimensions.width,
      height: template.dimensions.height,
      name: resolvePosterSizeName(template.dimensions.width, template.dimensions.height),
    },
    campaign: resolveCampaign(product, content),
    tone: resolveTone(product, template),
    industryPack: resolveIndustryPack(product),
    productTitle: product.name,
    tags: product.tags,
  };
}

export function applyPosterDesignDecisionToPosterData(
  data: PosterData,
  decision: PosterDesignDecision
): PosterData {
  const palette = toRendererPalette(decision);

  return {
    ...data,
    metadata: {
      ...data.metadata,
      posterDesignDecision: decision,
      palette,
      theme: toRendererTheme(decision),
      backgroundTreatment: toBackgroundTreatment(decision),
      productTreatment: toProductTreatment(decision),
      productRotation: decision.position.rotation,
      productGlow: toProductGlow(decision),
      productShadow: toProductShadow(decision),
      decorationProfile: decision.decorations,
    },
  };
}

export function logPosterDesignDecision(
  decision: PosterDesignDecision,
  designDurationMs: number
): void {
  console.log('PosterDesignDecision');
  console.log(JSON.stringify(decision, null, 2));
  console.log(`Selected Layout: ${decision.layout.layoutId}`);
  console.log(`Typography: ${decision.typography.typographyId}`);
  console.log(`Palette: ${decision.colors.paletteId}`);
  console.log(`Background: ${decision.background.themeId}`);
  console.log(`Position: ${decision.position.positionId}`);
  console.log(`Decoration: ${decision.decorations.decorationId}`);
  console.log(`Poster Intelligence Generation Time: ${designDurationMs}ms`);
}

function resolveProductCategory(product: IProductDocument): string {
  return (
    product.categories[0] ??
    product.productType ??
    product.processingMetadata.keywords?.[0] ??
    'General'
  );
}

function resolvePosterSizeName(
  width: number,
  height: number
): PosterSizeName {
  const ratio = width / height;
  if (ratio > 1.75) return 'wide';
  if (ratio > 1.18) return 'landscape';
  if (ratio < 0.62) return 'story';
  if (ratio < 0.88) return 'portrait';
  return 'square';
}

function resolveCampaign(
  product: IProductDocument,
  content: IGeneratedContentDocument
): string {
  const text = searchableProductText(product, content);

  if (product.compareAtPrice && product.compareAtPrice > product.price) return 'Black Friday';
  if (/\b(clearance|sale|discount|deal|save)\b/.test(text)) return 'Clearance';
  if (/\b(luxury|gold|diamond|perfume|fragrance|leather)\b/.test(text)) return 'Luxury';
  if (/\b(premium|pro|crafted|signature)\b/.test(text)) return 'Premium';
  if (/\b(new|arrival|launch|latest)\b/.test(text)) return 'New Arrival';
  if (/\b(summer|sun|beach|outdoor)\b/.test(text)) return 'Summer';
  if (/\b(winter|warm|cozy)\b/.test(text)) return 'Winter';
  if (/\b(minimal|clean|simple)\b/.test(text)) return 'Minimal';
  return 'Default';
}

function resolveTone(product: IProductDocument, template: PosterTemplate): string {
  const style = String(template.metadata?.['style'] ?? '').toLowerCase();
  const text = searchableProductText(product);

  if (style === 'minimalist') return 'Minimal';
  if (style === 'elegant' || style === 'vintage') return 'Elegant';
  if (style === 'professional') return 'Modern';
  if (style === 'bold') return 'Bold';
  if (style === 'playful') return 'Friendly';
  if (/\b(sport|fitness|running|training|shoe|sneaker)\b/.test(text)) return 'Energetic';
  if (/\b(coffee|espresso|mug|tea|ceramic)\b/.test(text)) return 'Warm';
  if (/\b(phone|laptop|tech|electronic|camera|audio)\b/.test(text)) return 'Technology';
  if (/\b(jewelry|gold|diamond|perfume|fragrance)\b/.test(text)) return 'Elegant';
  if (/\b(fashion|apparel|dress|blazer|style)\b/.test(text)) return 'Editorial';
  return 'Modern';
}

function resolveIndustryPack(product: IProductDocument): string {
  const text = searchableProductText(product);

  if (/\b(gaming|gamer|esports)\b/.test(text)) return 'Gaming';
  if (/\b(jewelry|gold|diamond|ring|necklace)\b/.test(text)) return 'Jewelry';
  if (/\b(perfume|fragrance|luxury|cologne)\b/.test(text)) return 'Luxury';
  if (/\b(coffee|espresso|mug|tea|ceramic)\b/.test(text)) return 'Coffee';
  if (/\b(furniture|chair|sofa|table|home|interior)\b/.test(text)) return 'Furniture';
  if (/\b(fashion|apparel|dress|blazer|style)\b/.test(text)) return 'Fashion';
  if (/\b(sport|fitness|running|training|shoe|sneaker)\b/.test(text)) return 'Fitness';
  if (/\b(phone|laptop|tech|electronic|camera|audio|device)\b/.test(text)) return 'Electronics';
  return 'Business';
}

function searchableProductText(
  product: IProductDocument,
  content?: IGeneratedContentDocument
): string {
  return [
    product.name,
    product.productType,
    product.vendor,
    product.description,
    product.shortDescription,
    ...product.categories,
    ...product.tags,
    ...(product.processingMetadata.keywords ?? []),
    content?.productName,
    content?.productDescription,
    ...(content?.contextKeywords ?? []),
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' ')
    .toLowerCase();
}

function toRendererPalette(decision: PosterDesignDecision): PosterColorPalette {
  return {
    dominant: decision.colors.background,
    vibrant: decision.colors.decorative,
    accent: decision.colors.accent,
    background: decision.colors.background,
    backgroundAlt: decision.colors.surface,
    surface: decision.colors.surface,
    text: decision.colors.headline,
    mutedText: decision.colors.description,
    glow: decision.colors.decorative,
  };
}

function toRendererTheme(decision: PosterDesignDecision): PremiumPosterTheme {
  switch (decision.background.themeId) {
    case 'technology':
    case 'glass':
      return 'tech';
    case 'sports':
      return 'sports';
    case 'coffee':
      return 'coffee';
    case 'marble':
      return 'fragrance';
    case 'luxury':
    case 'premium':
      return 'luxury';
    case 'fashion':
    case 'editorial':
      return 'fashion';
    case 'living-room':
    case 'nature':
      return 'interior';
    case 'minimal':
      return 'minimal';
    case 'studio':
    default:
      return 'modern';
  }
}

function toBackgroundTreatment(decision: PosterDesignDecision): BackgroundTreatment {
  switch (decision.background.themeId) {
    case 'luxury':
      return 'dark-luxury';
    case 'marble':
      return 'marble';
    case 'glass':
      return 'glass-reflection';
    case 'technology':
      return 'light-tunnel';
    case 'coffee':
      return 'cafe-light';
    case 'sports':
      return 'speed-lines';
    case 'fashion':
    case 'editorial':
      return 'editorial-arch';
    case 'living-room':
      return 'morning-window';
    case 'premium':
      return 'soft-spotlight';
    case 'nature':
      return 'golden-hour';
    case 'minimal':
    case 'studio':
    default:
      return 'studio-halo';
  }
}

function toProductTreatment(decision: PosterDesignDecision): ProductTreatment {
  switch (decision.position.positionId) {
    case 'floating':
      return 'floating';
    case 'dynamic':
      return 'diagonal';
    case 'close-up':
      return 'macro';
    case 'editorial':
    case 'lifestyle':
      return 'editorial';
    case 'luxury':
      return 'reflection';
    case 'corner-focus':
      return 'edge-crop';
    case 'hero':
    case 'minimal':
    case 'center-focus':
    default:
      return 'centered';
  }
}

function toProductShadow(decision: PosterDesignDecision): ProductShadowTreatment {
  switch (decision.position.shadowStyle) {
    case 'none':
      return 'none';
    case 'dramatic':
    case 'luxury':
      return 'dramatic';
    case 'contact':
      return 'grounded';
    case 'soft':
    case 'floating':
    default:
      return 'soft';
  }
}

function toProductGlow(decision: PosterDesignDecision): number {
  switch (decision.position.depth) {
    case 'immersive':
      return 0.78;
    case 'layered':
      return 0.68;
    case 'foreground':
      return 0.58;
    case 'midground':
      return 0.44;
    case 'flat':
    default:
      return 0.24;
  }
}
