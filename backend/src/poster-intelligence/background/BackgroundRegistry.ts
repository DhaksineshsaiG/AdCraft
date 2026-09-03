import {
  BackgroundDecision,
  BackgroundDefinition,
  BackgroundThemeId,
} from './BackgroundTypes';

function decision(
  themeId: BackgroundThemeId,
  overrides: Omit<BackgroundDecision, 'themeId'>
): BackgroundDecision {
  return {
    themeId,
    ...overrides,
  };
}

const BACKGROUND_THEMES: BackgroundDefinition[] = [
  {
    themeId: 'minimal',
    decision: decision('minimal', {
      backgroundStyle: 'solid',
      texture: 'none',
      gradient: 'subtle vertical neutral fade',
      lighting: 'flat',
      overlay: 'none',
      vignette: 0,
      blur: 0,
      noise: 1,
      depth: 'flat',
      atmosphere: 'clean and quiet',
      visualWeight: 'light',
    }),
    baseScore: 32,
    categoryAffinity: {
      electronics: 10,
      technology: 8,
      furniture: 6,
    },
    campaignAffinity: {
      minimal: 24,
      'new arrival': 6,
    },
    toneAffinity: {
      minimal: 28,
      clean: 24,
      calm: 12,
      modern: 8,
    },
    layoutAffinity: {
      minimal: 28,
      'hero-center': 8,
    },
    typographyAffinity: {
      minimal: 26,
      modern: 8,
    },
    paletteAffinity: {
      minimal: 28,
      modern: 8,
    },
    industryPackAffinity: {
      business: 8,
      electronics: 8,
      technology: 8,
    },
    sizeAffinity: {
      square: 10,
      portrait: 6,
    },
  },
  {
    themeId: 'luxury',
    decision: decision('luxury', {
      backgroundStyle: 'material-texture',
      texture: 'dark silk with soft metallic grain',
      gradient: 'deep charcoal to warm gold edge glow',
      lighting: 'dramatic',
      overlay: 'low-opacity gold wash',
      vignette: 18,
      blur: 2,
      noise: 4,
      depth: 'deep',
      atmosphere: 'exclusive and refined',
      visualWeight: 'rich',
    }),
    baseScore: 32,
    categoryAffinity: {
      jewelry: 34,
      fragrance: 10,
      perfume: 8,
    },
    campaignAffinity: {
      luxury: 28,
      premium: 14,
      festival: 8,
    },
    toneAffinity: {
      luxury: 30,
      refined: 22,
      elegant: 20,
      premium: 14,
    },
    layoutAffinity: {
      luxury: 30,
      story: 8,
    },
    typographyAffinity: {
      luxury: 28,
      premium: 12,
    },
    paletteAffinity: {
      luxury: 30,
      premium: 12,
    },
    industryPackAffinity: {
      luxury: 30,
      jewelry: 30,
    },
    sizeAffinity: {
      portrait: 12,
      story: 12,
      square: 8,
    },
  },
  {
    themeId: 'studio',
    decision: decision('studio', {
      backgroundStyle: 'studio-sweep',
      texture: 'matte seamless paper',
      gradient: 'soft cyc wall falloff',
      lighting: 'diffused',
      overlay: 'none',
      vignette: 6,
      blur: 1,
      noise: 1,
      depth: 'shallow',
      atmosphere: 'controlled product studio',
      visualWeight: 'balanced',
    }),
    baseScore: 30,
    categoryAffinity: {
      shoes: 12,
      footwear: 12,
      electronics: 8,
      general: 8,
    },
    campaignAffinity: {
      'new arrival': 10,
      default: 6,
      premium: 6,
    },
    toneAffinity: {
      clean: 12,
      modern: 10,
      balanced: 10,
    },
    layoutAffinity: {
      'hero-center': 16,
      'hero-left': 8,
      'hero-right': 8,
    },
    typographyAffinity: {
      modern: 8,
      bold: 8,
      minimal: 8,
    },
    paletteAffinity: {
      modern: 8,
      minimal: 8,
      premium: 6,
    },
    industryPackAffinity: {
      business: 6,
      electronics: 6,
    },
    sizeAffinity: {
      square: 10,
      landscape: 6,
    },
  },
  {
    themeId: 'marble',
    decision: decision('marble', {
      backgroundStyle: 'material-texture',
      texture: 'polished marble veins',
      gradient: 'ivory base with cool gray veining',
      lighting: 'soft',
      overlay: 'pearl sheen',
      vignette: 10,
      blur: 1,
      noise: 2,
      depth: 'medium',
      atmosphere: 'polished fragrance counter',
      visualWeight: 'rich',
    }),
    baseScore: 31,
    categoryAffinity: {
      perfume: 68,
      fragrance: 64,
      cologne: 58,
      jewelry: 8,
    },
    campaignAffinity: {
      luxury: 20,
      premium: 14,
      festival: 6,
    },
    toneAffinity: {
      elegant: 20,
      refined: 18,
      luxury: 16,
      premium: 12,
    },
    layoutAffinity: {
      luxury: 18,
      story: 10,
      minimal: 8,
    },
    typographyAffinity: {
      luxury: 18,
      premium: 12,
    },
    paletteAffinity: {
      luxury: 16,
      premium: 14,
    },
    industryPackAffinity: {
      luxury: 26,
      jewelry: 8,
    },
    sizeAffinity: {
      portrait: 14,
      story: 12,
      square: 8,
    },
  },
  {
    themeId: 'glass',
    decision: decision('glass', {
      backgroundStyle: 'glassmorphism',
      texture: 'translucent panels with soft reflections',
      gradient: 'cool blue graphite radial glow',
      lighting: 'rim',
      overlay: 'frosted glass highlight',
      vignette: 8,
      blur: 8,
      noise: 2,
      depth: 'medium',
      atmosphere: 'sleek connected device space',
      visualWeight: 'balanced',
    }),
    baseScore: 32,
    categoryAffinity: {
      electronics: 36,
      phone: 24,
      laptop: 18,
      technology: 12,
    },
    campaignAffinity: {
      'new arrival': 16,
      premium: 8,
      minimal: 6,
    },
    toneAffinity: {
      technology: 20,
      modern: 18,
      clean: 12,
      precise: 10,
    },
    layoutAffinity: {
      minimal: 18,
      'hero-center': 12,
      grid: 10,
    },
    typographyAffinity: {
      technology: 20,
      minimal: 8,
      modern: 8,
    },
    paletteAffinity: {
      technology: 20,
      minimal: 8,
      modern: 8,
    },
    industryPackAffinity: {
      electronics: 34,
      technology: 12,
    },
    sizeAffinity: {
      square: 12,
      portrait: 8,
      wide: 6,
    },
  },
  {
    themeId: 'technology',
    decision: decision('technology', {
      backgroundStyle: 'abstract-motion',
      texture: 'subtle circuit grid and light trails',
      gradient: 'midnight blue to electric cyan',
      lighting: 'neon',
      overlay: 'thin digital grid',
      vignette: 12,
      blur: 4,
      noise: 3,
      depth: 'deep',
      atmosphere: 'high-performance technical',
      visualWeight: 'bold',
    }),
    baseScore: 32,
    categoryAffinity: {
      technology: 38,
      electronics: 18,
      laptop: 18,
      phone: 12,
    },
    campaignAffinity: {
      premium: 12,
      'new arrival': 12,
      'black friday': 8,
    },
    toneAffinity: {
      technology: 30,
      precise: 22,
      modern: 14,
      bold: 8,
    },
    layoutAffinity: {
      grid: 18,
      minimal: 14,
      'hero-left': 8,
      'hero-right': 8,
    },
    typographyAffinity: {
      technology: 30,
      bold: 8,
    },
    paletteAffinity: {
      technology: 34,
      sport: 6,
    },
    industryPackAffinity: {
      technology: 36,
      electronics: 18,
      gaming: 12,
    },
    sizeAffinity: {
      wide: 14,
      landscape: 12,
      square: 8,
    },
  },
  {
    themeId: 'coffee',
    decision: decision('coffee', {
      backgroundStyle: 'environmental',
      texture: 'warm ceramic, wood, and coffee crema',
      gradient: 'cream to roasted brown ambient wash',
      lighting: 'golden',
      overlay: 'soft steam haze',
      vignette: 10,
      blur: 3,
      noise: 3,
      depth: 'medium',
      atmosphere: 'cozy morning ritual',
      visualWeight: 'rich',
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
      friendly: 10,
      lifestyle: 12,
    },
    layoutAffinity: {
      editorial: 22,
      story: 12,
    },
    typographyAffinity: {
      editorial: 18,
      friendly: 10,
    },
    paletteAffinity: {
      warm: 30,
      editorial: 12,
      friendly: 8,
    },
    industryPackAffinity: {
      coffee: 38,
    },
    sizeAffinity: {
      story: 14,
      portrait: 10,
      square: 8,
    },
  },
  {
    themeId: 'fashion',
    decision: decision('fashion', {
      backgroundStyle: 'editorial-scene',
      texture: 'soft fabric sweep and subtle backdrop seams',
      gradient: 'blush neutral to ink edge fade',
      lighting: 'soft',
      overlay: 'low-contrast editorial wash',
      vignette: 8,
      blur: 2,
      noise: 2,
      depth: 'medium',
      atmosphere: 'runway lookbook',
      visualWeight: 'balanced',
    }),
    baseScore: 31,
    categoryAffinity: {
      fashion: 30,
      apparel: 28,
      shoes: 8,
    },
    campaignAffinity: {
      festival: 12,
      summer: 8,
      'new arrival': 8,
    },
    toneAffinity: {
      fashion: 28,
      expressive: 16,
      elegant: 12,
      editorial: 10,
    },
    layoutAffinity: {
      'hero-center': 12,
      story: 10,
      editorial: 8,
    },
    typographyAffinity: {
      fashion: 30,
      editorial: 8,
    },
    paletteAffinity: {
      fashion: 30,
      premium: 6,
    },
    industryPackAffinity: {
      fashion: 34,
      luxury: 8,
    },
    sizeAffinity: {
      portrait: 12,
      story: 12,
      square: 8,
    },
  },
  {
    themeId: 'sports',
    decision: decision('sports', {
      backgroundStyle: 'abstract-motion',
      texture: 'motion streaks and granular court grit',
      gradient: 'deep navy to electric action color',
      lighting: 'rim',
      overlay: 'speed-line energy overlay',
      vignette: 14,
      blur: 5,
      noise: 5,
      depth: 'deep',
      atmosphere: 'fast and competitive',
      visualWeight: 'bold',
    }),
    baseScore: 32,
    categoryAffinity: {
      sports: 38,
      fitness: 34,
      shoes: 18,
      footwear: 18,
    },
    campaignAffinity: {
      summer: 16,
      'black friday': 8,
      clearance: 8,
    },
    toneAffinity: {
      energetic: 30,
      active: 28,
      bold: 18,
      urgent: 8,
    },
    layoutAffinity: {
      diagonal: 30,
      'hero-center': 8,
    },
    typographyAffinity: {
      sport: 32,
      bold: 12,
    },
    paletteAffinity: {
      sport: 34,
      friendly: 6,
    },
    industryPackAffinity: {
      fitness: 34,
      gaming: 8,
    },
    sizeAffinity: {
      story: 14,
      portrait: 10,
      square: 8,
    },
  },
  {
    themeId: 'nature',
    decision: decision('nature', {
      backgroundStyle: 'environmental',
      texture: 'soft botanical shapes and natural grain',
      gradient: 'sage green to warm daylight',
      lighting: 'window',
      overlay: 'diffused leaf-shadow wash',
      vignette: 6,
      blur: 4,
      noise: 3,
      depth: 'medium',
      atmosphere: 'fresh and organic',
      visualWeight: 'balanced',
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
      calm: 14,
      warm: 8,
      friendly: 8,
      natural: 24,
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
    industryPackAffinity: {
      coffee: 6,
      furniture: 6,
    },
    sizeAffinity: {
      portrait: 8,
      story: 8,
    },
  },
  {
    themeId: 'editorial',
    decision: decision('editorial', {
      backgroundStyle: 'editorial-scene',
      texture: 'paper grain with composed negative space',
      gradient: 'warm off-white to soft graphite edge',
      lighting: 'diffused',
      overlay: 'magazine-style tonal wash',
      vignette: 8,
      blur: 1,
      noise: 4,
      depth: 'shallow',
      atmosphere: 'art-directed magazine spread',
      visualWeight: 'balanced',
    }),
    baseScore: 31,
    categoryAffinity: {
      fashion: 34,
      coffee: 12,
      fragrance: 8,
    },
    campaignAffinity: {
      festival: 10,
      winter: 8,
      default: 6,
    },
    toneAffinity: {
      editorial: 32,
      lifestyle: 18,
      expressive: 10,
      elegant: 8,
    },
    layoutAffinity: {
      editorial: 34,
      story: 10,
    },
    typographyAffinity: {
      editorial: 30,
      fashion: 12,
    },
    paletteAffinity: {
      editorial: 30,
      fashion: 12,
      warm: 6,
    },
    industryPackAffinity: {
      fashion: 24,
      coffee: 8,
      luxury: 6,
    },
    sizeAffinity: {
      portrait: 12,
      story: 12,
      square: 8,
    },
  },
  {
    themeId: 'living-room',
    decision: decision('living-room', {
      backgroundStyle: 'environmental',
      texture: 'soft upholstery, wall paint, and natural wood',
      gradient: 'window-lit neutral room falloff',
      lighting: 'window',
      overlay: 'warm interior light veil',
      vignette: 8,
      blur: 3,
      noise: 2,
      depth: 'deep',
      atmosphere: 'comfortable styled interior',
      visualWeight: 'rich',
    }),
    baseScore: 32,
    categoryAffinity: {
      furniture: 40,
      home: 34,
      sofa: 32,
      chair: 32,
    },
    campaignAffinity: {
      minimal: 10,
      winter: 10,
      default: 6,
    },
    toneAffinity: {
      practical: 16,
      calm: 14,
      warm: 10,
      modern: 8,
    },
    layoutAffinity: {
      split: 26,
      'hero-left': 10,
      'hero-right': 10,
      editorial: 8,
    },
    typographyAffinity: {
      modern: 20,
      editorial: 8,
    },
    paletteAffinity: {
      modern: 22,
      warm: 8,
      editorial: 6,
    },
    industryPackAffinity: {
      furniture: 40,
      business: 6,
    },
    sizeAffinity: {
      landscape: 18,
      wide: 18,
      square: 6,
    },
  },
  {
    themeId: 'premium',
    decision: decision('premium', {
      backgroundStyle: 'soft-gradient',
      texture: 'fine matte grain with subtle metallic accents',
      gradient: 'warm ivory to muted champagne',
      lighting: 'soft',
      overlay: 'premium tonal polish',
      vignette: 8,
      blur: 1,
      noise: 2,
      depth: 'shallow',
      atmosphere: 'quiet premium retail',
      visualWeight: 'balanced',
    }),
    baseScore: 31,
    categoryAffinity: {
      jewelry: 14,
      fragrance: 12,
      electronics: 8,
      furniture: 8,
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
    industryPackAffinity: {
      luxury: 16,
      jewelry: 12,
      business: 10,
    },
    sizeAffinity: {
      portrait: 10,
      square: 8,
    },
  },
];

export class BackgroundRegistry {
  getAll(): BackgroundDefinition[] {
    return BACKGROUND_THEMES.map((definition) => ({
      ...definition,
      decision: { ...definition.decision },
    }));
  }

  getById(themeId: BackgroundThemeId): BackgroundDefinition | undefined {
    const definition = BACKGROUND_THEMES.find((candidate) => candidate.themeId === themeId);
    if (!definition) return undefined;

    return {
      ...definition,
      decision: { ...definition.decision },
    };
  }

  getSupportedThemeIds(): BackgroundThemeId[] {
    return BACKGROUND_THEMES.map((definition) => definition.themeId);
  }
}

export default BackgroundRegistry;
