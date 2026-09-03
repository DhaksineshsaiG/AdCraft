import {
  alignment,
  BadgeTreatment,
  BackgroundTreatment,
  CompositionBlueprint,
  CompositionCategory,
  CompositionFrame,
  CompositionTypography,
  CtaTreatment,
  PriceTreatment,
  ProductShadowTreatment,
  ProductTreatment,
} from './CompositionBlueprint';

const BADGE_TREATMENTS_BY_CATEGORY: Readonly<
  Record<CompositionCategory, readonly BadgeTreatment[]>
> = {
  technology: ['modern-chip', 'premium-label', 'corner-ribbon'],
  sports: ['corner-ribbon', 'editorial-sticker', 'premium-label'],
  coffee: ['premium-label', 'editorial-sticker', 'modern-chip'],
  fragrance: ['luxury-tag', 'editorial-sticker', 'premium-label'],
  fashion: ['editorial-sticker', 'luxury-tag', 'corner-ribbon'],
  interior: ['premium-label', 'modern-chip', 'luxury-tag'],
  general: ['modern-chip', 'premium-label', 'editorial-sticker'],
};

type Archetype =
  | 'hero-left'
  | 'hero-right'
  | 'center-focus'
  | 'floating'
  | 'macro'
  | 'minimal'
  | 'diagonal'
  | 'split-stage'
  | 'editorial-bottom'
  | 'edge-crop';

interface BlueprintSpec {
  id: string;
  name: string;
  archetype: Archetype;
  background: BackgroundTreatment;
  product: ProductTreatment;
  cta: CtaTreatment;
  price: PriceTreatment;
  rotation?: number;
  glow?: number;
  shadow?: ProductShadowTreatment;
  typography?: Partial<CompositionTypography>;
}

const BASE_TYPOGRAPHY: Record<CompositionCategory, CompositionTypography> = {
  technology: {
    family: 'modern',
    headlineScale: 1,
    headlineWeight: 'bold',
    descriptionScale: 0.94,
    priceScale: 1,
    headlineLineHeight: 0.97,
    descriptionLineHeight: 1.34,
    ctaLetterSpacing: 0.5,
    maxHeadlineLines: 3,
  },
  sports: {
    family: 'condensed',
    headlineScale: 1.12,
    headlineWeight: 'bold',
    descriptionScale: 0.92,
    priceScale: 1.04,
    headlineLineHeight: 0.91,
    descriptionLineHeight: 1.22,
    ctaLetterSpacing: 0.9,
    uppercase: true,
    maxHeadlineLines: 3,
  },
  coffee: {
    family: 'editorial',
    headlineScale: 0.96,
    headlineWeight: 'semibold',
    descriptionScale: 0.98,
    priceScale: 0.96,
    headlineLineHeight: 1.03,
    descriptionLineHeight: 1.42,
    ctaLetterSpacing: 0.25,
    maxHeadlineLines: 3,
  },
  fragrance: {
    family: 'elegant',
    headlineScale: 0.92,
    headlineWeight: 'medium',
    descriptionScale: 0.92,
    priceScale: 0.94,
    letterSpacing: 0.4,
    headlineLineHeight: 0.96,
    descriptionLineHeight: 1.48,
    ctaLetterSpacing: 1.1,
    maxHeadlineLines: 3,
  },
  fashion: {
    family: 'editorial',
    headlineScale: 1.04,
    headlineWeight: 'bold',
    descriptionScale: 0.92,
    priceScale: 0.98,
    headlineLineHeight: 0.94,
    descriptionLineHeight: 1.34,
    ctaLetterSpacing: 0.8,
    maxHeadlineLines: 3,
  },
  interior: {
    family: 'modern',
    headlineScale: 0.92,
    headlineWeight: 'semibold',
    descriptionScale: 0.98,
    priceScale: 0.94,
    headlineLineHeight: 1,
    descriptionLineHeight: 1.4,
    ctaLetterSpacing: 0.35,
    maxHeadlineLines: 3,
  },
  general: {
    family: 'modern',
    headlineScale: 1,
    headlineWeight: 'bold',
    descriptionScale: 0.95,
    priceScale: 1,
    headlineLineHeight: 0.98,
    descriptionLineHeight: 1.34,
    ctaLetterSpacing: 0.45,
    maxHeadlineLines: 3,
  },
};

