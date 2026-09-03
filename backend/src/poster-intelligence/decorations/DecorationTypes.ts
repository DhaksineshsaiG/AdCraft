import type { BackgroundThemeId } from '../background/BackgroundTypes';
import type { PaletteId } from '../colors/ColorTypes';
import type { LayoutId, SafeMargins } from '../layout/LayoutTypes';
import type { TypographyId } from '../typography/TypographyTypes';

export type DecorationId =
  | 'minimal'
  | 'luxury'
  | 'technology'
  | 'sports'
  | 'fashion'
  | 'coffee'
  | 'editorial'
  | 'premium'
  | 'nature'
  | 'gaming';

export type DecorationDensity = 'none' | 'low' | 'medium' | 'high';

export type DecorationPlacement =
  | 'none'
  | 'corners'
  | 'edges'
  | 'frame'
  | 'background'
  | 'foreground'
  | 'diagonal'
  | 'around-product'
  | 'text-adjacent'
  | 'full-composition';

export type DecorationDepth = 'flat' | 'background' | 'midground' | 'foreground' | 'layered';

export type DecorationLayering = 'none' | 'single' | 'stacked' | 'interwoven' | 'cinematic';

export type DecorationEmphasis = 'subtle' | 'balanced' | 'accent' | 'expressive' | 'heroic';

export interface DecorationDecision {
  decorationId: DecorationId;
  elements: string[];
  density: DecorationDensity;
  opacity: number;
  placement: DecorationPlacement;
  depth: DecorationDepth;
  layering: DecorationLayering;
  emphasis: DecorationEmphasis;
  safeZones: SafeMargins;
}

export interface DecorationSelectionInput {
  productCategory: string;
  campaign?: string;
  tone?: string;
  layoutId?: LayoutId | string;
  typographyId?: TypographyId | string;
  paletteId?: PaletteId | string;
  backgroundThemeId?: BackgroundThemeId | string;
  industryPack?: string;
  productTitle?: string;
  tags?: string[];
}

export type DecorationAffinityMap = Partial<Record<string, number>>;

export interface DecorationDefinition {
  decorationId: DecorationId;
  decision: DecorationDecision;
  baseScore: number;
  categoryAffinity: DecorationAffinityMap;
  campaignAffinity: DecorationAffinityMap;
  toneAffinity: DecorationAffinityMap;
  layoutAffinity: DecorationAffinityMap;
  typographyAffinity: DecorationAffinityMap;
  paletteAffinity: DecorationAffinityMap;
  backgroundAffinity: DecorationAffinityMap;
  industryPackAffinity: DecorationAffinityMap;
}
