import type { LayoutId } from '../layout/LayoutTypes';
import type { TypographyId } from '../typography/TypographyTypes';

export type PaletteId =
  | 'minimal'
  | 'luxury'
  | 'modern'
  | 'warm'
  | 'technology'
  | 'fashion'
  | 'sport'
  | 'editorial'
  | 'premium'
  | 'friendly';

export interface ColorPalette {
  paletteId: PaletteId;
  background: string;
  surface: string;
  headline: string;
  subheadline: string;
  description: string;
  accent: string;
  ctaBackground: string;
  ctaText: string;
  decorative: string;
  shadow: string;
  border: string;
}

export interface ColorSelectionInput {
  productCategory: string;
  tone?: string;
  campaign?: string;
  layoutId?: LayoutId | string;
  typographyId?: TypographyId | string;
  industryPack?: string;
  productTitle?: string;
  tags?: string[];
}

export type ColorAffinityMap = Partial<Record<string, number>>;

export interface ColorDefinition {
  paletteId: PaletteId;
  palette: ColorPalette;
  baseScore: number;
  categoryAffinity: ColorAffinityMap;
  toneAffinity: ColorAffinityMap;
  campaignAffinity: ColorAffinityMap;
  layoutAffinity: ColorAffinityMap;
  typographyAffinity: ColorAffinityMap;
  industryPackAffinity: ColorAffinityMap;
}

export interface ContrastResult {
  foreground: string;
  background: string;
  ratio: number;
  passes: boolean;
}
