import {
  TypographyDecision,
  TypographyDefinition,
  TypographyId,
} from './TypographyTypes';

function decision(
  typographyId: TypographyId,
  overrides: Omit<TypographyDecision, 'typographyId'>
): TypographyDecision {
  return {
    typographyId,
    ...overrides,
  };
}

const TYPOGRAPHY_PROFILES: TypographyDefinition[] = [
  {
    typographyId: 'minimal',
    decision: decision('minimal', {
      headlineFont: 'Inter',
      headlineWeight: 600,
      headlineSize: 48,
      headlineLetterSpacing: 0,
      headlineTransform: 'none',
      subheadlineFont: 'Inter',
      subheadlineSize: 20,
      descriptionFont: 'Inter',
      descriptionSize: 15,
      ctaFont: 'Inter',
      ctaWeight: 600,
      alignment: 'center',
      lineHeight: 1.18,
      maxCharactersPerLine: 34,
      safeTextWidth: 62,
    }),
    baseScore: 32,
    categoryAffinity: {
      electronics: 16,
      furniture: 8,
      technology: 12,
    },
    toneAffinity: {
      minimal: 28,
      clean: 22,
      calm: 12,
      modern: 10,
    },
    campaignAffinity: {
      minimal: 24,
      'new arrival': 6,
    },
    layoutAffinity: {
      minimal: 26,
      'hero-center': 8,
    },
    industryPackAffinity: {
      electronics: 14,
      technology: 12,
      business: 8,
    },
  },
  {
    typographyId: 'luxury',
    decision: decision('luxury', {
      headlineFont: 'Playfair Display',
      headlineWeight: 600,
      headlineSize: 58,
      headlineLetterSpacing: 0.2,
      headlineTransform: 'none',
      subheadlineFont: 'Cormorant Garamond',
      subheadlineSize: 24,
      descriptionFont: 'Inter',
      descriptionSize: 15,
      ctaFont: 'Inter',
      ctaWeight: 600,
      alignment: 'left',
      lineHeight: 1.12,
      maxCharactersPerLine: 28,
      safeTextWidth: 54,
    }),
    baseScore: 32,
    categoryAffinity: {
      jewelry: 32,
      fragrance: 30,
      perfume: 30,
      accessories: 16,
    },
    toneAffinity: {
      luxury: 28,
      refined: 22,
      elegant: 22,
      premium: 16,
    },
    campaignAffinity: {
      luxury: 28,
      premium: 18,
      festival: 8,
    },
    layoutAffinity: {
      luxury: 28,
      story: 8,
    },
    industryPackAffinity: {
      luxury: 30,
      jewelry: 30,
      fashion: 6,
    },
  },
  {
    typographyId: 'editorial',
    decision: decision('editorial', {
      headlineFont: 'Libre Baskerville',
      headlineWeight: 700,
      headlineSize: 54,
      headlineLetterSpacing: 0,
      headlineTransform: 'none',
      subheadlineFont: 'Inter',
      subheadlineSize: 21,
      descriptionFont: 'Source Serif 4',
      descriptionSize: 17,
      ctaFont: 'Inter',
      ctaWeight: 700,
      alignment: 'left',
      lineHeight: 1.16,
      maxCharactersPerLine: 32,
      safeTextWidth: 58,
    }),
    baseScore: 31,
    categoryAffinity: {
      coffee: 28,
      fashion: 18,
      apparel: 18,
      fragrance: 8,
    },
    toneAffinity: {
      editorial: 28,
      warm: 18,
      lifestyle: 22,
      expressive: 12,
    },
    campaignAffinity: {
      winter: 8,
      summer: 6,
      festival: 8,
      default: 5,
    },
    layoutAffinity: {
      editorial: 30,
      story: 12,
    },
    industryPackAffinity: {
      coffee: 28,
      fashion: 16,
      luxury: 6,
    },
  },
  {
    typographyId: 'bold',
    decision: decision('bold', {
      headlineFont: 'Montserrat',
      headlineWeight: 900,
      headlineSize: 62,
      headlineLetterSpacing: 0.4,
      headlineTransform: 'uppercase',
      subheadlineFont: 'Montserrat',
      subheadlineSize: 20,
      descriptionFont: 'Inter',
      descriptionSize: 16,
      ctaFont: 'Montserrat',
      ctaWeight: 800,
      alignment: 'left',
      lineHeight: 1.02,
      maxCharactersPerLine: 24,
      safeTextWidth: 50,
    }),
    baseScore: 30,
    categoryAffinity: {
      footwear: 18,
      shoes: 18,
      sports: 14,
      electronics: 6,
    },
    toneAffinity: {
      bold: 28,
      urgent: 18,
      confident: 16,
      energetic: 14,
    },
    campaignAffinity: {
      'black friday': 24,
      clearance: 22,
      'new arrival': 8,
    },
    layoutAffinity: {
      'hero-center': 12,
      diagonal: 10,
      grid: 12,
    },
    industryPackAffinity: {
      gaming: 12,
      fitness: 10,
    },
  },
  {
    typographyId: 'modern',
    decision: decision('modern', {
      headlineFont: 'Aptos Display',
      headlineWeight: 700,
      headlineSize: 52,
      headlineLetterSpacing: 0,
      headlineTransform: 'none',
      subheadlineFont: 'Aptos',
      subheadlineSize: 20,
      descriptionFont: 'Aptos',
      descriptionSize: 16,
      ctaFont: 'Aptos',
      ctaWeight: 700,
      alignment: 'left',
      lineHeight: 1.14,
      maxCharactersPerLine: 32,
      safeTextWidth: 56,
    }),
    baseScore: 31,
    categoryAffinity: {
      furniture: 20,
      electronics: 12,
      general: 8,
    },
    toneAffinity: {
      modern: 24,
      practical: 16,
      balanced: 14,
      clear: 12,
    },
    campaignAffinity: {
      default: 6,
      minimal: 8,
      premium: 6,
    },
    layoutAffinity: {
      split: 22,
      'hero-left': 14,
      'hero-right': 14,
    },
    industryPackAffinity: {
      furniture: 18,
      business: 10,
      electronics: 8,
    },
  },
  {
    typographyId: 'friendly',
    decision: decision('friendly', {
      headlineFont: 'Nunito Sans',
      headlineWeight: 800,
      headlineSize: 50,
      headlineLetterSpacing: 0,
      headlineTransform: 'none',
      subheadlineFont: 'Nunito Sans',
      subheadlineSize: 21,
      descriptionFont: 'Nunito Sans',
      descriptionSize: 17,
      ctaFont: 'Nunito Sans',
      ctaWeight: 800,
      alignment: 'center',
      lineHeight: 1.2,
      maxCharactersPerLine: 34,
      safeTextWidth: 60,
    }),
    baseScore: 29,
    categoryAffinity: {
      coffee: 12,
      home: 10,
      general: 8,
    },
    toneAffinity: {
      friendly: 28,
      warm: 12,
      playful: 16,
      casual: 14,
    },
    campaignAffinity: {
      summer: 8,
      default: 6,
    },
    layoutAffinity: {
      'hero-center': 8,
      story: 8,
    },
    industryPackAffinity: {
      coffee: 10,
      business: 5,
    },
  },
  {
    typographyId: 'sport',
    decision: decision('sport', {
      headlineFont: 'Oswald',
      headlineWeight: 800,
      headlineSize: 64,
      headlineLetterSpacing: 0.6,
      headlineTransform: 'uppercase',
      subheadlineFont: 'Barlow Condensed',
      subheadlineSize: 23,
      descriptionFont: 'Barlow',
      descriptionSize: 16,
      ctaFont: 'Oswald',
      ctaWeight: 800,
      alignment: 'left',
      lineHeight: 1,
      maxCharactersPerLine: 22,
      safeTextWidth: 48,
    }),
    baseScore: 31,
    categoryAffinity: {
      sports: 32,
      fitness: 28,
      footwear: 18,
      shoes: 18,
      sneakers: 18,
    },
    toneAffinity: {
      energetic: 28,
      bold: 14,
      active: 24,
      urgent: 8,
    },
    campaignAffinity: {
      summer: 16,
      'black friday': 8,
      clearance: 6,
    },
    layoutAffinity: {
      diagonal: 30,
      'hero-center': 8,
    },
    industryPackAffinity: {
      fitness: 30,
      gaming: 8,
    },
  },
  {
    typographyId: 'technology',
    decision: decision('technology', {
      headlineFont: 'Space Grotesk',
      headlineWeight: 700,
      headlineSize: 54,
      headlineLetterSpacing: 0,
      headlineTransform: 'none',
      subheadlineFont: 'IBM Plex Sans',
      subheadlineSize: 20,
      descriptionFont: 'IBM Plex Sans',
      descriptionSize: 16,
      ctaFont: 'Space Grotesk',
      ctaWeight: 700,
      alignment: 'center',
      lineHeight: 1.12,
      maxCharactersPerLine: 30,
      safeTextWidth: 56,
    }),
    baseScore: 32,
    categoryAffinity: {
      electronics: 32,
      technology: 32,
      phone: 26,
      laptop: 24,
    },
    toneAffinity: {
      technology: 28,
      modern: 16,
      clean: 12,
      precise: 18,
    },
    campaignAffinity: {
      'new arrival': 16,
      premium: 8,
      minimal: 8,
    },
    layoutAffinity: {
      minimal: 24,
      grid: 10,
      'hero-left': 8,
      'hero-right': 8,
    },
    industryPackAffinity: {
      electronics: 32,
      technology: 32,
      gaming: 10,
    },
  },
  {
    typographyId: 'fashion',
    decision: decision('fashion', {
      headlineFont: 'Bodoni 72',
      headlineWeight: 700,
      headlineSize: 60,
      headlineLetterSpacing: 0.1,
      headlineTransform: 'uppercase',
      subheadlineFont: 'Inter',
      subheadlineSize: 19,
      descriptionFont: 'Inter',
      descriptionSize: 16,
      ctaFont: 'Inter',
      ctaWeight: 700,
      alignment: 'left',
      lineHeight: 1.06,
      maxCharactersPerLine: 25,
      safeTextWidth: 52,
    }),
    baseScore: 31,
    categoryAffinity: {
      fashion: 34,
      apparel: 30,
      footwear: 10,
    },
    toneAffinity: {
      fashion: 28,
      editorial: 12,
      elegant: 12,
      expressive: 14,
    },
    campaignAffinity: {
      festival: 12,
      summer: 8,
      'new arrival': 8,
    },
    layoutAffinity: {
      editorial: 18,
      story: 10,
      'hero-center': 6,
    },
    industryPackAffinity: {
      fashion: 34,
      luxury: 8,
    },
  },
  {
    typographyId: 'premium',
    decision: decision('premium', {
      headlineFont: 'Canela',
      headlineWeight: 600,
      headlineSize: 56,
      headlineLetterSpacing: 0.1,
      headlineTransform: 'capitalize',
      subheadlineFont: 'Suisse Intl',
      subheadlineSize: 20,
      descriptionFont: 'Suisse Intl',
      descriptionSize: 16,
      ctaFont: 'Suisse Intl',
      ctaWeight: 700,
      alignment: 'left',
      lineHeight: 1.14,
      maxCharactersPerLine: 30,
      safeTextWidth: 54,
    }),
    baseScore: 31,
    categoryAffinity: {
      jewelry: 18,
      fragrance: 16,
      furniture: 10,
      electronics: 8,
    },
    toneAffinity: {
      premium: 28,
      refined: 14,
      confident: 12,
      polished: 18,
    },
    campaignAffinity: {
      premium: 28,
      luxury: 14,
      'new arrival': 6,
    },
    layoutAffinity: {
      luxury: 12,
      split: 8,
      minimal: 8,
    },
    industryPackAffinity: {
      luxury: 16,
      jewelry: 12,
      business: 10,
    },
  },
];

export class TypographyRegistry {
  getAll(): TypographyDefinition[] {
    return TYPOGRAPHY_PROFILES.map((profile) => ({
      ...profile,
      decision: { ...profile.decision },
    }));
  }

  getById(typographyId: TypographyId): TypographyDefinition | undefined {
    const profile = TYPOGRAPHY_PROFILES.find(
      (candidate) => candidate.typographyId === typographyId
    );
    if (!profile) return undefined;

    return {
      ...profile,
      decision: { ...profile.decision },
    };
  }

  getSupportedTypographyIds(): TypographyId[] {
    return TYPOGRAPHY_PROFILES.map((profile) => profile.typographyId);
  }
}

export default TypographyRegistry;