export const TECHNOLOGY_BLUEPRINTS = createBlueprints('technology', [
  spec('hero-left', 'Hero Left', 'hero-left', 'studio-halo', 'floating', 'integrated-type', 'minimal', -2, 0.66),
  spec('hero-right', 'Hero Right', 'hero-right', 'metallic-sweep', 'grounded', 'outline', 'accent-rule', 1, 0.52),
  spec('center-focus', 'Center Focus', 'center-focus', 'light-tunnel', 'centered', 'pill', 'stacked', 0, 0.78),
  spec('floating-device', 'Floating Device', 'floating', 'split-light', 'floating', 'glass-pill', 'inline', -5, 0.82),
  spec('macro-camera', 'Macro Camera', 'macro', 'dark-reflection', 'macro', 'minimal-text', 'editorial', 2, 0.42),
  spec('minimal-apple', 'Minimal Apple Style', 'minimal', 'soft-spotlight', 'centered', 'underline', 'minimal', 0, 0.30, 'soft'),
  spec('titanium-luxury', 'Titanium Luxury', 'split-stage', 'metallic-sweep', 'reflection', 'outline', 'editorial', -1, 0.46, 'dramatic', { family: 'elegant', headlineScale: 0.92 }),
  spec('dark-studio', 'Dark Studio', 'editorial-bottom', 'studio-halo', 'grounded', 'solid', 'floating-label', 0, 0.58),
  spec('edge-device', 'Edge Device', 'edge-crop', 'split-light', 'edge-crop', 'ribbon', 'inline', 3, 0.68),
  spec('precision-diagonal', 'Precision Diagonal', 'diagonal', 'light-tunnel', 'diagonal', 'floating', 'accent-rule', -8, 0.74),
  spec('neon-portal', 'Neon Portal', 'center-focus', 'light-tunnel', 'floating', 'magazine', 'editorial', 4, 0.88),
  spec('editorial-device', 'Editorial Device', 'hero-left', 'metallic-sweep', 'editorial', 'ribbon', 'minimal', 0, 0.34, 'soft', { family: 'editorial', headlineScale: 0.94 }),
  spec('precision-grid', 'Precision Grid', 'split-stage', 'split-light', 'centered', 'glass-pill', 'inline', -3, 0.54),
  spec('shadow-stage', 'Shadow Stage', 'minimal', 'dark-reflection', 'grounded', 'outline', 'stacked', 0, 0.24, 'dramatic'),
]);

export const SPORTS_BLUEPRINTS = createBlueprints('sports', [
  spec('motion', 'Motion', 'diagonal', 'motion-slash', 'diagonal', 'solid', 'accent-rule', -10, 0.76, 'dramatic'),
  spec('dynamic-diagonal', 'Dynamic Diagonal', 'hero-right', 'speed-lines', 'floating', 'ribbon', 'inline', -7, 0.68, 'dramatic'),
  spec('floating-shoe', 'Floating Shoe', 'center-focus', 'energy-ring', 'floating', 'pill', 'stacked', -5, 0.82),
  spec('sports-energy', 'Sports Energy', 'floating', 'track-lights', 'diagonal', 'floating', 'floating-label', -12, 0.72),
  spec('athlete-style', 'Athlete Style', 'hero-left', 'street-flash', 'grounded', 'outline', 'editorial', -3, 0.46),
  spec('speed-lines', 'Speed Lines', 'edge-crop', 'speed-lines', 'edge-crop', 'integrated-type', 'inline', -8, 0.60),
  spec('streetwear', 'Streetwear', 'split-stage', 'street-flash', 'editorial', 'glass-pill', 'editorial', 4, 0.50, 'grounded', { family: 'editorial', uppercase: false }),
  spec('performance', 'Performance', 'macro', 'motion-slash', 'macro', 'underline', 'accent-rule', -4, 0.56),
  spec('starting-block', 'Starting Block', 'editorial-bottom', 'track-lights', 'grounded', 'solid', 'minimal', 0, 0.38),
  spec('airborne', 'Airborne', 'minimal', 'energy-ring', 'floating', 'outline', 'stacked', 8, 0.84),
  spec('kinetic-crop', 'Kinetic Crop', 'macro', 'speed-lines', 'edge-crop', 'ribbon', 'inline', -9, 0.52, 'dramatic'),
  spec('stadium-light', 'Stadium Light', 'center-focus', 'track-lights', 'floating', 'magazine', 'editorial', -2, 0.78),
  spec('urban-poster', 'Urban Poster', 'split-stage', 'street-flash', 'editorial', 'outline', 'accent-rule', 5, 0.42, 'grounded', { family: 'editorial', uppercase: false }),
  spec('speed-focus', 'Speed Focus', 'hero-left', 'motion-slash', 'diagonal', 'glass', 'floating-label', -11, 0.70, 'dramatic'),
]);

