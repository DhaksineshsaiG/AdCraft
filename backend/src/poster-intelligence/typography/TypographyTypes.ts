import type { LayoutId } from '../layout/LayoutTypes';

export type TypographyId =
  | 'minimal'
  | 'luxury'
  | 'editorial'
  | 'bold'
  | 'modern'
  | 'friendly'
  | 'sport'
  | 'technology'
  | 'fashion'
  | 'premium';

export type FontWeight =
  | 300
  | 400
  | 500
  | 600
  | 700
  | 800
  | 900;

export type TextTransform = 'none' | 'uppercase' | 'capitalize';

export type TypographyAlignment = 'left' | 'center' | 'right' | 'balanced';

export interface TypographyDecision {
  typographyId: TypographyId;
  headlineFont: string;
  headlineWeight: FontWeight;
  headlineSize: number;
  headlineLetterSpacing: number;
  headlineTransform: TextTransform;
  subheadlineFont: string;
  subheadlineSize: number;
  descriptionFont: string;
  descriptionSize: number;
  ctaFont: string;
  ctaWeight: FontWeight;
  alignment: TypographyAlignment;
  lineHeight: number;
  maxCharactersPerLine: number;
  safeTextWidth: number;
}

export interface TypographySelectionInput {
  productCategory: string;
  tone?: string;
  campaign?: string;
  layoutId?: LayoutId | string;
  industryPack?: string;
  productTitle?: string;
  tags?: string[];
}

export type TypographyAffinityMap = Partial<Record<string, number>>;

export interface TypographyDefinition {
  typographyId: TypographyId;
  decision: TypographyDecision;
  baseScore: number;
  categoryAffinity: TypographyAffinityMap;
  toneAffinity: TypographyAffinityMap;
  campaignAffinity: TypographyAffinityMap;
  layoutAffinity: TypographyAffinityMap;
  industryPackAffinity: TypographyAffinityMap;
}
