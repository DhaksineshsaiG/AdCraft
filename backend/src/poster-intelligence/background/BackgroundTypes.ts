import type { PaletteId } from '../colors/ColorTypes';
import type { LayoutId, PosterSizeInput, PosterSizeName } from '../layout/LayoutTypes';
import type { TypographyId } from '../typography/TypographyTypes';

export type BackgroundThemeId =
  | 'minimal'
  | 'luxury'
  | 'studio'
  | 'marble'
  | 'glass'
  | 'technology'
  | 'coffee'
  | 'fashion'
  | 'sports'
  | 'nature'
  | 'editorial'
  | 'living-room'
  | 'premium';

export type BackgroundStyle =
  | 'solid'
  | 'soft-gradient'
  | 'studio-sweep'
  | 'material-texture'
  | 'glassmorphism'
  | 'environmental'
  | 'editorial-scene'
  | 'abstract-motion';

export type BackgroundLighting =
  | 'flat'
  | 'soft'
  | 'diffused'
  | 'dramatic'
  | 'rim'
  | 'window'
  | 'neon'
  | 'golden';

export type BackgroundDepth = 'flat' | 'shallow' | 'medium' | 'deep' | 'immersive';

export type VisualWeight = 'light' | 'balanced' | 'rich' | 'bold' | 'cinematic';

export interface BackgroundDecision {
  themeId: BackgroundThemeId;
  backgroundStyle: BackgroundStyle;
  texture: string;
  gradient: string;
  lighting: BackgroundLighting;
  overlay: string;
  vignette: number;
  blur: number;
  noise: number;
  depth: BackgroundDepth;
  atmosphere: string;
  visualWeight: VisualWeight;
}

export interface BackgroundSelectionInput {
  productCategory: string;
  campaign?: string;
  tone?: string;
  layoutId?: LayoutId | string;
  typographyId?: TypographyId | string;
  paletteId?: PaletteId | string;
  industryPack?: string;
  posterSize: PosterSizeInput;
  productTitle?: string;
  tags?: string[];
}

export type BackgroundAffinityMap = Partial<Record<string, number>>;

export interface BackgroundDefinition {
  themeId: BackgroundThemeId;
  decision: BackgroundDecision;
  baseScore: number;
  categoryAffinity: BackgroundAffinityMap;
  campaignAffinity: BackgroundAffinityMap;
  toneAffinity: BackgroundAffinityMap;
  layoutAffinity: BackgroundAffinityMap;
  typographyAffinity: BackgroundAffinityMap;
  paletteAffinity: BackgroundAffinityMap;
  industryPackAffinity: BackgroundAffinityMap;
  sizeAffinity: Partial<Record<PosterSizeName, number>>;
}
