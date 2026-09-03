import type { PosterSizeInput } from '../../poster-intelligence/layout/LayoutTypes';

export type TemplateCollection =
  | 'Luxury'
  | 'Technology'
  | 'Sports'
  | 'Fashion'
  | 'Coffee'
  | 'Furniture'
  | 'Electronics'
  | 'Jewelry'
  | 'Minimal'
  | 'Editorial';

export type TemplateDensity = 'airy' | 'balanced' | 'compact' | 'dramatic';

export type TemplateShape = 'sharp' | 'soft' | 'rounded' | 'pill';

export type TemplateCardMode = 'none' | 'solid' | 'glass' | 'outline' | 'elevated';

export type TemplateFillMode = 'solid' | 'outline' | 'glass' | 'gradient' | 'underline';

export type TemplateShadowStyle = 'none' | 'soft' | 'floating' | 'dramatic' | 'glow' | 'contact';

export interface TemplateSpacingSystem {
  base: number;
  sectionGap: number;
  textGap: number;
  edgePadding: number;
  density: TemplateDensity;
}

export interface TemplateCornerRadius {
  surface: number;
  image: number;
  cta: number;
  decoration: number;
}

export interface TemplateCardStyle {
  mode: TemplateCardMode;
  opacity: number;
  blur: number;
  strokeOpacity: number;
}

export interface TemplateCTAStyle {
  shape: TemplateShape;
  fill: TemplateFillMode;
  emphasis: 'subtle' | 'balanced' | 'strong';
  minWidthRatio: number;
  heightRatio: number;
}

export interface TemplateDecorationPreset {
  intensity: number;
  scale: number;
  protectedPadding: number;
  layerMode: 'quiet' | 'framed' | 'motion' | 'ornamental' | 'editorial';
}

export interface TemplateGradientStop {
  offset: number;
  token: 'background' | 'surface' | 'accent' | 'decorative' | 'shadow';
  opacity: number;
}

export interface TemplateGradientPreset {
  direction: 'vertical' | 'horizontal' | 'diagonal' | 'radial' | 'spotlight';
  stops: TemplateGradientStop[];
  lighting: number;
  textureIntensity: number;
  particleDensity: number;
  vignetteStrength: number;
}

export interface TemplateShadowPreset {
  style: TemplateShadowStyle;
  opacity: number;
  blur: number;
  offsetX: number;
  offsetY: number;
  glowIntensity: number;
}

export interface TemplateBorderStyle {
  width: number;
  opacity: number;
  radiusMultiplier: number;
  position: 'none' | 'inside' | 'outside' | 'frame';
}

export interface TemplateTypographyRatios {
  headlineScale: number;
  descriptionScale: number;
  priceScale: number;
  ctaScale: number;
  lineHeightMultiplier: number;
  trackingMultiplier: number;
  maxLineLengthMultiplier: number;
}

export interface TemplateImageEmphasis {
  scaleMultiplier: number;
  padding: number;
  focus: 'hero' | 'balanced' | 'supporting' | 'detail';
  reflection: number;
  glow: number;
  cropSafety: number;
}

export interface TemplateWhitespaceProfile {
  marginMultiplier: number;
  negativeSpaceBias: number;
  compactness: number;
}

export interface TemplateAffinity {
  categories: string[];
  campaigns: string[];
  tones: string[];
  industryPacks: string[];
  posterSizes: string[];
}

export interface RendererTemplateProfile {
  templateId: string;
  name: string;
  collection: TemplateCollection;
  spacingSystem: TemplateSpacingSystem;
  cornerRadius: TemplateCornerRadius;
  cardStyle: TemplateCardStyle;
  ctaStyle: TemplateCTAStyle;
  decorationPreset: TemplateDecorationPreset;
  gradientPreset: TemplateGradientPreset;
  shadowPreset: TemplateShadowPreset;
  borderStyle: TemplateBorderStyle;
  typographyRatios: TemplateTypographyRatios;
  imageEmphasis: TemplateImageEmphasis;
  whitespaceProfile: TemplateWhitespaceProfile;
  affinity: TemplateAffinity;
}

export interface TemplateSelectionInput {
  productCategory: string;
  campaign?: string;
  tone?: string;
  industryPack?: string;
  posterSize: PosterSizeInput;
  preferredCollection?: TemplateCollection;
  templateId?: string;
}
