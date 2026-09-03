import type { BackgroundDecision } from '../background/BackgroundTypes';
import type { ColorPalette } from '../colors/ColorTypes';
import type { DecorationDecision } from '../decorations/DecorationTypes';
import type { LayoutDecision, PosterSizeInput } from '../layout/LayoutTypes';
import type { PositionDecision } from '../position/PositionTypes';
import type { TypographyDecision } from '../typography/TypographyTypes';

export interface PosterDesignInput {
  productCategory: string;
  posterSize: PosterSizeInput;
  campaign?: string;
  tone?: string;
  industryPack?: string;
  productTitle?: string;
  tags?: string[];
}

export interface PosterDesignMetadata {
  selectedCategory: string;
  selectedTone: string;
  selectedCampaign: string;
  selectedIndustryPack: string;
  posterSize: PosterSizeInput;
  generatedAt: string;
}

export interface PosterDesignDecision {
  layout: LayoutDecision;
  typography: TypographyDecision;
  colors: ColorPalette;
  position: PositionDecision;
  background: BackgroundDecision;
  decorations: DecorationDecision;
  metadata: PosterDesignMetadata;
}
