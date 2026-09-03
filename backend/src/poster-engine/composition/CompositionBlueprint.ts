import { PosterComponentType } from '../components';
import { PosterData } from '../types/data';
import {
  HorizontalAlignment,
  PosterAlignment,
  PosterDimensions,
} from '../types/geometry';

export type CompositionCategory =
  | 'technology'
  | 'sports'
  | 'coffee'
  | 'fragrance'
  | 'fashion'
  | 'interior'
  | 'general';

export type CanvasOrientation = 'square' | 'portrait' | 'landscape';
export type NormalizedCompositionBounds = readonly [
  x: number,
  y: number,
  width: number,
  height: number,
];

export type BackgroundTreatment =
  | 'studio-halo'
  | 'metallic-sweep'
  | 'split-light'
  | 'light-tunnel'
  | 'dark-reflection'
  | 'motion-slash'
  | 'speed-lines'
  | 'track-lights'
  | 'street-flash'
  | 'energy-ring'
  | 'morning-window'
  | 'wood-table'
  | 'steam-glow'
  | 'cafe-light'
  | 'flat-lay'
  | 'ceramic-shadow'
  | 'marble'
  | 'glass-reflection'
  | 'golden-hour'
  | 'editorial-arch'
  | 'dark-luxury'
  | 'soft-spotlight';

export type ProductTreatment =
  | 'floating'
  | 'grounded'
  | 'diagonal'
  | 'macro'
  | 'edge-crop'
  | 'reflection'
  | 'editorial'
  | 'centered';

export type CtaTreatment =
  | 'minimal-text'
  | 'magazine'
  | 'integrated-type'
  | 'outline'
  | 'pill'
  | 'glass-pill'
  | 'glass'
  | 'ribbon'
  | 'floating'
  | 'underline'
  | 'solid';

export type PriceTreatment =
  | 'editorial'
  | 'minimal'
  | 'stacked'
  | 'inline'
  | 'accent-rule'
  | 'floating-label';

export type BadgeTreatment =
  | 'corner-ribbon'
  | 'premium-label'
  | 'luxury-tag'
  | 'editorial-sticker'
  | 'modern-chip';

export type ProductShadowTreatment = 'soft' | 'dramatic' | 'grounded' | 'none';
export type TypographyFamily = 'modern' | 'elegant' | 'condensed' | 'editorial';

export interface CompositionTypography {
  family: TypographyFamily;
  headlineScale: number;
  headlineWeight: 'medium' | 'semibold' | 'bold';
  descriptionScale: number;
  priceScale: number;
  letterSpacing?: number;
  headlineLineHeight?: number;
  descriptionLineHeight?: number;
  ctaLetterSpacing?: number;
  uppercase?: boolean;
  maxHeadlineLines?: number;
}

export interface CompositionFrame {
  bounds: Partial<Record<PosterComponentType, NormalizedCompositionBounds>>;
  alignments?: Partial<Record<PosterComponentType, PosterAlignment>>;
}

export interface CompositionBlueprint {
  id: string;
  name: string;
  category: CompositionCategory;
  frames: Record<CanvasOrientation, CompositionFrame>;
  typography: CompositionTypography;
  backgroundTreatment: BackgroundTreatment;
  productTreatment: ProductTreatment;
  ctaTreatment: CtaTreatment;
  priceTreatment: PriceTreatment;
  badgeTreatment: BadgeTreatment;
  productRotation?: number;
  productGlow?: number;
  productShadow?: ProductShadowTreatment;
}

export interface CompositionSelection {
  blueprint: CompositionBlueprint;
  category: CompositionCategory;
  orientation: CanvasOrientation;
}

export interface PosterCompositionEngine {
  select(data: PosterData, canvas: PosterDimensions): CompositionSelection;
}

export interface CompositionStrategy {
  readonly category: CompositionCategory;
  readonly blueprints: readonly CompositionBlueprint[];
}

export function alignment(
  horizontal: HorizontalAlignment,
  vertical: PosterAlignment['vertical'] = 'middle'
): PosterAlignment {
  return { horizontal, vertical };
}