export const COFFEE_BLUEPRINTS = createBlueprints('coffee', [
  spec('morning-light', 'Morning Light', 'hero-right', 'morning-window', 'grounded', 'integrated-type', 'minimal', 0, 0.30),
  spec('wooden-table', 'Wooden Table', 'editorial-bottom', 'wood-table', 'grounded', 'outline', 'accent-rule', 0, 0.18),
  spec('steam-focus', 'Steam Focus', 'center-focus', 'steam-glow', 'centered', 'pill', 'stacked', 0, 0.54),
  spec('lifestyle', 'Lifestyle', 'hero-left', 'cafe-light', 'editorial', 'glass-pill', 'inline', -2, 0.34),
  spec('flat-lay', 'Flat Lay', 'macro', 'flat-lay', 'macro', 'minimal-text', 'editorial', 0, 0.16),
  spec('cozy-cafe', 'Cozy Cafe', 'floating', 'cafe-light', 'floating', 'floating', 'floating-label', 2, 0.42),
  spec('minimal-ceramic', 'Minimal Ceramic', 'minimal', 'ceramic-shadow', 'centered', 'underline', 'minimal', 0, 0.20),
  spec('sunlit-roast', 'Sunlit Roast', 'split-stage', 'morning-window', 'reflection', 'ribbon', 'editorial', -1, 0.28),
  spec('counter-moment', 'Counter Moment', 'edge-crop', 'wood-table', 'edge-crop', 'solid', 'inline', 0, 0.22),
  spec('aroma-diagonal', 'Aroma Diagonal', 'diagonal', 'steam-glow', 'diagonal', 'outline', 'accent-rule', -4, 0.48),
  spec('sunlit-counter', 'Sunlit Counter', 'hero-left', 'morning-window', 'grounded', 'glass', 'minimal', 0, 0.24),
  spec('artisan-label', 'Artisan Label', 'split-stage', 'wood-table', 'editorial', 'ribbon', 'editorial', -1, 0.18, 'grounded'),
  spec('cafe-poster', 'Cafe Poster', 'editorial-bottom', 'cafe-light', 'floating', 'magazine', 'inline', 2, 0.36),
  spec('quiet-ritual', 'Quiet Ritual', 'minimal', 'steam-glow', 'centered', 'outline', 'floating-label', 0, 0.30, 'soft', { headlineScale: 0.88 }),
]);

