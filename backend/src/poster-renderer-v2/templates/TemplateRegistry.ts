import {
  RendererTemplateProfile,
  TemplateCollection,
  TemplateFillMode,
  TemplateShape,
  TemplateShadowStyle,
} from './TemplateTypes';

interface TemplateSeed {
  id: string;
  name: string;
  collection: TemplateCollection;
  categories: string[];
  campaigns?: string[];
  tones?: string[];
  industryPacks?: string[];
  posterSizes?: string[];
  density?: RendererTemplateProfile['spacingSystem']['density'];
  shape?: TemplateShape;
  fill?: TemplateFillMode;
  shadow?: TemplateShadowStyle;
  card?: RendererTemplateProfile['cardStyle']['mode'];
  gradient?: RendererTemplateProfile['gradientPreset']['direction'];
  layerMode?: RendererTemplateProfile['decorationPreset']['layerMode'];
  imageFocus?: RendererTemplateProfile['imageEmphasis']['focus'];
  compositionMode?: RendererTemplateProfile['compositionMode'];
  typographyPersonality?: RendererTemplateProfile['typographyPersonality'];
  productBacking?: RendererTemplateProfile['productBacking'];
  base?: number;
  accent?: number;
}

const COLLECTION_DEFAULTS: Record<TemplateCollection, Partial<TemplateSeed>> = {
  Luxury: {
    shape: 'pill',
    fill: 'gradient',
    shadow: 'glow',
    card: 'glass',
    gradient: 'spotlight',
    layerMode: 'ornamental',
    imageFocus: 'hero',
    density: 'airy',
    accent: 1.18,
    compositionMode: 'framed-product',
    typographyPersonality: 'editorial-serif',
    productBacking: 'arch',
  },
  Technology: {
    shape: 'soft',
    fill: 'glass',
    shadow: 'glow',
    card: 'glass',
    gradient: 'diagonal',
    layerMode: 'motion',
    imageFocus: 'hero',
    density: 'balanced',
    accent: 1.08,
    compositionMode: 'product-dominant',
    typographyPersonality: 'modern-sans',
    productBacking: 'halo',
  },
  Sports: {
    shape: 'sharp',
    fill: 'solid',
    shadow: 'dramatic',
    card: 'none',
    gradient: 'diagonal',
    layerMode: 'motion',
    imageFocus: 'hero',
    density: 'dramatic',
    accent: 1.22,
    compositionMode: 'product-dominant',
    typographyPersonality: 'bold-display',
    productBacking: 'none',
  },
  Fashion: {
    shape: 'soft',
    fill: 'outline',
    shadow: 'floating',
    card: 'outline',
    gradient: 'vertical',
    layerMode: 'editorial',
    imageFocus: 'balanced',
    density: 'airy',
    accent: 1.06,
    compositionMode: 'product-right',
    typographyPersonality: 'editorial-serif',
    productBacking: 'card',
  },
  Coffee: {
    shape: 'rounded',
    fill: 'solid',
    shadow: 'soft',
    card: 'solid',
    gradient: 'radial',
    layerMode: 'quiet',
    imageFocus: 'balanced',
    density: 'balanced',
    accent: 1,
    compositionMode: 'product-center',
    typographyPersonality: 'editorial-serif',
    productBacking: 'halo',
  },
  Furniture: {
    shape: 'soft',
    fill: 'solid',
    shadow: 'contact',
    card: 'elevated',
    gradient: 'horizontal',
    layerMode: 'framed',
    imageFocus: 'balanced',
    density: 'airy',
    accent: 0.96,
    compositionMode: 'product-left',
    typographyPersonality: 'modern-sans',
    productBacking: 'pedestal',
  },
  Electronics: {
    shape: 'soft',
    fill: 'glass',
    shadow: 'floating',
    card: 'glass',
    gradient: 'spotlight',
    layerMode: 'motion',
    imageFocus: 'hero',
    density: 'balanced',
    accent: 1.05,
    compositionMode: 'product-dominant',
    typographyPersonality: 'modern-sans',
    productBacking: 'halo',
  },
  Jewelry: {
    shape: 'pill',
    fill: 'gradient',
    shadow: 'glow',
    card: 'outline',
    gradient: 'radial',
    layerMode: 'ornamental',
    imageFocus: 'detail',
    density: 'airy',
    accent: 1.16,
    compositionMode: 'framed-product',
    typographyPersonality: 'editorial-serif',
    productBacking: 'arch',
  },
  Minimal: {
    shape: 'soft',
    fill: 'solid',
    shadow: 'soft',
    card: 'none',
    gradient: 'vertical',
    layerMode: 'quiet',
    imageFocus: 'hero',
    density: 'airy',
    accent: 0.88,
    compositionMode: 'product-center',
    typographyPersonality: 'modern-sans',
    productBacking: 'pedestal',
  },
  Editorial: {
    shape: 'sharp',
    fill: 'underline',
    shadow: 'soft',
    card: 'outline',
    gradient: 'horizontal',
    layerMode: 'editorial',
    imageFocus: 'hero',
    density: 'compact',
    accent: 1.04,
    compositionMode: 'product-bottom',
    typographyPersonality: 'editorial-serif',
    productBacking: 'card',
  },
};

