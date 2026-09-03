import ColorRegistry from './ColorRegistry';
import {
  ColorDefinition,
  ColorPalette,
  ColorSelectionInput,
  ContrastResult,
} from './ColorTypes';

interface ScoredPalette {
  definition: ColorDefinition;
  score: number;
  registryIndex: number;
}

interface RgbColor {
  red: number;
  green: number;
  blue: number;
}

const MIN_HEADLINE_CONTRAST = 4.5;

const CATEGORY_ALIASES: Record<string, string> = {
  apparel: 'fashion',
  blazer: 'fashion',
  chair: 'furniture',
  cologne: 'fragrance',
  espresso: 'coffee',
  fitness: 'sports',
  footwear: 'footwear',
  home: 'furniture',
  laptop: 'electronics',
  necklace: 'jewelry',
  perfume: 'fragrance',
  phone: 'electronics',
  ring: 'jewelry',
  sneaker: 'footwear',
  sneakers: 'footwear',
  sofa: 'furniture',
  sport: 'sports',
  technology: 'technology',
  watch: 'electronics',
};

const FALLBACK_TEXT_COLORS = [
  '#0B0B0B',
  '#151515',
  '#1E1B18',
  '#FFFFFF',
  '#F8F7F2',
  '#EAF6FF',
];

function normalize(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function normalizeCategory(input: ColorSelectionInput): string {
  const directCategory = normalize(input.productCategory);
  const searchableText = [
    directCategory,
    normalize(input.productTitle),
    ...(input.tags ?? []).map((tag) => normalize(tag)),
  ].join(' ');

  const directAlias = CATEGORY_ALIASES[directCategory];
  if (directAlias) return directAlias;

  const matchedAlias = Object.entries(CATEGORY_ALIASES).find(([term]) =>
    searchableText.includes(term)
  );

  return matchedAlias?.[1] ?? directCategory;
}

function affinityScore(affinities: Record<string, number | undefined>, value: string): number {
  if (!value) return 0;
  return affinities[value] ?? 0;
}

function normalizeHex(hex: string): string {
  const value = hex.trim().replace('#', '');
  if (value.length === 3) {
    return value
      .split('')
      .map((char) => `${char}${char}`)
      .join('');
  }
  return value.slice(0, 6);
}

function hexToRgb(hex: string): RgbColor {
  const normalized = normalizeHex(hex);
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);

  return { red, green, blue };
}

function channelToLinear(value: number): number {
  const channel = value / 255;
  if (channel <= 0.03928) return channel / 12.92;
  return ((channel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const { red, green, blue } = hexToRgb(hex);

  return (
    0.2126 * channelToLinear(red) +
    0.7152 * channelToLinear(green) +
    0.0722 * channelToLinear(blue)
  );
}

export function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function checkContrast(foreground: string, background: string): ContrastResult {
  const ratio = contrastRatio(foreground, background);

  return {
    foreground,
    background,
    ratio,
    passes: ratio >= MIN_HEADLINE_CONTRAST,
  };
}

function bestAccessibleTextColor(preferred: string, background: string): string {
  const candidates = [preferred, ...FALLBACK_TEXT_COLORS];
  const accessibleCandidate = candidates.find(
    (candidate) => checkContrast(candidate, background).passes
  );

  if (accessibleCandidate) return accessibleCandidate;

  return candidates.reduce((best, candidate) =>
    contrastRatio(candidate, background) > contrastRatio(best, background) ? candidate : best
  );
}

function enforceHeadlineContrast(palette: ColorPalette): ColorPalette {
  const headlineContrast = checkContrast(palette.headline, palette.background);
  if (headlineContrast.passes) return palette;

  const headline = bestAccessibleTextColor(palette.headline, palette.background);

  return {
    ...palette,
    headline,
  };
}

export class ColorEngine {
  private readonly registry: ColorRegistry;

  constructor(registry = new ColorRegistry()) {
    this.registry = registry;
  }

  selectPalette(input: ColorSelectionInput): ColorPalette {
    const category = normalizeCategory(input);
    const tone = normalize(input.tone);
    const campaign = normalize(input.campaign);
    const layoutId = normalize(input.layoutId);
    const typographyId = normalize(input.typographyId);
    const industryPack = normalize(input.industryPack);
    const palettes = this.registry.getAll();

    const scoredPalettes = palettes.map<ScoredPalette>((definition, registryIndex) => ({
      definition,
      registryIndex,
      score:
        definition.baseScore +
        affinityScore(definition.categoryAffinity, category) +
        affinityScore(definition.toneAffinity, tone) +
        affinityScore(definition.campaignAffinity, campaign) +
        affinityScore(definition.layoutAffinity, layoutId) +
        affinityScore(definition.typographyAffinity, typographyId) +
        affinityScore(definition.industryPackAffinity, industryPack),
    }));

    const best = scoredPalettes.reduce((currentBest, candidate) => {
      if (candidate.score > currentBest.score) return candidate;
      if (candidate.score === currentBest.score && candidate.registryIndex < currentBest.registryIndex) {
        return candidate;
      }
      return currentBest;
    });

    return enforceHeadlineContrast(best.definition.palette);
  }
}

export default ColorEngine;