export const FRAGRANCE_BLUEPRINTS = createBlueprints('fragrance', [
  spec('luxury-editorial', 'Luxury Editorial', 'editorial-bottom', 'editorial-arch', 'editorial', 'magazine', 'editorial', 0, 0.28),
  spec('marble', 'Marble', 'hero-right', 'marble', 'grounded', 'outline', 'accent-rule', 0, 0.18),
  spec('glass-reflection', 'Glass Reflection', 'center-focus', 'glass-reflection', 'reflection', 'glass-pill', 'stacked', 0, 0.44),
  spec('golden-luxury', 'Golden Luxury', 'floating', 'golden-hour', 'floating', 'pill', 'floating-label', -2, 0.58),
  spec('fashion-magazine', 'Fashion Magazine', 'hero-left', 'editorial-arch', 'editorial', 'ribbon', 'editorial', 2, 0.20, 'soft', { family: 'editorial', headlineScale: 1.04 }),
  spec('floating-bottle', 'Floating Bottle', 'minimal', 'soft-spotlight', 'floating', 'underline', 'minimal', 0, 0.48),
  spec('dark-premium', 'Dark Premium', 'macro', 'dark-luxury', 'macro', 'integrated-type', 'inline', 0, 0.38),
  spec('golden-column', 'Golden Column', 'split-stage', 'golden-hour', 'reflection', 'outline', 'editorial', 0, 0.34),
  spec('midnight-glass', 'Midnight Glass', 'edge-crop', 'glass-reflection', 'edge-crop', 'glass', 'accent-rule', 1, 0.46),
  spec('couture-diagonal', 'Couture Diagonal', 'diagonal', 'marble', 'diagonal', 'floating', 'stacked', -4, 0.26),
  spec('gallery-plinth', 'Gallery Plinth', 'center-focus', 'editorial-arch', 'grounded', 'minimal-text', 'minimal', 0, 0.24, 'grounded'),
  spec('gilded-editorial', 'Gilded Editorial', 'hero-left', 'golden-hour', 'editorial', 'outline', 'editorial', 2, 0.32, 'soft', { family: 'editorial', headlineScale: 1.08 }),
  spec('midnight-orbit', 'Midnight Orbit', 'floating', 'dark-luxury', 'floating', 'glass', 'inline', -3, 0.62, 'dramatic'),
  spec('marble-column', 'Marble Column', 'split-stage', 'marble', 'reflection', 'ribbon', 'floating-label', 0, 0.28),
]);

export const GENERAL_BLUEPRINTS = createBlueprints('general', [
  spec('modern-left', 'Modern Left', 'hero-left', 'studio-halo', 'floating', 'integrated-type', 'minimal', -2, 0.5),
  spec('modern-right', 'Modern Right', 'hero-right', 'split-light', 'grounded', 'solid', 'accent-rule', 1, 0.42),
  spec('modern-center', 'Modern Center', 'center-focus', 'soft-spotlight', 'centered', 'pill', 'stacked', 0, 0.56),
  spec('modern-float', 'Modern Float', 'floating', 'light-tunnel', 'floating', 'glass-pill', 'inline', -3, 0.64),
  spec('modern-macro', 'Modern Macro', 'macro', 'dark-reflection', 'macro', 'minimal-text', 'editorial', 0, 0.34),
  spec('modern-minimal', 'Modern Minimal', 'minimal', 'soft-spotlight', 'centered', 'underline', 'minimal', 0, 0.24),
  spec('modern-split', 'Modern Split', 'split-stage', 'metallic-sweep', 'reflection', 'ribbon', 'editorial', 0, 0.4),
  spec('modern-bottom', 'Modern Bottom', 'editorial-bottom', 'studio-halo', 'grounded', 'floating', 'floating-label', 0, 0.46),
  spec('modern-edge', 'Modern Edge', 'edge-crop', 'split-light', 'edge-crop', 'solid', 'inline', 2, 0.52),
  spec('modern-diagonal', 'Modern Diagonal', 'diagonal', 'motion-slash', 'diagonal', 'outline', 'accent-rule', -6, 0.6),
]);

export const FASHION_BLUEPRINTS = retarget(GENERAL_BLUEPRINTS, 'fashion', 'fashion');
export const INTERIOR_BLUEPRINTS = retarget(COFFEE_BLUEPRINTS, 'interior', 'interior');

export const BLUEPRINTS_BY_CATEGORY: Readonly<
  Record<CompositionCategory, readonly CompositionBlueprint[]>