const TEMPLATE_SEEDS: TemplateSeed[] = [
  seed('luxury-black-label', 'Black Label Atelier', 'Luxury', ['luxury', 'perfume', 'fragrance', 'jewelry'], ['luxury', 'premium'], ['elegant', 'refined']),
  seed('luxury-gala-glow', 'Gala Glow', 'Luxury', ['perfume', 'jewelry', 'beauty'], ['festival', 'premium'], ['glamorous', 'elegant'], { gradient: 'radial', accent: 1.28 }),
  seed('luxury-quiet-opulence', 'Quiet Opulence', 'Luxury', ['accessories', 'jewelry', 'fashion'], ['luxury'], ['minimal', 'refined'], { density: 'airy', card: 'outline', accent: 1.05 }),

  seed('technology-neon-grid', 'Neon Grid', 'Technology', ['technology', 'electronics', 'phone'], ['new arrival'], ['technology', 'modern'], { fill: 'glass', shadow: 'glow' }),
  seed('technology-cyber-mist', 'Cyber Mist', 'Technology', ['software', 'gaming', 'technology'], ['black friday', 'launch'], ['bold', 'futuristic'], { density: 'dramatic', accent: 1.18 }),
  seed('technology-clean-system', 'Clean System', 'Technology', ['electronics', 'technology', 'phone'], ['minimal'], ['clean', 'modern'], { card: 'none', layerMode: 'quiet', accent: 0.96 }),

  seed('sports-velocity-cut', 'Velocity Cut', 'Sports', ['sports', 'shoes', 'footwear', 'fitness'], ['summer', 'new arrival'], ['active', 'energetic']),
  seed('sports-arena-poster', 'Arena Poster', 'Sports', ['sports', 'fitness'], ['black friday'], ['bold', 'urgent'], { gradient: 'spotlight', accent: 1.32 }),
  seed('sports-training-day', 'Training Day', 'Sports', ['sports', 'fitness', 'hydration'], ['clearance', 'summer'], ['practical', 'active'], { density: 'balanced', shadow: 'floating' }),

  seed('fashion-runway-block', 'Runway Block', 'Fashion', ['fashion', 'apparel', 'shoes'], ['festival'], ['editorial', 'elegant']),
  seed('fashion-lookbook-white', 'Lookbook White', 'Fashion', ['fashion', 'apparel'], ['new arrival'], ['clean', 'refined'], { card: 'none', density: 'airy' }),
  seed('fashion-after-dark', 'After Dark Editorial', 'Fashion', ['fashion', 'perfume'], ['premium'], ['bold', 'editorial'], { gradient: 'spotlight', fill: 'outline', accent: 1.18 }),

  seed('coffee-roastery-warmth', 'Roastery Warmth', 'Coffee', ['coffee', 'mug', 'espresso'], ['winter'], ['warm', 'cozy'], { compositionMode: 'product-center', typographyPersonality: 'editorial-serif', productBacking: 'halo' }),
  seed('coffee-morning-paper', 'Morning Paper', 'Coffee', ['coffee', 'breakfast'], ['default'], ['friendly', 'editorial'], { layerMode: 'editorial', card: 'outline' }),
  seed('coffee-artisan-shelf', 'Artisan Shelf', 'Coffee', ['coffee', 'home'], ['premium'], ['calm', 'warm'], { card: 'elevated', gradient: 'horizontal' }),

  seed('furniture-soft-catalog', 'Soft Catalog', 'Furniture', ['furniture', 'home', 'sofa'], ['minimal'], ['calm', 'practical']),
  seed('furniture-living-room', 'Living Room Spread', 'Furniture', ['furniture', 'home'], ['winter'], ['balanced', 'warm'], { gradient: 'radial', card: 'solid' }),
  seed('furniture-modern-loft', 'Modern Loft', 'Furniture', ['furniture', 'decor'], ['new arrival'], ['modern', 'clean'], { card: 'outline', fill: 'outline' }),

  seed('electronics-glass-launch', 'Glass Launch', 'Electronics', ['electronics', 'phone', 'audio', 'headphones'], ['new arrival'], ['technology', 'modern'], { compositionMode: 'product-dominant', typographyPersonality: 'modern-sans', productBacking: 'halo' }),
  seed('electronics-product-lab', 'Product Lab', 'Electronics', ['electronics', 'gadget', 'headphones', 'audio'], ['minimal'], ['clean', 'minimal'], { compositionMode: 'framed-product', typographyPersonality: 'modern-sans', productBacking: 'pedestal', card: 'outline' }),
  seed('electronics-blueprint', 'Blueprint Circuit', 'Electronics', ['electronics', 'technology'], ['black friday'], ['bold', 'technical'], { layerMode: 'motion', density: 'dramatic' }),

  seed('jewelry-gold-frame', 'Gold Frame', 'Jewelry', ['jewelry', 'necklace', 'ring'], ['luxury'], ['elegant', 'premium']),
  seed('jewelry-sparkle-field', 'Sparkle Field', 'Jewelry', ['jewelry', 'gift'], ['festival'], ['glamorous', 'refined'], { density: 'dramatic', accent: 1.3 }),
  seed('jewelry-gallery-case', 'Gallery Case', 'Jewelry', ['jewelry', 'accessories'], ['premium'], ['minimal', 'luxury'], { card: 'glass', layerMode: 'framed' }),

  seed('minimal-pure-space', 'Pure Space', 'Minimal', ['electronics', 'technology', 'general'], ['minimal'], ['minimal', 'clean']),
  seed('minimal-soft-commerce', 'Soft Commerce', 'Minimal', ['furniture', 'coffee', 'general'], ['default'], ['friendly', 'calm'], { shape: 'rounded', fill: 'solid' }),
  seed('minimal-luxe-air', 'Luxe Air', 'Minimal', ['jewelry', 'perfume', 'fashion'], ['premium'], ['refined', 'elegant'], { shadow: 'glow', accent: 0.98 }),

  seed('editorial-magazine-cover', 'Magazine Cover', 'Editorial', ['fashion', 'coffee', 'perfume'], ['festival'], ['editorial']),
  seed('editorial-product-story', 'Product Story', 'Editorial', ['coffee', 'furniture', 'fashion'], ['winter', 'default'], ['warm', 'lifestyle'], { card: 'solid', shape: 'soft' }),
  seed('editorial-sale-sheet', 'Sale Sheet', 'Editorial', ['electronics', 'sports', 'fashion'], ['clearance', 'black friday'], ['bold', 'urgent'], { density: 'compact', accent: 1.2 }),
];

