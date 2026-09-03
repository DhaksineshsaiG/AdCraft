import {
  LayoutDecision,
  LayoutDefinition,
  LayoutId,
  PosterSizeName,
} from './LayoutTypes';

const DEFAULT_SAFE_MARGINS = {
  top: 9,
  right: 9,
  bottom: 9,
  left: 9,
};

function decision(
  layoutId: LayoutId,
  overrides: Omit<LayoutDecision, 'layoutId'>
): LayoutDecision {
  return {
    layoutId,
    ...overrides,
  };
}

const LAYOUTS: LayoutDefinition[] = [
  {
    layoutId: 'hero-center',
    decision: decision('hero-center', {
      imagePosition: 'center',
      textPosition: 'top',
      ctaPosition: 'bottom',
      alignment: 'center',
      padding: 9,
      spacing: 5.5,
      productScale: 0.74,
      textWidth: 70,
      safeMargins: DEFAULT_SAFE_MARGINS,
    }),
    baseScore: 34,
    categoryAffinity: {
      footwear: 20,
      shoes: 20,
      sneakers: 20,
      general: 6,
    },
    campaignAffinity: {
      default: 5,
      'new arrival': 14,
      summer: 8,
    },
    toneAffinity: {
      bold: 8,
      energetic: 8,
      confident: 6,
    },
    industryPackAffinity: {
      fashion: 5,
      fitness: 8,
    },
    sizeAffinity: {
      square: 8,
      portrait: 7,
      story: 6,
    },
  },
  {
    layoutId: 'hero-left',
    decision: decision('hero-left', {
      imagePosition: 'left',
      textPosition: 'center-right',
      ctaPosition: 'lower-right',
      alignment: 'left',
      padding: 8,
      spacing: 5.5,
      productScale: 0.70,
      textWidth: 42,
      safeMargins: DEFAULT_SAFE_MARGINS,
    }),
    baseScore: 30,
    categoryAffinity: {
      electronics: 5,
      footwear: 7,
      fashion: 5,
      general: 6,
    },
    campaignAffinity: {
      'new arrival': 12,
      premium: 8,
    },
    toneAffinity: {
      modern: 8,
      practical: 5,
    },
    industryPackAffinity: {
      technology: 7,
      electronics: 7,
    },
    sizeAffinity: {
      landscape: 14,
      wide: 14,
      square: 4,
    },
  },
  {
    layoutId: 'hero-right',
    decision: decision('hero-right', {
      imagePosition: 'right',
      textPosition: 'center-left',
      ctaPosition: 'lower-left',
      alignment: 'left',
      padding: 8,
      spacing: 5.5,
      productScale: 0.70,
      textWidth: 42,
      safeMargins: DEFAULT_SAFE_MARGINS,
    }),
    baseScore: 30,
    categoryAffinity: {
      electronics: 5,
      furniture: 6,
      coffee: 4,
      general: 6,
    },
    campaignAffinity: {
      default: 5,
      winter: 8,
      clearance: 7,
    },
    toneAffinity: {
      calm: 7,
      clear: 6,
    },
    industryPackAffinity: {
      business: 7,
      furniture: 5,
    },
    sizeAffinity: {
      landscape: 14,
      wide: 14,
      square: 4,
    },
  },
  {
    layoutId: 'split',
    decision: decision('split', {
      imagePosition: 'left',
      textPosition: 'right',
      ctaPosition: 'lower-right',
      alignment: 'left',
      padding: 8,
      spacing: 6.5,
      productScale: 0.64,
      textWidth: 44,
      safeMargins: {
        top: 7,
        right: 8,
        bottom: 7,
        left: 8,
      },
    }),
    baseScore: 32,
    categoryAffinity: {
      furniture: 28,
      home: 18,
      electronics: 7,
    },
    campaignAffinity: {
      minimal: 10,
      winter: 6,
      default: 4,
    },
    toneAffinity: {
      practical: 10,
      calm: 7,
      balanced: 8,
    },
    industryPackAffinity: {
      furniture: 28,
      business: 8,
    },
    sizeAffinity: {
      landscape: 18,
      wide: 18,
      square: 5,
    },
  },
  {
    layoutId: 'diagonal',
    decision: decision('diagonal', {
      imagePosition: 'diagonal-right',
      textPosition: 'upper-left',
      ctaPosition: 'lower-left',
      alignment: 'left',
      padding: 8,
      spacing: 5.5,
      productScale: 0.76,
      textWidth: 40,
      safeMargins: {
        top: 8,
        right: 7,
        bottom: 8,
        left: 7,
      },
    }),
    baseScore: 31,
    categoryAffinity: {
      sports: 30,
      fitness: 24,
      footwear: 8,
      shoes: 8,
    },
    campaignAffinity: {
      summer: 14,
      'black friday': 10,
      clearance: 8,
    },
    toneAffinity: {
      energetic: 18,
      bold: 14,
      urgent: 8,
    },
    industryPackAffinity: {
      fitness: 25,
      gaming: 8,
    },
    sizeAffinity: {
      portrait: 11,
      story: 14,
      square: 8,
    },
  },
  {
    layoutId: 'minimal',
    decision: decision('minimal', {
      imagePosition: 'center',
      textPosition: 'bottom',
      ctaPosition: 'bottom',
      alignment: 'center',
      padding: 11,
      spacing: 5,
      productScale: 0.58,
      textWidth: 56,
      safeMargins: {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10,
      },
    }),
    baseScore: 33,
    categoryAffinity: {
      electronics: 30,
      technology: 24,
      coffee: 5,
      furniture: 6,
    },
    campaignAffinity: {
      minimal: 24,
      'new arrival': 8,
      premium: 6,
    },
    toneAffinity: {
      minimal: 24,
      clean: 20,
      modern: 14,
      calm: 8,
    },
    industryPackAffinity: {
      electronics: 28,
      technology: 24,
      business: 5,
    },
    sizeAffinity: {
      square: 14,
      portrait: 9,
      story: 8,
    },
  },
  {
    layoutId: 'luxury',
    decision: decision('luxury', {
      imagePosition: 'center',
      textPosition: 'lower-left',
      ctaPosition: 'lower-left',
      alignment: 'left',
      padding: 10,
      spacing: 5,
      productScale: 0.56,
      textWidth: 46,
      safeMargins: {
        top: 9,
        right: 9,
        bottom: 11,
        left: 9,
      },
    }),
    baseScore: 33,
    categoryAffinity: {
      jewelry: 34,
      fragrance: 28,
      perfume: 28,
      accessories: 16,
    },
    campaignAffinity: {
      luxury: 24,
      premium: 18,
      festival: 8,
    },
    toneAffinity: {
      luxury: 24,
      premium: 18,
      elegant: 20,
      refined: 16,
    },
    industryPackAffinity: {
      jewelry: 32,
      luxury: 30,
      fashion: 7,
    },
    sizeAffinity: {
      portrait: 12,
      story: 12,
      square: 8,
    },
  },
  {
    layoutId: 'editorial',
    decision: decision('editorial', {
      imagePosition: 'full-bleed',
      textPosition: 'left',
      ctaPosition: 'lower-left',
      alignment: 'left',
      padding: 9,
      spacing: 6.5,
      productScale: 0.66,
      textWidth: 48,
      safeMargins: {
        top: 8,
        right: 8,
        bottom: 9,
        left: 8,
      },
    }),
    baseScore: 32,
    categoryAffinity: {
      coffee: 30,
      fashion: 30,
      apparel: 24,
      fragrance: 8,
    },
    campaignAffinity: {
      default: 6,
      winter: 8,
      summer: 7,
      festival: 6,
    },
    toneAffinity: {
      warm: 14,
      lifestyle: 18,
      editorial: 24,
      elegant: 8,
    },
    industryPackAffinity: {
      coffee: 30,
      fashion: 30,
      luxury: 6,
    },
    sizeAffinity: {
      portrait: 12,
      story: 13,
      square: 7,
    },
  },
  {
    layoutId: 'story',
    decision: decision('story', {
      imagePosition: 'top',
      textPosition: 'bottom',
      ctaPosition: 'bottom',
      alignment: 'center',
      padding: 9,
      spacing: 6.5,
      productScale: 0.62,
      textWidth: 64,
      safeMargins: {
        top: 9,
        right: 8,
        bottom: 11,
        left: 8,
      },
    }),
    baseScore: 29,
    categoryAffinity: {
      fragrance: 12,
      coffee: 10,
      fashion: 9,
      jewelry: 7,
    },
    campaignAffinity: {
      luxury: 8,
      festival: 14,
      winter: 9,
      summer: 8,
    },
    toneAffinity: {
      emotional: 15,
      warm: 10,
      refined: 7,
    },
    industryPackAffinity: {
      luxury: 8,
      coffee: 9,
      fashion: 8,
    },
    sizeAffinity: {
      story: 24,
      portrait: 10,
    },
  },
  {
    layoutId: 'grid',
    decision: decision('grid', {
      imagePosition: 'grid',
      textPosition: 'upper-left',
      ctaPosition: 'lower-right',
      alignment: 'balanced',
      padding: 8,
      spacing: 5,
      productScale: 0.54,
      textWidth: 40,
      safeMargins: DEFAULT_SAFE_MARGINS,
    }),
    baseScore: 27,
    categoryAffinity: {
      electronics: 8,
      fashion: 8,
      furniture: 5,
      general: 8,
    },
    campaignAffinity: {
      clearance: 18,
      'black friday': 18,
      'new arrival': 8,
    },
    toneAffinity: {
      energetic: 6,
      bold: 8,
      practical: 6,
    },
    industryPackAffinity: {
      technology: 8,
      fashion: 8,
      business: 6,
    },
    sizeAffinity: {
      square: 12,
      landscape: 9,
      wide: 10,
    },
  },
];

export class LayoutRegistry {
  getAll(): LayoutDefinition[] {
    return LAYOUTS.map((layout) => ({
      ...layout,
      decision: {
        ...layout.decision,
        safeMargins: { ...layout.decision.safeMargins },
      },
    }));
  }

  getById(layoutId: LayoutId): LayoutDefinition | undefined {
    const layout = LAYOUTS.find((candidate) => candidate.layoutId === layoutId);
    if (!layout) return undefined;

    return {
      ...layout,
      decision: {
        ...layout.decision,
        safeMargins: { ...layout.decision.safeMargins },
      },
    };
  }

  getSupportedLayoutIds(): LayoutId[] {
    return LAYOUTS.map((layout) => layout.layoutId);
  }

  getSupportedSizeNames(): PosterSizeName[] {
    return ['square', 'portrait', 'landscape', 'story', 'wide'];
  }
}

export default LayoutRegistry;