> = {
  technology: TECHNOLOGY_BLUEPRINTS,
  sports: SPORTS_BLUEPRINTS,
  coffee: COFFEE_BLUEPRINTS,
  fragrance: FRAGRANCE_BLUEPRINTS,
  fashion: FASHION_BLUEPRINTS,
  interior: INTERIOR_BLUEPRINTS,
  general: GENERAL_BLUEPRINTS,
};

function spec(
  id: string,
  name: string,
  archetype: Archetype,
  background: BackgroundTreatment,
  product: ProductTreatment,
  cta: CtaTreatment,
  price: PriceTreatment,
  rotation = 0,
  glow = 0.5,
  shadow: ProductShadowTreatment = 'soft',
  typography?: Partial<CompositionTypography>
): BlueprintSpec {
  return {
    id,
    name,
    archetype,
    background,
    product,
    cta,
    price,
    rotation,
    glow,
    shadow,
    typography,
  };
}

function createBlueprints(
  category: CompositionCategory,
  specs: readonly BlueprintSpec[]
): CompositionBlueprint[] {
  const badgeTreatments = BADGE_TREATMENTS_BY_CATEGORY[category];
  return specs.map((item, index) => ({
    id: `${category}-${item.id}`,
    name: item.name,
    category,
    frames: createResponsiveFrames(item.archetype),
    typography: {
      ...BASE_TYPOGRAPHY[category],
      ...item.typography,
    },
    backgroundTreatment: item.background,
    productTreatment: item.product,
    ctaTreatment: item.cta,
    priceTreatment: item.price,
    badgeTreatment: badgeTreatments[index % badgeTreatments.length]!,
    productRotation: item.rotation,
    productGlow: item.glow,
    productShadow: item.shadow,
  }));
}

function retarget(
  source: readonly CompositionBlueprint[],
  category: CompositionCategory,
  prefix: string
): CompositionBlueprint[] {
  return source.map((blueprint) => ({
    ...blueprint,
    id: `${prefix}-${blueprint.id.split('-').slice(1).join('-')}`,
    category,
    typography: BASE_TYPOGRAPHY[category],
  }));
}

function createResponsiveFrames(archetype: Archetype): CompositionBlueprint['frames'] {
  return {
    square: createSquareFrame(archetype),
    portrait: createPortraitFrame(archetype),
    landscape: createLandscapeFrame(archetype),
  };
}

function createSquareFrame(archetype: Archetype): CompositionFrame {
  return squareFrames()[archetype];
}

function createPortraitFrame(archetype: Archetype): CompositionFrame {
  return portraitFrames()[archetype];
}

function createLandscapeFrame(archetype: Archetype): CompositionFrame {
  return landscapeFrames()[archetype];
}

function commonSquare(): CompositionFrame['bounds'] {
  return {
    logo: [0.06, 0.05, 0.16, 0.06],
    footer: [0.06, 0.95, 0.88, 0.025],
    discount_badge: [0.79, 0.06, 0.15, 0.075],
  };
}

function commonPortrait(): CompositionFrame['bounds'] {
  return {
    logo: [0.07, 0.04, 0.23, 0.045],
    footer: [0.07, 0.96, 0.86, 0.02],
    discount_badge: [0.70, 0.05, 0.23, 0.055],
  };
}

function commonLandscape(): CompositionFrame['bounds'] {
  return {
    logo: [0.05, 0.06, 0.13, 0.065],
    footer: [0.05, 0.94, 0.90, 0.035],
    discount_badge: [0.84, 0.08, 0.11, 0.075],
  };
}

