import { ColorDefinition, ColorPalette, PaletteId } from './ColorTypes';

function palette(
  paletteId: PaletteId,
  colors: Omit<ColorPalette, 'paletteId'>
): ColorPalette {
  return {
    paletteId,
    ...colors,
  };
}

const PALETTES: ColorDefinition[] = [
  {
    paletteId: 'minimal',
    palette: palette('minimal', {
      background: '#F7F7F2',
      surface: '#FFFFFF',
      headline: '#151515',
      subheadline: '#3E3E3A',
      description: '#62625B',
      accent: '#8A8F83',
      ctaBackground: '#151515',
      ctaText: '#FFFFFF',
      decorative: '#D7D8CE',
      shadow: '#0000001A',
      border: '#DFE0D8',
    }),
    baseScore: 32,
    categoryAffinity: {
      electronics: 14,
      furniture: 8,
      technology: 10,
    },
    toneAffinity: {
      minimal: 28,
      clean: 22,
      calm: 12,
      modern: 8,
    },
    campaignAffinity: {
      minimal: 24,
      'new arrival': 6,
    },
    layoutAffinity: {
      minimal: 26,
      'hero-center': 8,
    },
    typographyAffinity: {
      minimal: 28,
      modern: 8,
    },
    industryPackAffinity: {
      electronics: 10,
      technology: 10,
      business: 8,
    },
  },
  {
    paletteId: 'luxury',
    palette: palette('luxury', {
      background: '#11100E',
      surface: '#1E1A16',
      headline: '#F6E8C8',
      subheadline: '#D6C39B',
      description: '#B9AB92',
      accent: '#C89B3C',
      ctaBackground: '#C89B3C',
      ctaText: '#11100E',
      decorative: '#6E5527',
      shadow: '#00000066',
      border: '#4E4029',
    }),
    baseScore: 32,
    categoryAffinity: {
      jewelry: 34,
      fragrance: 30,
      perfume: 30,
      accessories: 16,
    },
    toneAffinity: {
      luxury: 30,
      refined: 22,
      elegant: 22,
      premium: 14,
    },
    campaignAffinity: {
      luxury: 30,
      premium: 16,
      festival: 8,
    },
    layoutAffinity: {
      luxury: 28,
      story: 8,
    },
    typographyAffinity: {
      luxury: 30,
      premium: 10,
    },
    industryPackAffinity: {
      luxury: 32,
      jewelry: 32,
      fashion: 6,
    },
  },
  {
    paletteId: 'modern',
    palette: palette('modern', {
      background: '#ECEFF1',
      surface: '#FFFFFF',
      headline: '#172026',
      subheadline: '#3F4E56',
      description: '#66737B',
      accent: '#2F6F73',
      ctaBackground: '#172026',
      ctaText: '#FFFFFF',
      decorative: '#B9C7C9',
      shadow: '#17202624',
      border: '#CDD5D8',
    }),
    baseScore: 31,
    categoryAffinity: {
      furniture: 24,
      electronics: 10,
      general: 8,
    },
    toneAffinity: {
      modern: 28,
      practical: 18,
      balanced: 14,
      clear: 12,
    },
    campaignAffinity: {
      default: 6,
      minimal: 8,
      premium: 6,
    },
    layoutAffinity: {
      split: 24,
      'hero-left': 12,
      'hero-right': 12,
    },
    typographyAffinity: {
      modern: 26,
      minimal: 8,
    },
    industryPackAffinity: {
      furniture: 24,
      business: 10,
      electronics: 8,
    },
  },
  {
    paletteId: 'warm',
    palette: palette('warm', {
      background: '#FBF0E3',
      surface: '#FFF8EF',
      headline: '#3B2416',
      subheadline: '#714B33',
      description: '#8B6A55',
      accent: '#C76B3C',
      ctaBackground: '#3B2416',
      ctaText: '#FFF8EF',
      decorative: '#E9B78D',
      shadow: '#3B241629',
      border: '#E7CDB7',
    }),
    baseScore: 31,
    categoryAffinity: {
      coffee: 32,
      home: 14,
      furniture: 8,
    },
    toneAffinity: {
      warm: 30,
      friendly: 12,
      cozy: 18,
      lifestyle: 12,
    },
    campaignAffinity: {
      winter: 16,
      default: 6,
      festival: 6,
    },
    layoutAffinity: {
      editorial: 18,
      story: 10,
    },
    typographyAffinity: {
      editorial: 16,
      friendly: 8,
    },
    industryPackAffinity: {
      coffee: 32,
      furniture: 6,
    },
  },
  {
    paletteId: 'technology',
    palette: palette('technology', {
      background: '#08111F',
      surface: '#101C2F',
      headline: '#EAF6FF',
      subheadline: '#A9C7E8',
      description: '#7F9AB8',
      accent: '#38D5FF',
      ctaBackground: '#38D5FF',
      ctaText: '#08111F',
      decorative: '#245D8C',
      shadow: '#00000070',
      border: '#1F3E5C',
    }),
    baseScore: 32,
    categoryAffinity: {
      electronics: 34,
      technology: 34,
      phone: 24,
      laptop: 24,
    },
    toneAffinity: {
      technology: 30,
      precise: 20,
      modern: 12,
      clean: 8,
    },
    campaignAffinity: {
      'new arrival': 16,
      premium: 8,
      minimal: 6,
    },
    layoutAffinity: {
      minimal: 18,
      grid: 14,
      'hero-left': 8,
      'hero-right': 8,
    },
    typographyAffinity: {
      technology: 32,
      minimal: 8,
    },
    industryPackAffinity: {
      electronics: 34,
      technology: 34,
      gaming: 10,
    },
  },
  {
    paletteId: 'fashion',
    palette: palette('fashion', {
      background: '#F2ECE8',
      surface: '#FFFBF8',
      headline: '#171313',
      subheadline: '#5D4A45',
      description: '#7D6A64',
      accent: '#B21F4A',
      ctaBackground: '#171313',
      ctaText: '#FFFFFF',
      decorative: '#D7A0AE',
      shadow: '#17131324',
      border: '#DECFC8',
    }),
    baseScore: 31,
    categoryAffinity: {
      fashion: 34,
      apparel: 30,
      footwear: 8,
    },
    toneAffinity: {
      fashion: 30,
      editorial: 12,
      expressive: 16,
      elegant: 10,
    },
    campaignAffinity: {
      festival: 12,
      summer: 8,
      'new arrival': 8,
    },
    layoutAffinity: {
      editorial: 16,
      story: 10,
      'hero-center': 6,
    },
    typographyAffinity: {
      fashion: 34,
      editorial: 8,
    },
    industryPackAffinity: {
      fashion: 34,
      luxury: 8,
    },
  },
  {
    paletteId: 'sport',
    palette: palette('sport', {
      background: '#101820',
      surface: '#1A2733',
      headline: '#F8FF2E',
      subheadline: '#D9E7EF',
      description: '#AAB8C2',
      accent: '#FF4F1F',
      ctaBackground: '#F8FF2E',
      ctaText: '#101820',
      decorative: '#2D78FF',
      shadow: '#00000066',
      border: '#304454',
    }),
    baseScore: 31,
    categoryAffinity: {
      sports: 34,
      fitness: 30,
      footwear: 18,
      shoes: 18,
      sneakers: 18,
    },
    toneAffinity: {
      energetic: 30,
      active: 28,
      bold: 14,
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
    typographyAffinity: {
      sport: 34,
      bold: 12,
    },
    industryPackAffinity: {
      fitness: 32,
      gaming: 8,
    },
  },
  {
    paletteId: 'editorial',
    palette: palette('editorial', {
      background: '#F5F1E9',
      surface: '#FFFDF7',
      headline: '#202020',
      subheadline: '#5B5147',
      description: '#71685E',
      accent: '#7A5C37',
      ctaBackground: '#202020',
      ctaText: '#FFFDF7',
      decorative: '#CDBB9E',
      shadow: '#2020201F',
      border: '#DDD1BE',
    }),
    baseScore: 31,
    categoryAffinity: {
      coffee: 20,
      fashion: 14,
      fragrance: 8,
    },
    toneAffinity: {
      editorial: 30,
      lifestyle: 20,
      warm: 10,
      expressive: 8,
    },
    campaignAffinity: {
      winter: 8,
      festival: 8,
      default: 6,
    },
    layoutAffinity: {
      editorial: 30,
      story: 12,
    },
    typographyAffinity: {
      editorial: 30,
      fashion: 6,
    },
    industryPackAffinity: {
      coffee: 18,
      fashion: 14,
      luxury: 6,
    },
  },
  {
    paletteId: 'premium',
    palette: palette('premium', {
      background: '#F8F5F0',
      surface: '#FFFFFF',
      headline: '#1E1B18',
      subheadline: '#524A42',
      description: '#74695F',
      accent: '#8B6F47',
      ctaBackground: '#1E1B18',
      ctaText: '#FFFFFF',
      decorative: '#D5C3A6',
      shadow: '#1E1B1824',
      border: '#DFD4C4',
    }),
    baseScore: 31,
    categoryAffinity: {
      jewelry: 18,
      fragrance: 16,
      furniture: 10,
      electronics: 8,
    },
    toneAffinity: {
      premium: 30,
      polished: 20,
      refined: 16,
      confident: 10,
    },
    campaignAffinity: {
      premium: 30,
      luxury: 14,
      'new arrival': 6,
    },
    layoutAffinity: {
      luxury: 12,
      split: 8,
      minimal: 8,
    },
    typographyAffinity: {
      premium: 30,
      luxury: 8,
      modern: 6,
    },
    industryPackAffinity: {
      luxury: 16,
      jewelry: 12,
      business: 10,
    },
  },
  {
    paletteId: 'friendly',
    palette: palette('friendly', {
      background: '#FFF6D9',
      surface: '#FFFFFF',
      headline: '#263326',
      subheadline: '#586650',
      description: '#73806B',
      accent: '#F08A4B',
      ctaBackground: '#263326',
      ctaText: '#FFFFFF',
      decorative: '#95C88A',
      shadow: '#2633261F',
      border: '#EADFAF',
    }),
    baseScore: 29,
    categoryAffinity: {
      coffee: 10,
      home: 8,
      general: 8,
    },
    toneAffinity: {
      friendly: 30,
      playful: 18,
      casual: 14,
      warm: 10,
    },
    campaignAffinity: {
      summer: 8,
      default: 6,
    },
    layoutAffinity: {
      'hero-center': 8,
      story: 8,
    },
    typographyAffinity: {
      friendly: 30,
      modern: 4,
    },
    industryPackAffinity: {
      coffee: 8,
      business: 5,
    },
  },
];

export class ColorRegistry {
  getAll(): ColorDefinition[] {
    return PALETTES.map((definition) => ({
      ...definition,
      palette: { ...definition.palette },
    }));
  }

  getById(paletteId: PaletteId): ColorDefinition | undefined {
    const definition = PALETTES.find((candidate) => candidate.paletteId === paletteId);
    if (!definition) return undefined;

    return {
      ...definition,
      palette: { ...definition.palette },
    };
  }

  getSupportedPaletteIds(): PaletteId[] {
    return PALETTES.map((definition) => definition.paletteId);
  }
}

export default ColorRegistry;
