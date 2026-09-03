import type { PaletteId } from '../colors/ColorTypes';
import type { LayoutId, PosterSizeInput, PosterSizeName, SafeMargins } from '../layout/LayoutTypes';
import type { TypographyId } from '../typography/TypographyTypes';

export type PositionId =
  | 'hero'
  | 'floating'
  | 'dynamic'
  | 'close-up'
  | 'editorial'
  | 'minimal'
  | 'lifestyle'
  | 'luxury'
  | 'center-focus'
  | 'corner-focus';

export type PositionAnchor =
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
  | 'center-right';

export type CropMode = 'contain' | 'cover' | 'close-up' | 'full-bleed' | 'none';

export type ShadowStyle = 'none' | 'soft' | 'floating' | 'dramatic' | 'luxury' | 'contact';

export type PositionDepth = 'flat' | 'midground' | 'foreground' | 'layered' | 'immersive';

export type ImagePriority = 'primary' | 'balanced' | 'supporting' | 'atmospheric';

export interface PositionDecision {
  positionId: PositionId;
  anchor: PositionAnchor;
  rotation: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  cropMode: CropMode;
  shadowStyle: ShadowStyle;
  depth: PositionDepth;
  overlapText: boolean;
  safeMargins: SafeMargins;
  imagePriority: ImagePriority;
}

export interface PositionSelectionInput {
  productCategory: string;
  layoutId?: LayoutId | string;
  typographyId?: TypographyId | string;
  paletteId?: PaletteId | string;
  campaign?: string;
  industryPack?: string;
  posterSize: PosterSizeInput;
  productTitle?: string;
  tags?: string[];
}

export type PositionAffinityMap = Partial<Record<string, number>>;

export interface PositionDefinition {
  positionId: PositionId;
  decision: PositionDecision;
  baseScore: number;
  categoryAffinity: PositionAffinityMap;
  layoutAffinity: PositionAffinityMap;
  typographyAffinity: PositionAffinityMap;
  paletteAffinity: PositionAffinityMap;
  campaignAffinity: PositionAffinityMap;
  industryPackAffinity: PositionAffinityMap;
  sizeAffinity: Partial<Record<PosterSizeName, number>>;
}