function squareFrames(): Record<Archetype, CompositionFrame> {
  return {
  'hero-left': frame({
    ...commonSquare(),
    product_image: [0.01, 0.10, 0.66, 0.73],
    headline: [0.53, 0.17, 0.41, 0.27],
    description: [0.59, 0.46, 0.34, 0.11],
    price: [0.57, 0.68, 0.18, 0.12],
    cta: [0.75, 0.69, 0.19, 0.10],
  }, 'right'),
  'hero-right': frame({
    ...commonSquare(),
    product_image: [0.35, 0.06, 0.64, 0.76],
    headline: [0.06, 0.15, 0.43, 0.28],
    description: [0.06, 0.46, 0.34, 0.11],
    price: [0.06, 0.70, 0.18, 0.11],
    cta: [0.25, 0.71, 0.22, 0.10],
  }, 'left'),
  'center-focus': frame({
    ...commonSquare(),
    product_image: [0.11, 0.02, 0.78, 0.60],
    headline: [0.09, 0.63, 0.82, 0.145],
    description: [0.18, 0.77, 0.64, 0.065],
    price: [0.23, 0.86, 0.22, 0.09],
    cta: [0.47, 0.86, 0.30, 0.09],
  }, 'center'),
  floating: frame({
    ...commonSquare(),
    product_image: [0.31, -0.02, 0.72, 0.72],
    headline: [0.06, 0.12, 0.43, 0.27],
    description: [0.06, 0.43, 0.32, 0.11],
    price: [0.08, 0.75, 0.20, 0.10],
    cta: [0.63, 0.77, 0.29, 0.095],
  }, 'left'),
  macro: frame({
    ...commonSquare(),
    product_image: [0.27, -0.08, 0.84, 0.88],
    headline: [0.06, 0.11, 0.46, 0.22],
    description: [0.06, 0.35, 0.32, 0.09],
    price: [0.06, 0.78, 0.24, 0.12],
    cta: [0.06, 0.89, 0.28, 0.06],
  }, 'left'),
  minimal: frame({
    ...commonSquare(),
    product_image: [0.20, 0.18, 0.60, 0.57],
    headline: [0.12, 0.08, 0.76, 0.13],
    description: [0.23, 0.76, 0.54, 0.07],
    price: [0.27, 0.86, 0.20, 0.08],
    cta: [0.49, 0.86, 0.24, 0.08],
  }, 'center'),
  diagonal: frame({
    ...commonSquare(),
    product_image: [0.18, -0.02, 0.82, 0.66],
    headline: [0.06, 0.62, 0.55, 0.18],
    description: [0.07, 0.79, 0.44, 0.065],
    price: [0.59, 0.75, 0.18, 0.10],
    cta: [0.75, 0.84, 0.19, 0.08],
  }, 'left'),
  'split-stage': frame({
    ...commonSquare(),
    product_image: [0.45, 0.03, 0.54, 0.78],
    headline: [0.07, 0.18, 0.38, 0.30],
    description: [0.07, 0.51, 0.31, 0.10],
    price: [0.07, 0.74, 0.19, 0.11],
    cta: [0.07, 0.86, 0.27, 0.075],
  }, 'left'),
  'editorial-bottom': frame({
    ...commonSquare(),
    product_image: [0.14, 0.01, 0.72, 0.58],
    headline: [0.08, 0.59, 0.84, 0.16],
    description: [0.09, 0.75, 0.50, 0.07],
    price: [0.61, 0.76, 0.15, 0.09],
    cta: [0.76, 0.76, 0.17, 0.09],
  }, 'center'),
  'edge-crop': frame({
    ...commonSquare(),
    product_image: [0.43, -0.06, 0.73, 0.86],
    headline: [0.06, 0.15, 0.42, 0.28],
    description: [0.06, 0.46, 0.31, 0.10],
    price: [0.06, 0.72, 0.22, 0.11],
    cta: [0.06, 0.84, 0.27, 0.08],
  }, 'left'),
  };
}