function seed(
  id: string,
  name: string,
  collection: TemplateCollection,
  categories: string[],
  campaigns: string[] = [],
  tones: string[] = [],
  overrides: Partial<TemplateSeed> = {}
): TemplateSeed {
  return {
    id,
    name,
    collection,
    categories,
    campaigns,
    tones,
    industryPacks: [collection.toLowerCase()],
    posterSizes: [],
    ...overrides,
  };
}

function createTemplate(seedData: TemplateSeed): RendererTemplateProfile {
  const defaults = COLLECTION_DEFAULTS[seedData.collection];
  const accent = seedData.accent ?? defaults.accent ?? 1;
  const density = seedData.density ?? defaults.density ?? 'balanced';

  return {
    templateId: seedData.id,
    name: seedData.name,
    collection: seedData.collection,
    spacingSystem: {
      base: Math.round((seedData.base ?? 10) * accent),
      sectionGap: Math.round(24 * accent),
      textGap: Math.round(12 * accent),
      edgePadding: density === 'compact' ? 6 : density === 'airy' ? 12 : 9,
      density,
    },
    cornerRadius: {
      surface: seedData.shape === 'sharp' ? 2 : seedData.shape === 'pill' ? 28 : seedData.shape === 'rounded' ? 18 : 10,
      image: seedData.shape === 'sharp' ? 4 : seedData.shape === 'pill' ? 26 : seedData.shape === 'rounded' ? 22 : 12,
      cta: seedData.shape === 'pill' ? 999 : seedData.shape === 'sharp' ? 2 : seedData.shape === 'rounded' ? 20 : 10,
      decoration: seedData.shape === 'sharp' ? 2 : 12,
    },
    cardStyle: {
      mode: seedData.card ?? defaults.card ?? 'none',
      opacity: seedData.card === 'none' || defaults.card === 'none' ? 0 : density === 'airy' ? 0.18 : 0.28,
      blur: seedData.card === 'glass' || defaults.card === 'glass' ? 14 : 0,
      strokeOpacity: seedData.card === 'outline' || defaults.card === 'outline' ? 0.5 : 0.24,
    },
    ctaStyle: {
      shape: seedData.shape ?? defaults.shape ?? 'soft',
      fill: seedData.fill ?? defaults.fill ?? 'solid',
      emphasis: accent > 1.16 ? 'strong' : accent < 0.95 ? 'subtle' : 'balanced',
      minWidthRatio: density === 'compact' ? 0.42 : 0.52,
      heightRatio: density === 'compact' ? 0.085 : 0.072,
    },
    decorationPreset: {
      intensity: density === 'dramatic' ? 1.35 : density === 'airy' ? 0.72 : 1,
      scale: accent,
      protectedPadding: density === 'compact' ? 0.04 : 0.07,
      layerMode: seedData.layerMode ?? defaults.layerMode ?? 'quiet',
    },
    gradientPreset: {
      direction: seedData.gradient ?? defaults.gradient ?? 'vertical',
      stops: [
        { offset: 0, token: 'background', opacity: 1 },
        { offset: 48, token: 'surface', opacity: 0.92 },
        { offset: 100, token: accent > 1.12 ? 'accent' : 'background', opacity: accent > 1.12 ? 0.22 : 1 },
      ],
      lighting: density === 'dramatic' ? 0.72 : density === 'airy' ? 0.38 : 0.52,
      textureIntensity: density === 'airy' ? 0.72 : density === 'dramatic' ? 1.22 : 1,
      particleDensity: density === 'dramatic' ? 1.5 : density === 'compact' ? 0.9 : 1,
      vignetteStrength: accent > 1.12 ? 1.18 : 0.92,
    },
    shadowPreset: {
      style: seedData.shadow ?? defaults.shadow ?? 'soft',
      opacity: seedData.shadow === 'none' ? 0 : Math.min(0.64, 0.24 * accent),
      blur: Math.round(26 * accent),
      offsetX: seedData.shadow === 'dramatic' ? 12 : 0,
      offsetY: seedData.shadow === 'contact' ? 8 : Math.round(18 * accent),
      glowIntensity: seedData.shadow === 'glow' || defaults.shadow === 'glow' ? 0.45 * accent : 0.12,
    },
    borderStyle: {
      width: seedData.card === 'outline' || defaults.card === 'outline' ? 1.5 : 1,
      opacity: density === 'airy' ? 0.28 : 0.42,
      radiusMultiplier: seedData.shape === 'sharp' ? 0.35 : 1,
      position: seedData.card === 'outline' || defaults.card === 'outline' ? 'frame' : 'inside',
    },
    typographyRatios: {
      headlineScale: density === 'dramatic' ? 1.08 : density === 'airy' ? 0.96 : 1,
      descriptionScale: density === 'compact' ? 0.92 : 1,
      priceScale: accent > 1.12 ? 1.08 : 1,
      ctaScale: density === 'dramatic' ? 1.05 : 1,
      lineHeightMultiplier: density === 'compact' ? 0.96 : density === 'airy' ? 1.06 : 1,
      trackingMultiplier: seedData.collection === 'Luxury' || seedData.collection === 'Jewelry' ? 1.35 : 1,
      maxLineLengthMultiplier: density === 'compact' ? 0.88 : density === 'airy' ? 1.08 : 1,
    },
    imageEmphasis: {
      scaleMultiplier: seedData.imageFocus === 'hero' || defaults.imageFocus === 'hero' ? 1.08 : seedData.imageFocus === 'detail' || defaults.imageFocus === 'detail' ? 1.02 : 0.96,
      padding: density === 'airy' ? 0.08 : 0.04,
      focus: seedData.imageFocus ?? defaults.imageFocus ?? 'balanced',
      reflection: seedData.collection === 'Luxury' || seedData.collection === 'Jewelry' ? 0.58 : 0.18,
      glow: seedData.shadow === 'glow' || defaults.shadow === 'glow' ? 0.55 : 0.18,
      cropSafety: density === 'dramatic' ? 0.04 : 0.08,
    },
    whitespaceProfile: {
      marginMultiplier: density === 'airy' ? 1.18 : density === 'compact' ? 0.86 : 1,
      negativeSpaceBias: seedData.collection === 'Minimal' || seedData.collection === 'Luxury' ? 1.25 : 1,
      compactness: density === 'compact' ? 1.2 : density === 'airy' ? 0.82 : 1,
    },
    affinity: {
      categories: seedData.categories,
      campaigns: seedData.campaigns ?? [],
      tones: seedData.tones ?? [],
      industryPacks: seedData.industryPacks ?? [],
      posterSizes: seedData.posterSizes ?? [],
    },
    compositionMode: seedData.compositionMode ?? defaults.compositionMode ?? 'product-center',
    typographyPersonality: seedData.typographyPersonality ?? defaults.typographyPersonality ?? 'modern-sans',
    productBacking: seedData.productBacking ?? defaults.productBacking ?? 'none',
  };
}

const TEMPLATES = TEMPLATE_SEEDS.map(createTemplate);

export class TemplateRegistry {
  getAll(): RendererTemplateProfile[] {
    return TEMPLATES.map(cloneTemplate);
  }

  getById(templateId: string): RendererTemplateProfile | undefined {
    const template = TEMPLATES.find((candidate) => candidate.templateId === templateId);
    return template ? cloneTemplate(template) : undefined;
  }

  getByCollection(collection: TemplateCollection): RendererTemplateProfile[] {
    return TEMPLATES
      .filter((template) => template.collection === collection)
      .map(cloneTemplate);
  }

  getCollections(): TemplateCollection[] {
    return ['Luxury', 'Technology', 'Sports', 'Fashion', 'Coffee', 'Furniture', 'Electronics', 'Jewelry', 'Minimal', 'Editorial'];
  }
}

function cloneTemplate(template: RendererTemplateProfile): RendererTemplateProfile {
  return JSON.parse(JSON.stringify(template)) as RendererTemplateProfile;
}

export default TemplateRegistry;
