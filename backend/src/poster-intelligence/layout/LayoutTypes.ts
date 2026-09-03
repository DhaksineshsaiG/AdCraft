export type LayoutId =
  | 'hero-center'
  | 'hero-left'
  | 'hero-right'
  | 'split'
  | 'diagonal'
  | 'minimal'
  | 'luxury'
  | 'editorial'
  | 'story'
  | 'grid';

export type PosterSizeName = 'square' | 'portrait' | 'landscape' | 'story' | 'wide';

export interface PosterDimensions {
  width: number;
  height: number;
  name?: PosterSizeName;
}

export type PosterSizeInput = PosterSizeName | PosterDimensions;

export type LayoutRegion =
  | 'center'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'upper-left'
  | 'upper-right'
  | 'lower-left'
  | 'lower-right'
  | 'center-left'
  | 'center-right'
  | 'full-bleed'
  | 'background'
  | 'foreground'
  | 'diagonal-left'
  | 'diagonal-right'
  | 'grid';

export type LayoutAlignment = 'left' | 'center' | 'right' | 'balanced' | 'justified';

export interface SafeMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface LayoutDecision {
  layoutId: LayoutId;
  imagePosition: LayoutRegion;
  textPosition: LayoutRegion;
  ctaPosition: LayoutRegion;
  alignment: LayoutAlignment;
  padding: number;
  spacing: number;
  productScale: number;
  textWidth: number;
  safeMargins: SafeMargins;
}

export interface LayoutSelectionInput {
  productCategory: string;
  posterSize: PosterSizeInput;
  campaign?: string;
  tone?: string;
  industryPack?: string;
  productTitle?: string;
  tags?: string[];
}

export type LayoutAffinityMap = Partial<Record<string, number>>;

export interface LayoutDefinition {
  layoutId: LayoutId;
  decision: LayoutDecision;
  baseScore: number;
  categoryAffinity: LayoutAffinityMap;
  campaignAffinity: LayoutAffinityMap;
  toneAffinity: LayoutAffinityMap;
  industryPackAffinity: LayoutAffinityMap;
  sizeAffinity: Partial<Record<PosterSizeName, number>>;
}