function portraitFrames(): Record<Archetype, CompositionFrame> {
  return {
  'hero-left': portrait('left', [0.00, 0.08, 0.79, 0.61], [0.50, 0.56, 0.43, 0.14]),
  'hero-right': portrait('left', [0.24, 0.04, 0.82, 0.61], [0.07, 0.56, 0.69, 0.14]),
  'center-focus': portrait('center', [0.08, 0.04, 0.84, 0.57], [0.10, 0.58, 0.80, 0.12]),
  floating: portrait('left', [0.19, 0.01, 0.87, 0.62], [0.07, 0.54, 0.70, 0.15]),
  macro: portrait('left', [0.18, -0.04, 0.98, 0.70], [0.07, 0.56, 0.69, 0.13]),
  minimal: portrait('center', [0.15, 0.16, 0.70, 0.46], [0.09, 0.08, 0.82, 0.10]),
  diagonal: portrait('left', [0.00, 0.03, 1.02, 0.64], [0.07, 0.55, 0.76, 0.14]),
  'split-stage': portrait('left', [0.36, 0.03, 0.70, 0.63], [0.07, 0.54, 0.56, 0.16]),
  'editorial-bottom': portrait('center', [0.12, 0.03, 0.76, 0.55], [0.09, 0.57, 0.82, 0.12]),
  'edge-crop': portrait('left', [0.35, -0.03, 0.80, 0.70], [0.07, 0.54, 0.62, 0.15]),
  };
}

function landscapeFrames(): Record<Archetype, CompositionFrame> {
  return {
  'hero-left': landscape('right', [0.00, 0.02, 0.61, 0.93], [0.54, 0.18, 0.39, 0.28]),
  'hero-right': landscape('left', [0.43, 0.01, 0.57, 0.92], [0.06, 0.18, 0.39, 0.28]),
  'center-focus': landscape('center', [0.30, -0.04, 0.40, 0.84], [0.08, 0.72, 0.84, 0.14]),
  floating: landscape('left', [0.39, -0.07, 0.64, 1.02], [0.05, 0.17, 0.39, 0.29]),
  macro: landscape('left', [0.38, -0.18, 0.74, 1.18], [0.05, 0.15, 0.40, 0.25]),
  minimal: landscape('left', [0.48, 0.08, 0.42, 0.78], [0.08, 0.18, 0.34, 0.20]),
  diagonal: landscape('left', [0.33, -0.08, 0.70, 1.02], [0.05, 0.16, 0.42, 0.28]),
  'split-stage': landscape('left', [0.51, 0.02, 0.48, 0.92], [0.06, 0.18, 0.38, 0.29]),
  'editorial-bottom': landscape('center', [0.35, -0.03, 0.44, 0.84], [0.06, 0.70, 0.88, 0.14]),
  'edge-crop': landscape('left', [0.53, -0.11, 0.58, 1.12], [0.05, 0.17, 0.39, 0.27]),
  };
}

function frame(
  bounds: CompositionFrame['bounds'],
  textAlignment: 'left' | 'center' | 'right'
): CompositionFrame {
  return {
    bounds,
    alignments: textAlignments(textAlignment),
  };
}

function portrait(
  textAlignment: 'left' | 'center' | 'right',
  product: readonly [number, number, number, number],
  headline: readonly [number, number, number, number]
): CompositionFrame {
  return frame({
    ...commonPortrait(),
    product_image: product,
    headline,
    description: [headline[0], 0.72, Math.min(0.79, headline[2]), 0.065],
    price: [0.08, 0.83, 0.28, 0.075],
    cta: [0.39, 0.83, 0.34, 0.075],
  }, textAlignment);
}

function landscape(
  textAlignment: 'left' | 'center' | 'right',
  product: readonly [number, number, number, number],
  headline: readonly [number, number, number, number]
): CompositionFrame {
  return frame({
    ...commonLandscape(),
    product_image: product,
    headline,
    description: [headline[0], 0.50, Math.min(0.38, headline[2]), 0.12],
    price: [headline[0], 0.73, 0.17, 0.11],
    cta: [headline[0] + 0.18, 0.73, 0.19, 0.11],
  }, textAlignment);
}

function textAlignments(
  horizontal: 'left' | 'center' | 'right'
): CompositionFrame['alignments'] {
  return {
    headline: alignment(horizontal),
    description: alignment(horizontal),
    price: alignment(horizontal),
    cta: alignment('center'),
    discount_badge: alignment('center'),
  };
}
