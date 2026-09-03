import {
  DecorationDecision,
  DecorationDefinition,
  DecorationId,
} from './DecorationTypes';

const DEFAULT_SAFE_ZONES = {
  top: 8,
  right: 8,
  bottom: 8,
  left: 8,
};

function decision(
  decorationId: DecorationId,
  overrides: Omit<DecorationDecision, 'decorationId'>
): DecorationDecision {
  return {
    decorationId,
    ...overrides,
  };
}

const DECORATIONS: DecorationDefinition[] = [
  {
    decorationId: 'minimal',
    decision: decision('minimal', {
      elements: ['thin divider line', 'small accent dot', 'subtle corner marker'],
      density: 'low',
      opacity: 0.24,
      placement: 'text-adjacent',
      depth: 'flat',
      layering: 'single',
      emphasis: 'subtle',
      safeZones: {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10,
      },
    }),
    baseScore: 32,
    categoryAffinity: {
      electronics: 8,
      furniture: 6,
      technology: 6,
    },
    campaignAffinity: {
      minimal: 24,
      'new arrival': 6,
    },
    toneAffinity: {
      minimal: 28,
      clean: 24,
      calm: 12,
    },
    layoutAffinity: {
      minimal: 28,
      'hero-center': 8,
    },
    typographyAffinity: {
      minimal: 28,
      modern: 8,
    },
    paletteAffinity: {
      minimal: 28,
      modern: 8,
    },
    backgroundAffinity: {
      minimal: 30,
      studio: 8,
      glass: 6,
    },
    industryPackAffinity: {
      business: 8,
      electronics: 6,
    },
  },
  {
    decorationId: 'luxury',
    decision: decision('luxury', {
      elements: ['gold hairline frame', 'sparkle particles', 'elegant corner flourishes'],
      density: 'medium',
      opacity: 0.42,
      placement: 'frame',
      depth: 'foreground',
      layering: 'stacked',
      emphasis: 'accent',
      safeZones: {
        top: 11,
        right: 11,
        bottom: 12,
        left: 11,
      },
    }),
    baseScore: 32,
    categoryAffinity: {
      jewelry: 34,
      fragrance: 14,
      perfume: 12,
    },
    campaignAffinity: {
      luxury: 30,
      premium: 14,
      festival: 8,
    },
    toneAffinity: {
      luxury: 30,
      elegant: 24,
      refined: 22,
      premium: 14,
    },
    layoutAffinity: {
      luxury: 30,
      story: 8,
    },
    typographyAffinity: {
      luxury: 30,
      premium: 12,
    },
    paletteAffinity: {
      luxury: 30,
      premium: 10,
    },
    backgroundAffinity: {
      luxury: 30,
      marble: 12,
      premium: 10,
    },
    industryPackAffinity: {
      luxury: 30,
      jewelry: 26,
    },
  },
  {
    decorationId: 'technology',
    decision: decision('technology', {
      elements: ['neon glow rails', 'fine grid', 'circuit lines', 'data ticks'],
      density: 'medium',
      opacity: 0.36,
      placement: 'background',
      depth: 'layered',
      layering: 'interwoven',
      emphasis: 'accent',
      safeZones: DEFAULT_SAFE_ZONES,
    }),
    baseScore: 32,
    categoryAffinity: {
      technology: 38,
      electronics: 26,
      phone: 18,
      laptop: 18,
    },
    campaignAffinity: {
      'new arrival': 12,
      premium: 10,
      'black friday': 8,
    },
    toneAffinity: {
      technology: 30,
      precise: 22,
      modern: 14,
      bold: 8,
    },
    layoutAffinity: {
      grid: 22,
      minimal: 16,
      'hero-left': 8,
      'hero-right': 8,
    },
    typographyAffinity: {
      technology: 32,
      bold: 8,
    },
    paletteAffinity: {
      technology: 34,
      minimal: 8,
    },
    backgroundAffinity: {
      technology: 34,
      glass: 26,
    },
    industryPackAffinity: {
      technology: 36,
      electronics: 30,
      gaming: 10,
    },
  },
  {
    decorationId: 'sports',
    decision: decision('sports', {
      elements: ['motion lines', 'diagonal speed shapes', 'energy slashes'],
      density: 'high',
      opacity: 0.48,
      placement: 'diagonal',
      depth: 'layered',
      layering: 'cinematic',
      emphasis: 'heroic',
      safeZones: {
        top: 8,
        right: 7,
        bottom: 8,
        left: 7,
      },
    }),
    baseScore: 32,
    categoryAffinity: {
      sports: 38,
      fitness: 34,
      shoes: 20,
      footwear: 20,
    },
    campaignAffinity: {
      summer: 16,
      clearance: 10,
      'black friday': 8,
    },
    toneAffinity: {
      energetic: 30,
      active: 28,
      bold: 18,
      urgent: 8,
    },
    layoutAffinity: {
      diagonal: 34,
      'hero-center': 8,
    },
    typographyAffinity: {
      sport: 34,
      bold: 12,
    },
    paletteAffinity: {
      sport: 34,
      fashion: 6,
    },
    backgroundAffinity: {
      sports: 36,
      studio: 6,
    },
    industryPackAffinity: {
      fitness: 34,
      gaming: 8,
    },
  },
  {
    decorationId: 'fashion',
    decision: decision('fashion', {
      elements: ['editorial color blocks', 'oversized crop marks', 'thin magazine rules'],
      density: 'medium',
      opacity: 0.34,
      placement: 'full-composition',
      depth: 'midground',
      layering: 'stacked',
      emphasis: 'expressive',
      safeZones: DEFAULT_SAFE_ZONES,
    }),
    baseScore: 31,
    categoryAffinity: {
      fashion: 38,
      apparel: 34,
      shoes: 8,
    },
    campaignAffinity: {
      festival: 12,
      'new arrival': 10,
      summer: 8,
    },
    toneAffinity: {
      fashion: 30,
      editorial: 16,
      expressive: 16,
      elegant: 8,
    },
    layoutAffinity: {
      editorial: 24,
      story: 10,
      'hero-center': 8,
    },
    typographyAffinity: {
      fashion: 34,
      editorial: 10,
    },
    paletteAffinity: {
      fashion: 34,
      editorial: 8,
    },
    backgroundAffinity: {
      editorial: 24,
      fashion: 34,
    },
    industryPackAffinity: {
      fashion: 36,
      luxury: 6,
    },
  },
  {
    decorationId: 'coffee',
    decision: decision('coffee', {
      elements: ['steam wisps', 'organic curves', 'small bean accents'],
      density: 'medium',
      opacity: 0.32,
      placement: 'around-product',
      depth: 'midground',
      layering: 'stacked',
      emphasis: 'balanced',
      safeZones: {
        top: 8,
        right: 8,
        bottom: 9,
        left: 8,
      },
    }),
    baseScore: 32,
    categoryAffinity: {
      coffee: 40,
      mug: 28,
      espresso: 28,
    },
    campaignAffinity: {
      winter: 16,
      default: 6,
      festival: 6,
    },
    toneAffinity: {
      warm: 28,
      cozy: 24,
      friendly: 12,
      lifestyle: 10,
    },
    layoutAffinity: {
      editorial: 20,
      story: 12,
    },
    typographyAffinity: {
      editorial: 16,
      friendly: 10,
    },
    paletteAffinity: {
      warm: 30,
      friendly: 8,
      editorial: 8,
    },
    backgroundAffinity: {
      coffee: 38,
      nature: 8,
    },
    industryPackAffinity: {
      coffee: 38,
    },
  },
  {
    decorationId: 'editorial',
    decision: decision('editorial', {
      elements: ['asymmetric rules', 'caption blocks', 'paper grain accents'],
      density: 'low',
      opacity: 0.28,
      placement: 'text-adjacent',
      depth: 'flat',
      layering: 'single',
      emphasis: 'balanced',
      safeZones: DEFAULT_SAFE_ZONES,
    }),
    baseScore: 31,
    categoryAffinity: {
      fashion: 18,
      coffee: 10,
      fragrance: 8,
    },
    campaignAffinity: {
      festival: 8,
      winter: 8,
      default: 6,
    },
    toneAffinity: {
      editorial: 30,
      lifestyle: 16,
      expressive: 10,
    },
    layoutAffinity: {
      editorial: 34,
      story: 10,
    },
    typographyAffinity: {
      editorial: 32,
      fashion: 10,
    },
    paletteAffinity: {
      editorial: 30,
      fashion: 8,
      warm: 6,
    },
    backgroundAffinity: {
      editorial: 34,
      fashion: 8,
    },
    industryPackAffinity: {
      fashion: 12,
      coffee: 8,
    },
  },
  {
    decorationId: 'premium',
    decision: decision('premium', {
      elements: ['subtle metallic rule', 'soft accent halo', 'premium badge frame'],
      density: 'low',
      opacity: 0.3,
      placement: 'corners',
      depth: 'foreground',
      layering: 'stacked',
      emphasis: 'accent',
      safeZones: {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10,
      },
    }),
    baseScore: 31,
    categoryAffinity: {
      jewelry: 14,
      fragrance: 12,
      furniture: 8,
      electronics: 8,
    },
    campaignAffinity: {
      premium: 30,
      luxury: 12,
      'new arrival': 6,
    },
    toneAffinity: {
      premium: 30,
      polished: 20,
      refined: 14,
      confident: 8,
    },
    layoutAffinity: {
      luxury: 12,
      minimal: 10,
      split: 8,
    },
    typographyAffinity: {
      premium: 30,
      luxury: 8,
      modern: 6,
    },
    paletteAffinity: {
      premium: 32,
      luxury: 8,
      modern: 6,
    },
    backgroundAffinity: {
      premium: 32,
      marble: 8,
      luxury: 8,
    },
    industryPackAffinity: {
      luxury: 16,
      jewelry: 12,
      business: 10,
    },
  },
  {
    decorationId: 'nature',
    decision: decision('nature', {
      elements: ['botanical silhouettes', 'soft leaf shadows', 'organic contour lines'],
      density: 'medium',
      opacity: 0.26,
      placement: 'edges',
      depth: 'background',
      layering: 'stacked',
      emphasis: 'subtle',
      safeZones: DEFAULT_SAFE_ZONES,
    }),
    baseScore: 28,
    categoryAffinity: {
      coffee: 8,
      furniture: 8,
      home: 8,
    },
    campaignAffinity: {
      summer: 10,
      default: 6,
    },
    toneAffinity: {
      natural: 30,
      calm: 14,
      friendly: 8,
      warm: 8,
    },
    layoutAffinity: {
      story: 8,
      editorial: 8,
    },
    typographyAffinity: {
      friendly: 8,
      editorial: 6,
    },
    paletteAffinity: {
      friendly: 10,
      warm: 6,
    },
    backgroundAffinity: {
      nature: 36,
      coffee: 6,
      'living-room': 6,
    },
    industryPackAffinity: {
      coffee: 6,
      furniture: 6,
    },
  },
  {
    decorationId: 'gaming',
    decision: decision('gaming', {
      elements: ['hud brackets', 'scan lines', 'pixel shards', 'neon target reticle'],
      density: 'high',
      opacity: 0.42,
      placement: 'full-composition',
      depth: 'layered',
      layering: 'cinematic',
      emphasis: 'heroic',
      safeZones: {
        top: 8,
        right: 7,
        bottom: 8,
        left: 7,
      },
    }),
    baseScore: 29,
    categoryAffinity: {
      electronics: 10,
      technology: 10,
      laptop: 10,
    },
    campaignAffinity: {
      'black friday': 14,
      clearance: 10,
      premium: 6,
    },
    toneAffinity: {
      bold: 14,
      energetic: 10,
      technology: 10,
    },
    layoutAffinity: {
      grid: 14,
      diagonal: 10,
    },
    typographyAffinity: {
      technology: 12,
      bold: 12,
    },
    paletteAffinity: {
      technology: 12,
      sport: 8,
    },
    backgroundAffinity: {
      technology: 14,
      glass: 8,
      sports: 8,
    },
    industryPackAffinity: {
      gaming: 38,
      technology: 8,
    },
  },
];

export class DecorationRegistry {
  getAll(): DecorationDefinition[] {
    return DECORATIONS.map((definition) => ({
      ...definition,
      decision: {
        ...definition.decision,
        elements: [...definition.decision.elements],
        safeZones: { ...definition.decision.safeZones },
      },
    }));
  }

  getById(decorationId: DecorationId): DecorationDefinition | undefined {
    const definition = DECORATIONS.find((candidate) => candidate.decorationId === decorationId);
    if (!definition) return undefined;

    return {
      ...definition,
      decision: {
        ...definition.decision,
        elements: [...definition.decision.elements],
        safeZones: { ...definition.decision.safeZones },
      },
    };
  }

  getSupportedDecorationIds(): DecorationId[] {
    return DECORATIONS.map((definition) => definition.decorationId);
  }
}

export default DecorationRegistry;
