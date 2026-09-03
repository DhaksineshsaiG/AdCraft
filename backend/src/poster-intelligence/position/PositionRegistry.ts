import {
  PositionDecision,
  PositionDefinition,
  PositionId,
} from './PositionTypes';

const DEFAULT_SAFE_MARGINS = {
  top: 9,
  right: 9,
  bottom: 9,
  left: 9,
};

function decision(
  positionId: PositionId,
  overrides: Omit<PositionDecision, 'positionId'>
): PositionDecision {
  return {
    positionId,
    ...overrides,
  };
}

const POSITIONS: PositionDefinition[] = [
  {
    positionId: 'hero',
    decision: decision('hero', {
      anchor: 'center',
      rotation: 0,
      scale: 0.76,
      offsetX: 0,
      offsetY: 0,
      cropMode: 'contain',
      shadowStyle: 'soft',
      depth: 'foreground',
      overlapText: false,
      safeMargins: DEFAULT_SAFE_MARGINS,
      imagePriority: 'primary',
    }),
    baseScore: 32,
    categoryAffinity: {
      phone: 36,
      smartphone: 34,
      laptop: 14,
      electronics: 8,
    },
    layoutAffinity: {
      'hero-center': 20,
      'hero-left': 12,
      'hero-right': 12,
      minimal: 8,
    },
    typographyAffinity: {
      technology: 14,
      modern: 8,
      minimal: 8,
    },
    paletteAffinity: {
      technology: 14,
      minimal: 8,
      modern: 6,
    },
    campaignAffinity: {
      'new arrival': 16,
      premium: 8,
    },
    industryPackAffinity: {
      electronics: 14,
      technology: 14,
    },
    sizeAffinity: {
      square: 12,
      portrait: 8,
      story: 6,
    },
  },
  {
    positionId: 'floating',
    decision: decision('floating', {
      anchor: 'center-right',
      rotation: -4,
      scale: 0.68,
      offsetX: 6,
      offsetY: -4,
      cropMode: 'contain',
      shadowStyle: 'floating',
      depth: 'layered',
      overlapText: true,
      safeMargins: {
        top: 9,
        right: 7,
        bottom: 9,
        left: 7,
      },
      imagePriority: 'primary',
    }),
    baseScore: 31,
    categoryAffinity: {
      sports: 34,
      fitness: 28,
      bottle: 12,
    },
    layoutAffinity: {
      diagonal: 22,
      story: 10,
      'hero-center': 8,
    },
    typographyAffinity: {
      sport: 22,
      bold: 8,
    },
    paletteAffinity: {
      sport: 24,
      friendly: 6,
    },
    campaignAffinity: {
      summer: 14,
      clearance: 6,
    },
    industryPackAffinity: {
      fitness: 30,
      gaming: 8,
    },
    sizeAffinity: {
      story: 16,
      portrait: 10,
      square: 8,
    },
  },
  {
    positionId: 'dynamic',
    decision: decision('dynamic', {
      anchor: 'center',
      rotation: -10,
      scale: 0.76,
      offsetX: 4,
      offsetY: -2,
      cropMode: 'contain',
      shadowStyle: 'dramatic',
      depth: 'foreground',
      overlapText: true,
      safeMargins: {
        top: 8,
        right: 7,
        bottom: 8,
        left: 7,
      },
      imagePriority: 'primary',
    }),
    baseScore: 31,
    categoryAffinity: {
      shoes: 36,
      footwear: 36,
      sneaker: 34,
      sneakers: 34,
      sports: 8,
    },
    layoutAffinity: {
      diagonal: 18,
      'hero-center': 16,
      grid: 8,
    },
    typographyAffinity: {
      sport: 16,
      bold: 14,
    },
    paletteAffinity: {
      sport: 16,
      fashion: 6,
    },
    campaignAffinity: {
      'new arrival': 10,
      'black friday': 8,
      summer: 8,
    },
    industryPackAffinity: {
      fitness: 16,
      fashion: 8,
    },
    sizeAffinity: {
      square: 12,
      portrait: 10,
      story: 8,
    },
  },
  {
    positionId: 'close-up',
    decision: decision('close-up', {
      anchor: 'center',
      rotation: 0,
      scale: 0.88,
      offsetX: 0,
      offsetY: 2,
      cropMode: 'close-up',
      shadowStyle: 'soft',
      depth: 'immersive',
      overlapText: false,
      safeMargins: {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10,
      },
      imagePriority: 'primary',
    }),
    baseScore: 31,
    categoryAffinity: {
      jewelry: 38,
      necklace: 34,
      ring: 34,
      accessories: 16,
    },
    layoutAffinity: {
      luxury: 16,
      minimal: 10,
      story: 8,
    },
    typographyAffinity: {
      luxury: 18,
      premium: 14,
    },
    paletteAffinity: {
      luxury: 18,
      premium: 14,
    },
    campaignAffinity: {
      luxury: 16,
      premium: 14,
      festival: 8,
    },
    industryPackAffinity: {
      jewelry: 34,
      luxury: 18,
    },
    sizeAffinity: {
      portrait: 14,
      square: 12,
      story: 10,
    },
  },
  {
    positionId: 'editorial',
    decision: decision('editorial', {
      anchor: 'left',
      rotation: 0,
      scale: 0.64,
      offsetX: -4,
      offsetY: 0,
      cropMode: 'cover',
      shadowStyle: 'contact',
      depth: 'midground',
      overlapText: false,
      safeMargins: DEFAULT_SAFE_MARGINS,
      imagePriority: 'balanced',
    }),
    baseScore: 31,
    categoryAffinity: {
      furniture: 36,
      home: 24,
      sofa: 30,
      chair: 30,
      fashion: 8,
    },
    layoutAffinity: {
      split: 24,
      editorial: 18,
      'hero-left': 10,
      'hero-right': 10,
    },
    typographyAffinity: {
      modern: 16,
      editorial: 12,
    },
    paletteAffinity: {
      modern: 18,
      editorial: 12,
      warm: 8,
    },
    campaignAffinity: {
      minimal: 10,
      winter: 8,
    },
    industryPackAffinity: {
      furniture: 34,
      business: 8,
    },
    sizeAffinity: {
      landscape: 18,
      wide: 18,
      square: 6,
    },
  },
  {
    positionId: 'minimal',
    decision: decision('minimal', {
      anchor: 'center',
      rotation: 0,
      scale: 0.56,
      offsetX: 0,
      offsetY: -2,
      cropMode: 'contain',
      shadowStyle: 'none',
      depth: 'flat',
      overlapText: false,
      safeMargins: {
        top: 11,
        right: 11,
        bottom: 11,
        left: 11,
      },
      imagePriority: 'balanced',
    }),
    baseScore: 32,
    categoryAffinity: {
      electronics: 34,
      technology: 18,
      laptop: 16,
      earbuds: 16,
    },
    layoutAffinity: {
      minimal: 28,
      grid: 10,
      'hero-center': 6,
    },
    typographyAffinity: {
      minimal: 24,
      technology: 14,
      modern: 8,
    },
    paletteAffinity: {
      minimal: 24,
      technology: 12,
      modern: 8,
    },
    campaignAffinity: {
      minimal: 18,
      'new arrival': 8,
    },
    industryPackAffinity: {
      electronics: 30,
      technology: 18,
      business: 6,
    },
    sizeAffinity: {
      square: 14,
      portrait: 8,
      story: 8,
    },
  },
  {
    positionId: 'lifestyle',
    decision: decision('lifestyle', {
      anchor: 'center-left',
      rotation: 0,
      scale: 0.66,
      offsetX: -4,
      offsetY: 2,
      cropMode: 'cover',
      shadowStyle: 'soft',
      depth: 'midground',
      overlapText: false,
      safeMargins: {
        top: 8,
        right: 8,
        bottom: 9,
        left: 8,
      },
      imagePriority: 'balanced',
    }),
    baseScore: 31,
    categoryAffinity: {
      coffee: 38,
      mug: 28,
      espresso: 28,
      home: 12,
    },
    layoutAffinity: {
      editorial: 22,
      story: 14,
      'hero-right': 8,
    },
    typographyAffinity: {
      editorial: 18,
      friendly: 10,
    },
    paletteAffinity: {
      warm: 24,
      editorial: 14,
      friendly: 8,
    },
    campaignAffinity: {
      winter: 14,
      default: 6,
    },
    industryPackAffinity: {
      coffee: 36,
    },
    sizeAffinity: {
      story: 14,
      portrait: 10,
      square: 8,
    },
  },
  {
    positionId: 'luxury',
    decision: decision('luxury', {
      anchor: 'center',
      rotation: 0,
      scale: 0.62,
      offsetX: 0,
      offsetY: -1,
      cropMode: 'contain',
      shadowStyle: 'luxury',
      depth: 'foreground',
      overlapText: false,
      safeMargins: {
        top: 10,
        right: 10,
        bottom: 12,
        left: 10,
      },
      imagePriority: 'primary',
    }),
    baseScore: 32,
    categoryAffinity: {
      perfume: 38,
      fragrance: 38,
      cologne: 34,
      jewelry: 8,
    },
    layoutAffinity: {
      luxury: 28,
      story: 12,
      minimal: 8,
    },
    typographyAffinity: {
      luxury: 26,
      premium: 12,
    },
    paletteAffinity: {
      luxury: 28,
      premium: 12,
    },
    campaignAffinity: {
      luxury: 24,
      premium: 14,
      festival: 8,
    },
    industryPackAffinity: {
      luxury: 30,
      jewelry: 8,
    },
    sizeAffinity: {
      portrait: 14,
      story: 14,
      square: 10,
    },
  },
  {
    positionId: 'center-focus',
    decision: decision('center-focus', {
      anchor: 'center',
      rotation: 0,
      scale: 0.72,
      offsetX: 0,
      offsetY: 0,
      cropMode: 'cover',
      shadowStyle: 'soft',
      depth: 'foreground',
      overlapText: true,
      safeMargins: DEFAULT_SAFE_MARGINS,
      imagePriority: 'primary',
    }),
    baseScore: 31,
    categoryAffinity: {
      fashion: 38,
      apparel: 34,
      dress: 28,
      blazer: 28,
    },
    layoutAffinity: {
      editorial: 18,
      'hero-center': 14,
      story: 10,
    },
    typographyAffinity: {
      fashion: 30,
      editorial: 10,
    },
    paletteAffinity: {
      fashion: 30,
      editorial: 8,
    },
    campaignAffinity: {
      festival: 10,
      'new arrival': 10,
      summer: 8,
    },
    industryPackAffinity: {
      fashion: 34,
      luxury: 8,
    },
    sizeAffinity: {
      portrait: 14,
      story: 14,
      square: 8,
    },
  },
  {
    positionId: 'corner-focus',
    decision: decision('corner-focus', {
      anchor: 'lower-right',
      rotation: 0,
      scale: 0.48,
      offsetX: 6,
      offsetY: 6,
      cropMode: 'contain',
      shadowStyle: 'soft',
      depth: 'midground',
      overlapText: false,
      safeMargins: {
        top: 8,
        right: 7,
        bottom: 7,
        left: 8,
      },
      imagePriority: 'supporting',
    }),
    baseScore: 28,
    categoryAffinity: {
      general: 8,
      accessories: 8,
      electronics: 6,
    },
    layoutAffinity: {
      grid: 22,
      'hero-left': 8,
      'hero-right': 8,
    },
    typographyAffinity: {
      bold: 8,
      modern: 6,
    },
    paletteAffinity: {
      modern: 8,
      minimal: 8,
      friendly: 8,
    },
    campaignAffinity: {
      clearance: 18,
      'black friday': 18,
    },
    industryPackAffinity: {
      business: 8,
      technology: 6,
    },
    sizeAffinity: {
      landscape: 10,
      wide: 12,
      square: 8,
    },
  },
];

export class PositionRegistry {
  getAll(): PositionDefinition[] {
    return POSITIONS.map((definition) => ({
      ...definition,
      decision: {
        ...definition.decision,
        safeMargins: { ...definition.decision.safeMargins },
      },
    }));
  }

  getById(positionId: PositionId): PositionDefinition | undefined {
    const definition = POSITIONS.find((candidate) => candidate.positionId === positionId);
    if (!definition) return undefined;

    return {
      ...definition,
      decision: {
        ...definition.decision,
        safeMargins: { ...definition.decision.safeMargins },
      },
    };
  }

  getSupportedPositionIds(): PositionId[] {
    return POSITIONS.map((definition) => definition.positionId);
  }
}

export default PositionRegistry;
