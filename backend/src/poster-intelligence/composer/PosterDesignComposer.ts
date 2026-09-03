import BackgroundEngine from '../background/BackgroundEngine';
import ColorEngine from '../colors/ColorEngine';
import DecorationEngine from '../decorations/DecorationEngine';
import LayoutEngine from '../layout/LayoutEngine';
import PositionEngine from '../position/PositionEngine';
import TypographyEngine from '../typography/TypographyEngine';
import {
  PosterDesignDecision,
  PosterDesignInput,
} from './PosterDesignTypes';

interface PosterDesignComposerEngines {
  layoutEngine?: LayoutEngine;
  typographyEngine?: TypographyEngine;
  colorEngine?: ColorEngine;
  positionEngine?: PositionEngine;
  backgroundEngine?: BackgroundEngine;
  decorationEngine?: DecorationEngine;
}

function defaultValue(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

export class PosterDesignComposer {
  private readonly layoutEngine: LayoutEngine;

  private readonly typographyEngine: TypographyEngine;

  private readonly colorEngine: ColorEngine;

  private readonly positionEngine: PositionEngine;

  private readonly backgroundEngine: BackgroundEngine;

  private readonly decorationEngine: DecorationEngine;

  constructor(engines: PosterDesignComposerEngines = {}) {
    this.layoutEngine = engines.layoutEngine ?? new LayoutEngine();
    this.typographyEngine = engines.typographyEngine ?? new TypographyEngine();
    this.colorEngine = engines.colorEngine ?? new ColorEngine();
    this.positionEngine = engines.positionEngine ?? new PositionEngine();
    this.backgroundEngine = engines.backgroundEngine ?? new BackgroundEngine();
    this.decorationEngine = engines.decorationEngine ?? new DecorationEngine();
  }

  compose(input: PosterDesignInput): PosterDesignDecision {
    const selectedCampaign = defaultValue(input.campaign, 'Default');
    const selectedTone = defaultValue(input.tone, 'Default');
    const selectedIndustryPack = defaultValue(input.industryPack, 'Default');

    const layout = this.layoutEngine.selectLayout({
      productCategory: input.productCategory,
      posterSize: input.posterSize,
      campaign: selectedCampaign,
      tone: selectedTone,
      industryPack: selectedIndustryPack,
      productTitle: input.productTitle,
      tags: input.tags,
    });

    const typography = this.typographyEngine.selectTypography({
      productCategory: input.productCategory,
      tone: selectedTone,
      campaign: selectedCampaign,
      layoutId: layout.layoutId,
      industryPack: selectedIndustryPack,
      productTitle: input.productTitle,
      tags: input.tags,
    });

    const colors = this.colorEngine.selectPalette({
      productCategory: input.productCategory,
      tone: selectedTone,
      campaign: selectedCampaign,
      layoutId: layout.layoutId,
      typographyId: typography.typographyId,
      industryPack: selectedIndustryPack,
      productTitle: input.productTitle,
      tags: input.tags,
    });

    const position = this.positionEngine.selectPosition({
      productCategory: input.productCategory,
      layoutId: layout.layoutId,
      typographyId: typography.typographyId,
      paletteId: colors.paletteId,
      campaign: selectedCampaign,
      industryPack: selectedIndustryPack,
      posterSize: input.posterSize,
      productTitle: input.productTitle,
      tags: input.tags,
    });

    const background = this.backgroundEngine.selectBackground({
      productCategory: input.productCategory,
      campaign: selectedCampaign,
      tone: selectedTone,
      layoutId: layout.layoutId,
      typographyId: typography.typographyId,
      paletteId: colors.paletteId,
      industryPack: selectedIndustryPack,
      posterSize: input.posterSize,
      productTitle: input.productTitle,
      tags: input.tags,
    });

    const decorations = this.decorationEngine.selectDecoration({
      productCategory: input.productCategory,
      campaign: selectedCampaign,
      tone: selectedTone,
      layoutId: layout.layoutId,
      typographyId: typography.typographyId,
      paletteId: colors.paletteId,
      backgroundThemeId: background.themeId,
      industryPack: selectedIndustryPack,
      productTitle: input.productTitle,
      tags: input.tags,
    });

    return {
      layout,
      typography,
      colors,
      position,
      background,
      decorations,
      metadata: {
        selectedCategory: input.productCategory,
        selectedTone,
        selectedCampaign,
        selectedIndustryPack,
        posterSize: input.posterSize,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}

export default PosterDesignComposer;
